import { Bold, ImagePlus, Italic, Strikethrough, Type, Underline, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { sanitizeNoteHtml } from '../utils/sanitizeNoteHtml';
import { NOTE_COLORS } from './NoteEditorModal';

const IMAGE_MIME = /^image\/(png|jpeg|webp|gif)$/;

// Editor de texto enriquecido cero-dep: contentEditable + execCommand. Electron
// es Chromium fijo, así que el "deprecated" de execCommand no muerde. El HTML se
// sanitiza (allowlist DOM) al reportar cambios, al montar y al pegar.
function RichTextEditor({ initialHtml, onChange, placeholder, onAttachImage, onRemoveImage }) {
  const ref = useRef(null);
  const fileInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [showColor, setShowColor] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [hoverImg, setHoverImg] = useState(null); // { top, left, el }

  // El innerHTML se fija UNA vez al montar (el modal remonta el editor por nota).
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = sanitizeNoteHtml(initialHtml || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report = () => {
    if (ref.current) onChange(sanitizeNoteHtml(ref.current.innerHTML));
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const range = savedRangeRef.current;
    ref.current?.focus();
    if (range) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const applyCommand = (command, value = null) => {
    ref.current?.focus();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, value);
    report();
    setShowColor(false);
  };

  const preserveSelection = (event) => event.preventDefault();

  // Inserta un <img> del adjunto en la posición del cursor guardada.
  const insertImage = (src, alt) => {
    restoreSelection();
    document.execCommand('insertHTML', false, `<img src="${src}" alt="${(alt || '').replace(/"/g, '')}">`);
    report();
  };

  const handleFiles = async (files) => {
    for (const file of files) {
      if (!IMAGE_MIME.test(file.type)) continue; // no-imagen: filtrado, cero efecto
      const result = await onAttachImage?.(file);
      if (result?.src) insertImage(result.src, result.filename);
    }
  };

  const onFileInputChange = (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = ''; // permite re-seleccionar el mismo archivo
    handleFiles(files);
  };

  const openFilePicker = () => {
    saveSelection();
    fileInputRef.current?.click();
  };

  const handlePaste = (event) => {
    const items = [...(event.clipboardData?.items || [])];
    const imageFiles = items.filter((i) => i.type.startsWith('image/')).map((i) => i.getAsFile()).filter(Boolean);

    if (imageFiles.length > 0) {
      event.preventDefault();
      saveSelection();
      handleFiles(imageFiles);
      return;
    }

    // Sin imágenes: paste de HTML/texto sanitizado (evita <img onerror> del clipboard).
    event.preventDefault();
    const html = event.clipboardData?.getData('text/html');
    if (html) document.execCommand('insertHTML', false, sanitizeNoteHtml(html));
    else document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') || '');
    report();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const files = [...(event.dataTransfer?.files || [])];
    saveSelection();
    handleFiles(files);
  };

  // Hover sobre una imagen inline → botón flotante X para quitarla.
  const handleMouseOver = (event) => {
    if (event.target.tagName === 'IMG' && ref.current) {
      const wrapRect = ref.current.getBoundingClientRect();
      const imgRect = event.target.getBoundingClientRect();
      setHoverImg({ top: imgRect.top - wrapRect.top + 4, left: imgRect.right - wrapRect.left - 24, el: event.target });
    }
  };

  const removeHoveredImage = async () => {
    const img = hoverImg?.el;
    if (!img) return;
    await onRemoveImage?.(img.getAttribute('src'));
    img.remove();
    setHoverImg(null);
    report();
  };

  return (
    <div className="relative mt-4">
      <div className="mb-2 flex items-center gap-0.5 border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
        <ToolbarButton icon={Bold} label="Negrita" onMouseDown={preserveSelection} onClick={() => applyCommand('bold')} />
        <ToolbarButton icon={Italic} label="Itálica" onMouseDown={preserveSelection} onClick={() => applyCommand('italic')} />
        <ToolbarButton icon={Underline} label="Subrayado" onMouseDown={preserveSelection} onClick={() => applyCommand('underline')} />
        <ToolbarButton icon={Strikethrough} label="Tachado" onMouseDown={preserveSelection} onClick={() => applyCommand('strikeThrough')} />

        <div className="relative">
          <ToolbarButton icon={Type} label="Color de letra" onMouseDown={preserveSelection} onClick={() => setShowColor((v) => !v)} />
          {showColor ? (
            <div
              className="absolute left-0 top-full z-10 mt-1 flex gap-1.5 border p-2"
              style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
            >
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onMouseDown={preserveSelection}
                  onClick={() => applyCommand('foreColor', color.hex)}
                  aria-label={`Texto ${color.label}`}
                  title={color.label}
                  className="h-5 w-5"
                  style={{ background: color.hex, borderRadius: 'var(--radius-badge, 0px)' }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {onAttachImage ? (
          <ToolbarButton icon={ImagePlus} label="Insertar imagen" onMouseDown={preserveSelection} onClick={openFilePicker} />
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        hidden
        onChange={onFileInputChange}
      />

      <div
        className="relative"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div
          ref={ref}
          contentEditable
          role="textbox"
          aria-multiline="true"
          onInput={report}
          onBlur={() => { saveSelection(); report(); }}
          onPaste={handlePaste}
          onMouseOver={handleMouseOver}
          onMouseLeave={() => setHoverImg(null)}
          data-placeholder={placeholder}
          className="note-rich-editor min-h-[8rem] w-full text-sm leading-6 outline-none"
          style={{ color: 'var(--text-normal)', fontFamily: 'var(--font-body, inherit)' }}
          suppressContentEditableWarning
        />

        {dragOver ? (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed"
            style={{ borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
              Soltar imagen
            </span>
          </div>
        ) : null}

        {hoverImg ? (
          <button
            type="button"
            onClick={removeHoveredImage}
            aria-label="Quitar imagen"
            className="absolute z-10 p-1"
            style={{ top: `${hoverImg.top}px`, left: `${hoverImg.left}px`, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 'var(--radius-badge, 0px)' }}
          >
            <X className="h-3 w-3" strokeWidth={2} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarButton({ icon: Icon, label, onMouseDown, onClick }) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="p-1.5"
      style={{ color: 'var(--text-muted)', borderRadius: 'var(--radius-button, 0px)' }}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}

export default RichTextEditor;
