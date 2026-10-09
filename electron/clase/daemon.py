"""Captura el audio que suena en la maquina y lo transcribe mientras la clase pasa.

POR QUE LOOPBACK Y NO EL MICROFONO
El microfono agarra la voz del alumno y el eco de los parlantes, degradado por la
cancelacion de eco de Windows. El loopback de WASAPI agarra el stream tal como
Teams lo entrega: la voz del profesor sin pasar por el aire.

POR QUE PYTHON Y NO ELECTRON
faster-whisper es ctranslate2, que es C++ con binding de Python. No hay puerto
equivalente en Node que no implique subir el audio a un servicio. Todo se queda
en la maquina.

CONTRATO CON EL PROCESO PADRE
- stdout: una linea JSON por evento ({"evt": ...}). Es el canal de control.
- stderr: texto para humanos.
- La transcripcion NO viaja por stdout: se escribe a transcript.jsonl. El padre
  y el servidor MCP la leen de ahi, asi que un padre caido no pierde la clase.

Uso: python daemon.py --salida <dir> [--modelo medium] [--idioma es]
"""

import argparse
import json
import os
import queue
import signal
import sys
import threading
import time
import wave

# numpy VA ACA ARRIBA, no adentro de las funciones que lo usan. Importado tarde,
# el hilo principal se quedaba esperando el lock de modulo de numpy que tenia
# tomado el hilo del transcriptor mientras importaba faster_whisper: entre que el
# daemon avisaba "iniciado" y la primera lectura de audio pasaban entre 8 y 20
# segundos, y esos son los segundos en los que el profesor dice de que se trata
# la clase. No habia ningun error — el audio simplemente empezaba despues.
import numpy as np
import pyaudiowpatch as pyaudio

TASA = 16000          # lo que espera whisper; se resamplea desde los 48k del dispositivo

# 4096 y no 1024: el callback de PortAudio y el viaje por la cola se pagan POR
# BLOQUE, no por muestra. A 1024 son 47 vueltas por segundo de audio; a 4096 son
# 12. Medido sobre el camino completo (conversion + RMS), el costo baja de
# 3.58 ms a 1.51 ms por segundo de audio. Sigue siendo ruido al lado de whisper,
# pero es gratis. Mas alto empieza a agregar latencia al corte por silencio.
CHUNK = 4096
MIN_SEG = 18.0        # no se manda a transcribir antes de esto
MAX_SEG = 30.0        # ni se espera mas que esto aunque nadie haga silencio
SILENCIO_RMS = 180.0  # por debajo de esto el bloque cuenta como silencio
SILENCIO_CORTE = 0.6  # segundos de silencio seguidos que habilitan cerrar el tramo


def evento(tipo, **datos):
    """Una linea JSON a stdout. El padre parsea por lineas, asi que nada de prints sueltos."""
    sys.stdout.write(json.dumps({"evt": tipo, "t": time.time(), **datos}) + "\n")
    sys.stdout.flush()


def salir_de_ecoqos():
    """Saca al proceso del modo de ahorro de Windows 11 y le sube la prioridad.

    Windows 11 mete en EcoQoS —nucleos lentos, frecuencia baja— a los procesos que
    considera de fondo, y un hijo lanzado por una app sin ventana enfocada entra
    en esa bolsa. Medido en esta laptop: el mismo daemon, la misma clase, capturaba
    los 72 s completos lanzado desde una consola y 16 s lanzado desde Electron.
    Grabar una clase es trabajo de tiempo real disfrazado de proceso de fondo: si
    el audio no se lee mientras suena, no hay forma de recuperarlo despues.

    Si algo de esto falla se sigue igual: se grabara peor, pero se grabara.
    """
    if sys.platform != "win32":
        return None

    import ctypes
    from ctypes import wintypes

    class THROTTLING(ctypes.Structure):
        _fields_ = [("Version", wintypes.ULONG), ("ControlMask", wintypes.ULONG), ("StateMask", wintypes.ULONG)]

    PROCESS_POWER_THROTTLING_CURRENT_VERSION = 1
    PROCESS_POWER_THROTTLING_EXECUTION_SPEED = 1
    ProcessPowerThrottling = 4
    ABOVE_NORMAL_PRIORITY_CLASS = 0x00008000

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    proceso = kernel32.GetCurrentProcess()
    resultado = {}

    try:
        # ControlMask activo + StateMask en cero = "no me apliques EcoQoS".
        estado = THROTTLING(PROCESS_POWER_THROTTLING_CURRENT_VERSION, PROCESS_POWER_THROTTLING_EXECUTION_SPEED, 0)
        resultado["ecoqos"] = bool(
            kernel32.SetProcessInformation(proceso, ProcessPowerThrottling, ctypes.byref(estado), ctypes.sizeof(estado))
        )
    except Exception as error:
        resultado["ecoqos"] = f"falló: {error}"

    try:
        resultado["prioridad"] = bool(kernel32.SetPriorityClass(proceso, ABOVE_NORMAL_PRIORITY_CLASS))
    except Exception as error:
        resultado["prioridad"] = f"falló: {error}"

    return resultado


def log(*args):
    print(*args, file=sys.stderr, flush=True)


def hilos_por_defecto():
    """Los nucleos FISICOS, que en Windows son la mitad de los logicos.

    Mas hilos no es mas rapido, es mas lento: ctranslate2 se pelea consigo mismo
    cuando le das los hilos SMT. Medido sobre 120 s de clase real en un Ryzen 5
    7520U (4 fisicos / 8 logicos), transcribiendo:

        base    4 hilos -> RTF 0.21    8 hilos -> RTF 0.36
        medium  4 hilos -> RTF 0.59    8 hilos -> RTF 0.63

    Y de paso deja los hilos SMT libres para la captura, que es lo unico del
    proceso que no puede esperar.
    """
    return max(1, (os.cpu_count() or 4) // 2)


def rms(muestras):
    if not len(muestras):
        return 0.0

    # np.dot en int64 en vez de mean(x**2) en float64: el segundo materializa un
    # array temporal del doble de tamano en cada bloque. int64 no desborda —
    # 32768^2 por 48.000 muestras es 2^47— y en int16 pelado si desbordaria,
    # devolviendo un RMS bajo justo en el bloque mas fuerte.
    largo = muestras.astype(np.int64)
    return float(np.sqrt(np.dot(largo, largo) / len(muestras)))


class Loopback:
    """Abre el loopback del dispositivo de salida por default y lo reabre si cambia.

    Conectar o desconectar los auriculares cambia el dispositivo default de Windows.
    El stream viejo queda vivo pero mudo: sigue entregando ceros y la clase se
    transcribe como silencio sin un solo error. Por eso se revisa el default en
    cada lectura fallida y en un chequeo periodico.

    VA EN MODO CALLBACK, NO CON read() BLOQUEANTE. Con lectura bloqueante el hilo
    principal tenia que volver a pedir datos cada 21 ms, y cualquier cosa que lo
    frenara mas que eso hacia que PortAudio descartara lo que no se leyo. Medido:
    el daemon solo capturaba los 72 s completos, pero lanzado desde Electron —con
    el GPU process, desktopCapturer cada 12 s y whisper ocupando los nucleos— de
    esos 72 s entraban 15.7. No habia error ni aviso: el wav simplemente salia
    corto, que en una clase significa perder minutos enteros sin enterarse.

    En modo callback PortAudio entrega desde su propio hilo de alta prioridad a
    una cola, y lo que tarde el resto del programa deja de importar.
    """

    def __init__(self):
        self.pa = pyaudio.PyAudio()
        self.stream = None
        self.silencio = None
        self.info = None
        self.canales = 2
        self.tasa_dispositivo = 48000
        self.bloques = queue.Queue()
        self.descartados = 0
        self.ultimo_bloque = time.time()
        self.reaperturas = 0

    def _mantener_despierto(self, indice_salida):
        """Reproduce silencio en el mismo dispositivo para que el endpoint no se duerma.

        ESTO NO ES OPCIONAL, aunque parezca que no hace nada. Un endpoint de salida
        sin nadie reproduciendo se va a reposo, y el loopback deja de entregar. Peor
        todavia: cuando otra app engancha el dispositivo, Windows lo reinicializa y
        el cliente de loopback que ya estaba abierto queda invalidado — `is_active()`
        SIGUE devolviendo True y no se levanta ninguna excepcion, simplemente no
        llega un byte mas.

        Medido: con la clase arrancando en silencio y el audio apareciendo recien a
        los 13 s, la captura moria a los 17 s y el resto de la clase salia vacio, sin
        un solo error en ningun lado. Con este stream de ceros abierto desde el
        principio el dispositivo nunca queda ocioso y la entrega no se corta.
        """
        try:
            def ceros(_entrada, cuadros, _tiempo, _estado):
                return (b"\x00" * cuadros * 2 * 2, pyaudio.paContinue)

            salida = self.pa.get_device_info_by_index(indice_salida)
            self.silencio = self.pa.open(
                format=pyaudio.paInt16,
                channels=2,
                rate=int(salida["defaultSampleRate"]),
                output=True,
                output_device_index=indice_salida,
                frames_per_buffer=CHUNK,
                stream_callback=ceros,
            )
            self.silencio.start_stream()
        except Exception as error:
            # Sin el keep-alive se graba igual mientras alguien reproduzca algo.
            # Es una clase: casi siempre hay alguien hablando.
            log(f"[audio] no se pudo abrir el keep-alive de silencio: {error}")
            self.silencio = None

    def _dispositivo_default(self):
        """Devuelve (loopback, indice_de_salida). El keep-alive necesita los dos:
        se captura del loopback pero el silencio se reproduce en el render."""
        wasapi = self.pa.get_host_api_info_by_type(pyaudio.paWASAPI)
        indice_salida = wasapi["defaultOutputDevice"]
        salida = self.pa.get_device_info_by_index(indice_salida)

        for lb in self.pa.get_loopback_device_info_generator():
            if salida["name"] in lb["name"]:
                return lb, indice_salida

        # Sin match por nombre se usa el primer loopback que haya: es peor grabar
        # el dispositivo equivocado que no grabar, pero es mucho peor no grabar.
        for lb in self.pa.get_loopback_device_info_generator():
            return lb, indice_salida

        return None, indice_salida

    def abrir(self):
        self.cerrar()
        info, indice_salida = self._dispositivo_default()

        if info is None:
            raise RuntimeError("Windows no expone ningun dispositivo de loopback WASAPI.")

        # El silencio PRIMERO: abrir el loopback sobre un endpoint dormido es
        # justamente lo que despues se corta sin avisar.
        if self.silencio is None:
            self._mantener_despierto(indice_salida)

        self.info = info
        self.canales = int(info["maxInputChannels"])
        self.tasa_dispositivo = int(info["defaultSampleRate"])

        def entregar(datos, _cuadros, _tiempo, estado):
            # Este callback corre en el hilo de audio de PortAudio: lo unico que
            # hace es encolar. Cualquier trabajo aca (numpy, disco, json) frena la
            # captura, que es exactamente el problema que el modo callback resuelve.
            if estado:
                self.descartados += 1

            self.ultimo_bloque = time.time()
            self.bloques.put(datos)
            return (None, pyaudio.paContinue)

        self.stream = self.pa.open(
            format=pyaudio.paInt16,
            channels=self.canales,
            rate=self.tasa_dispositivo,
            input=True,
            input_device_index=info["index"],
            frames_per_buffer=CHUNK,
            stream_callback=entregar,
        )
        self.stream.start_stream()
        self.ultimo_bloque = time.time()
        evento("dispositivo", nombre=info["name"], tasa=self.tasa_dispositivo, canales=self.canales)
        log(f"[audio] {info['name']} @ {self.tasa_dispositivo}Hz x{self.canales}")

    def cambio_de_dispositivo(self):
        try:
            actual, _salida = self._dispositivo_default()
        except OSError:
            return False

        return actual is not None and self.info is not None and actual["index"] != self.info["index"]

    def mudo(self, segundos=3.0):
        """Hace cuanto que no llega un bloque.

        Es la UNICA senal confiable de que el stream se murio: `is_active()` sigue
        devolviendo True sobre un cliente de loopback invalidado. Con el keep-alive
        abierto siempre llegan bloques, aunque sean de silencio, asi que pasar unos
        segundos sin ninguno solo puede significar que el stream dejo de servir.
        """
        return (time.time() - self.ultimo_bloque) > segundos

    def leer(self, timeout=1.0):
        """Un bloque de la cola, o None si en `timeout` no llego ninguno.

        Devolver None en vez de bloquear para siempre deja que el ciclo principal
        siga chequeando si lo pararon y si cambio el dispositivo de salida.
        """
        try:
            return self.bloques.get(timeout=timeout)
        except queue.Empty:
            return None

    def vivo(self):
        return self.stream is not None and self.stream.is_active()

    def cerrar(self):
        if self.stream is not None:
            try:
                self.stream.close()
            except Exception:
                pass
            self.stream = None

    def cerrar_silencio(self):
        if self.silencio is not None:
            try:
                self.silencio.close()
            except Exception:
                pass
            self.silencio = None

    def terminar(self):
        self.cerrar()
        self.cerrar_silencio()
        self.pa.terminate()


def a_mono_16k(datos, canales, tasa_origen):
    """Mezcla a mono y baja a 16 kHz. Devuelve un ndarray int16.

    NUMPY NO ES OPCIONAL ACA. La primera version recorria muestra por muestra en
    Python y no le ganaba al tiempo real: a 48 kHz estereo son 96.000 iteraciones
    por segundo de audio, y el proceso tardaba mas en convertir un bloque que lo
    que ese bloque duraba. PyAudio descarta lo que no se lee a tiempo, asi que la
    clase entraba con huecos — 70 segundos reales se grabaron como 15 — y no habia
    ningun error que lo delatara. Ya viene instalado: faster-whisper depende de el.

    Cuando la tasa es multiplo exacto (el caso normal: 48k -> 16k) se promedian
    grupos de N, que decima y filtra en un solo paso. Si no, se indexa, que alias
    un poco pero para voz no se nota.
    """
    # UN SOLO astype al principio y UNA division al final. La version anterior
    # hacia astype(int32)+mean() dos veces, y cada mean() materializa un array
    # float64 intermedio del doble de tamano que despues hay que volver a int16.
    # int32 aguanta de sobra: int16 por 2 canales por 3 muestras no llega ni a 2^20.
    muestras = np.frombuffer(datos, dtype=np.int16).astype(np.int32)
    divisor = 1

    if canales > 1:
        # Sumar en int32 y no en int16: dos canales cerca del tope saturarian y
        # el pico se daria vuelta de signo, que suena como un chasquido.
        muestras = muestras.reshape(-1, canales).sum(axis=1)
        divisor = canales

    if tasa_origen != TASA and tasa_origen % TASA == 0:
        factor = tasa_origen // TASA
        util = (len(muestras) // factor) * factor
        muestras = muestras[:util].reshape(-1, factor).sum(axis=1)
        divisor *= factor
    elif tasa_origen != TASA:
        indices = (np.arange(int(len(muestras) * TASA / tasa_origen)) * (tasa_origen / TASA)).astype(np.int64)
        muestras = muestras[indices]

    if divisor > 1:
        muestras //= divisor

    return muestras.astype(np.int16)


class Transcriptor(threading.Thread):
    """Consume tramos de audio y escribe transcript.jsonl.

    Va en su propio hilo porque whisper bloquea varios segundos por tramo y el
    hilo de captura no puede parar: PyAudio descarta lo que no se lee a tiempo y
    ese hueco no se recupera.
    """

    def __init__(self, cola, dir_salida, modelo, idioma, inicio_sesion, hilos):
        super().__init__(daemon=True)
        self.cola = cola
        self.ruta = os.path.join(dir_salida, "transcript.jsonl")
        self.modelo_nombre = modelo
        self.idioma = idioma
        self.inicio_sesion = inicio_sesion
        self.hilos = hilos
        self.modelo = None
        self.segmentos = 0

    def run(self):
        from faster_whisper import WhisperModel

        t0 = time.time()
        # cpu_threads ACOTADO a proposito. Por defecto ctranslate2 se queda con
        # todos los nucleos, y en una laptop de 4 nucleos que ademas corre Teams,
        # Electron y la captura de pantalla eso deja al hilo de audio sin turno:
        # medido, de 72 s de clase entraban 16. Transcribir un poco mas lento es
        # gratis —la cola absorbe— pero el audio que no se captura no vuelve.
        self.modelo = WhisperModel(
            self.modelo_nombre,
            device="cpu",
            compute_type="int8",
            cpu_threads=self.hilos,
        )
        evento("modelo_listo", modelo=self.modelo_nombre, carga=round(time.time() - t0, 1), hilos=self.hilos)

        while True:
            tramo = self.cola.get()

            if tramo is None:
                evento("transcriptor_fin", segmentos=self.segmentos)
                return

            try:
                self._transcribir(tramo)
            except Exception as error:
                # Un tramo que falla no puede matar la clase entera: se reporta y
                # se sigue con el siguiente.
                log(f"[whisper] fallo un tramo: {error}")
                evento("error_tramo", detalle=str(error))

    def _transcribir(self, tramo):
        muestras, offset = tramo
        audio = muestras.astype(np.float32) / 32768.0

        t0 = time.time()
        segmentos, _info = self.modelo.transcribe(
            audio,
            language=self.idioma,
            vad_filter=True,
            # Sin esto whisper arrastra el contexto del tramo anterior y cuando
            # un tramo sale vacio se pone a repetir la ultima frase para siempre.
            condition_on_previous_text=False,
            beam_size=1,
        )

        lineas = []
        for s in segmentos:
            texto = s.text.strip()
            if not texto:
                continue
            lineas.append({
                "inicio": round(offset + s.start, 2),
                "fin": round(offset + s.end, 2),
                "texto": texto,
                "reloj": self.inicio_sesion + offset + s.start,
            })

        if lineas:
            self._append(lineas)
            self.segmentos += len(lineas)

        evento(
            "tramo",
            offset=round(offset, 1),
            duracion=round(len(muestras) / TASA, 1),
            demora=round(time.time() - t0, 1),
            lineas=len(lineas),
            texto=" ".join(l["texto"] for l in lineas)[:400],
        )

    def _append(self, lineas):
        escribir_lineas(self.ruta, lineas)


def escribir_lineas(ruta, lineas, modo="a"):
    """Vuelca lineas JSONL y las fuerza a disco.

    El fsync no es paranoia: el servidor MCP y la UI leen este archivo mientras se
    escribe, y una linea a medias les rompe el JSON.parse.
    """
    with open(ruta, modo, encoding="utf-8") as f:
        for l in lineas:
            f.write(json.dumps(l, ensure_ascii=False) + "\n")
        f.flush()
        os.fsync(f.fileno())


def retranscribir(dir_sesion, modelo, idioma, hilos):
    """Segunda pasada sobre el audio ya grabado, con un modelo mas grande.

    La pasada en vivo corre con `small` porque tiene que ganarle al reloj. Esta no
    tiene esa restriccion: el audio ya esta en disco y puede tardar lo que quiera,
    asi que se usa el modelo que de mejor texto. Medido sobre 120 s de clase, en
    este equipo medium tarda ~70 s y large-v3 bastante mas.

    La transcripcion en vivo NO se pisa: se archiva como `transcript-vivo.jsonl`
    la primera vez. Si la pasada fina sale peor, el original sigue ahi.
    """
    ruta_wav = os.path.join(dir_sesion, "audio.wav")

    if not os.path.exists(ruta_wav):
        evento("error_retranscripcion", detalle="la sesion no guardo el audio crudo")
        return 1

    with wave.open(ruta_wav, "rb") as w:
        cuadros = w.getnframes()
        tasa = w.getframerate()
        crudo = w.readframes(cuadros)

    duracion = cuadros / tasa

    if duracion < 1:
        evento("error_retranscripcion", detalle="el audio grabado esta vacio")
        return 1

    # El reloj de pared sale de meta.json: sin el, los timestamps absolutos de la
    # pasada fina no coincidirian con los de la que reemplaza.
    inicio_sesion = time.time() - duracion

    try:
        with open(os.path.join(dir_sesion, "meta.json"), encoding="utf-8") as f:
            inicio_sesion = (json.load(f).get("inicio") or 0) / 1000 or inicio_sesion
    except Exception:
        pass

    from faster_whisper import WhisperModel

    t0 = time.time()
    m = WhisperModel(modelo, device="cpu", compute_type="int8", cpu_threads=hilos)
    evento("modelo_listo", modelo=modelo, carga=round(time.time() - t0, 1), hilos=hilos)

    audio = np.frombuffer(crudo, dtype=np.int16).astype(np.float32) / 32768.0

    t0 = time.time()
    segmentos, _info = m.transcribe(
        audio, language=idioma, vad_filter=True, condition_on_previous_text=False, beam_size=1,
    )

    ruta = os.path.join(dir_sesion, "transcript.jsonl")
    respaldo = os.path.join(dir_sesion, "transcript-vivo.jsonl")

    if os.path.exists(ruta) and not os.path.exists(respaldo):
        os.replace(ruta, respaldo)

    # A un .tmp y despues rename: la UI y el servidor MCP leen este archivo
    # mientras se escribe, y un rename es atomico — nunca ven medio transcript.
    tmp = ruta + ".tmp"
    lineas = []
    ultimo_aviso = 0.0

    if os.path.exists(tmp):
        os.remove(tmp)

    for seg in segmentos:
        texto = seg.text.strip()

        if not texto:
            continue

        lineas.append({
            "inicio": round(seg.start, 2),
            "fin": round(seg.end, 2),
            "texto": texto,
            "reloj": inicio_sesion + seg.start,
        })

        if seg.end - ultimo_aviso >= 30:
            ultimo_aviso = seg.end
            evento("retranscribiendo", avance=round(seg.end / duracion, 3), segmentos=len(lineas))

    escribir_lineas(tmp, lineas, modo="w")
    os.replace(tmp, ruta)

    evento(
        "retranscrito",
        modelo=modelo,
        segmentos=len(lineas),
        duracion=round(duracion, 1),
        demora=round(time.time() - t0, 1),
    )
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--salida", required=True)
    parser.add_argument(
        "--modelo",
        default="small",
        help="modelo para la pasada EN VIVO. small por default, no medium: medido sobre "
             "120 s de clase real en un Ryzen 5 7520U, small va a RTF 0.20 (4.9x de margen) "
             "y medium a 0.59 (1.7x). Con Teams y la app encima, medium llega a RTF ~1.0, se "
             "atrasa y no se recupera. La pasada fina se hace despues con --retranscribir.",
    )
    parser.add_argument("--idioma", default="es")
    parser.add_argument("--sin-wav", action="store_true", help="no guarda el audio crudo")
    parser.add_argument(
        "--vigilar-stdin",
        action="store_true",
        help="para cuando se cierra stdin. Solo si el padre mantiene el pipe abierto: "
             "lanzado a mano o en background, stdin ya viene en EOF y el daemon se apaga al instante. "
             "Un fifo de MSYS tampoco sirve, que python.exe es nativo y lo lee como EOF.",
    )
    parser.add_argument(
        "--hilos",
        type=int,
        default=0,
        help="nucleos para whisper. 0 = los fisicos (la mitad de los logicos).",
    )
    parser.add_argument(
        "--retranscribir",
        action="store_true",
        help="no graba: vuelve a transcribir el audio.wav que ya tiene --salida, con --modelo. "
             "Guarda la version en vivo como transcript-vivo.jsonl antes de reemplazarla.",
    )
    parser.add_argument(
        "--minutos",
        type=float,
        default=180.0,
        help="tope duro de grabacion. 0 lo saca. El default cubre una clase larga y evita "
             "que un daemon olvidado grabe hasta llenar el disco.",
    )
    args = parser.parse_args()

    os.makedirs(args.salida, exist_ok=True)

    if args.retranscribir:
        salir_de_ecoqos()
        hilos = args.hilos if args.hilos > 0 else hilos_por_defecto()
        sys.exit(retranscribir(args.salida, args.modelo, args.idioma, hilos))

    inicio = time.time()

    # Antes de abrir nada: si el proceso queda en EcoQoS, el audio se pierde.
    energia = salir_de_ecoqos()

    hilos = args.hilos if args.hilos > 0 else hilos_por_defecto()

    cola = queue.Queue()
    transcriptor = Transcriptor(cola, args.salida, args.modelo, args.idioma, inicio, hilos)

    # El stream se abre ANTES de arrancar el transcriptor: asi la captura ya esta
    # corriendo cuando empieza la carga del modelo, que se lleva varios segundos.
    lb = Loopback()
    lb.abrir()
    transcriptor.start()

    wav = None
    if not args.sin_wav:
        wav = wave.open(os.path.join(args.salida, "audio.wav"), "wb")
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(TASA)

    # `motivo` no es decorativo: una grabacion que se corta sola y no dice por que
    # es indistinguible de una que anduvo bien pero con poca clase adentro.
    corriendo = {"si": True, "motivo": None}

    def parar(motivo):
        def handler(*_args):
            if corriendo["si"]:
                corriendo["motivo"] = motivo
                evento("parando", motivo=motivo)
            corriendo["si"] = False

        return handler

    signal.signal(signal.SIGTERM, parar("SIGTERM"))
    signal.signal(signal.SIGINT, parar("SIGINT"))

    # El padre puede morir sin llegar a matar el proceso. Cerrar stdin es la
    # senal que si llega siempre, asi que un hilo la vigila.
    def vigilar_stdin():
        motivo = "stdin-eof"

        try:
            for linea in sys.stdin:
                if linea.strip() == "parar":
                    motivo = "stdin-parar"
                    break
        except Exception as error:
            motivo = f"stdin-error: {error}"

        parar(motivo)()

    if args.vigilar_stdin:
        threading.Thread(target=vigilar_stdin, daemon=True).start()

    evento("iniciado", salida=args.salida, modelo=args.modelo, pid=os.getpid(), energia=energia, hilos=hilos)

    # Lista de bloques y no un array que crece: concatenar en cada vuelta copia
    # el tramo entero 50 veces por segundo.
    bloques = []
    muestras_buffer = 0
    offset = 0.0
    silencio_seguido = 0.0
    ultimo_chequeo = time.time()
    muestras_totales = 0

    def cerrar_tramo():
        nonlocal bloques, muestras_buffer, offset
        tramo = np.concatenate(bloques)
        dur = len(tramo) / TASA
        cola.put((tramo, offset))
        offset += dur
        bloques = []
        muestras_buffer = 0
        return dur

    def revisar():
        """Chequeo periodico. Va ARRIBA del `continue` del camino sin bloques: ahi
        abajo no corria justo cuando el audio dejaba de entrar, que es el unico
        momento en que sirve."""
        nonlocal ultimo_chequeo

        if time.time() - ultimo_chequeo <= 5:
            return

        ultimo_chequeo = time.time()

        # Windows no avisa el cambio de default por esta API, hay que mirarlo.
        if lb.cambio_de_dispositivo():
            log("[audio] cambio el dispositivo de salida, reabriendo")
            evento("dispositivo_cambio")
            lb.abrir()

        # Los bugs que costaron caro en este archivo terminaban todos igual: audio
        # faltante y CERO errores. El wav salia corto y nadie se enteraba hasta
        # escucharlo. Comparar lo capturado contra el reloj es la senal que los
        # agarra a todos, asi que se mide sola y se avisa al padre.
        transcurrido = time.time() - inicio
        capturado = muestras_totales / TASA
        log(f"[audio] capturado {capturado:.1f}s de {transcurrido:.1f}s "
            f"(cola={lb.bloques.qsize()}, descartados={lb.descartados}, reaperturas={lb.reaperturas})")

        if transcurrido > 20 and capturado < transcurrido * 0.85:
            evento(
                "audio_faltante",
                capturado=round(capturado, 1),
                transcurrido=round(transcurrido, 1),
                descartados=lb.descartados,
                reaperturas=lb.reaperturas,
            )

    try:
        while corriendo["si"]:
            revisar()
            crudo = lb.leer()

            if crudo is None:
                # NO se consulta `vivo()`: un cliente de loopback invalidado sigue
                # contestando is_active()==True para siempre, y confiar en eso es
                # como se perdieron 55 de 72 segundos de clase sin un solo error.
                # La ausencia de bloques es la unica prueba, porque con el
                # keep-alive de silencio SIEMPRE tiene que haber bloques.
                if lb.mudo():
                    lb.reaperturas += 1
                    log(f"[audio] {lb.reaperturas}ª reapertura: dejaron de llegar bloques")
                    evento("dispositivo_perdido", reaperturas=lb.reaperturas)

                    try:
                        lb.abrir()
                    except Exception as error:
                        evento("error_dispositivo", detalle=str(error))
                        time.sleep(1.0)

                continue

            mono = a_mono_16k(crudo, lb.canales, lb.tasa_dispositivo)
            bloques.append(mono)
            muestras_buffer += len(mono)
            muestras_totales += len(mono)

            if wav is not None:
                wav.writeframes(mono.tobytes())

            dur_bloque = len(mono) / TASA
            if rms(mono) < SILENCIO_RMS:
                silencio_seguido += dur_bloque
            else:
                silencio_seguido = 0.0

            dur = muestras_buffer / TASA
            # Cerrar el tramo en un silencio evita partir una palabra al medio.
            # Si nadie se calla, MAX_SEG corta igual: mas vale un corte feo que
            # una cola que crece sin techo.
            cierra = (dur >= MIN_SEG and silencio_seguido >= SILENCIO_CORTE) or dur >= MAX_SEG

            if cierra:
                cerrar_tramo()
                silencio_seguido = 0.0
                pendientes = cola.qsize()
                evento("cola", pendientes=pendientes, minutos=round(offset / 60, 1))

                # Medido con la maquina ocupada, `medium` tarda ~15 s por tramo de
                # ~22 s: entra, pero con 1.4x de margen, no con los 5x que da el
                # modelo solo. Si Teams y la app aprietan el CPU la cola empieza a
                # crecer y desde ahi ya no se recupera sola. Avisar es todo lo que
                # se puede hacer sin tirar audio: cambiar de modelo en caliente
                # significaria recargar y perder los tramos de esos segundos.
                if pendientes >= 3:
                    evento("atraso", pendientes=pendientes, modelo=args.modelo)

            if args.minutos > 0 and (time.time() - inicio) >= args.minutos * 60:
                corriendo["motivo"] = "tope"
                evento("tope_alcanzado", minutos=args.minutos)
                break
    finally:
        # La cola de un tramo corto igual vale: ahi suele estar la ultima frase,
        # que es donde el profesor dicta la tarea.
        if muestras_buffer / TASA > 1.0:
            cerrar_tramo()

        cola.put(None)
        lb.terminar()
        transcriptor.join(timeout=180)

        if wav is not None:
            wav.close()

        evento(
            "detenido",
            duracion=round(muestras_totales / TASA, 1),
            segmentos=transcriptor.segmentos,
            motivo=corriendo["motivo"],
            reaperturas=lb.reaperturas,
            descartados=lb.descartados,
        )


if __name__ == "__main__":
    main()
