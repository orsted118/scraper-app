import {
  Archive,
  ArchiveRestore,
  Bell,
  Check,
  CheckSquare,
  Circle,
  Download,
  Pin,
  Plus,
  Tag,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import RichTextEditor from './RichTextEditor';
import { stripNoteHtml } from '../utils/sanitizeNoteHtml';
import { EASE } from '../utils/motion';


// Colores funcionales de nota (curated, fijos): NO son tokens de tema. Aparecen
// solo como border-left 3px — señal de categoría, nunca fondo de card.
export const NOTE_COLORS = [
  { id: 'neutral', hex: '#8A8A8A', label: 'Neutral' },
  { id: 'vermillion', hex: '#FF3D00', label: 'Urgente' },
  { id: 'amber', hex: '#FFA000', label: 'Importante' },
  { id: 'green', hex: '#00C853', label: 'Hecho' },
  { id: 'cyan', hex: '#00B0FF', label: 'Trabajo' },
  { id: 'purple', hex: '#7C4DFF', label: 'Personal' },
];

export function noteColorHex(colorId) {
  return (NOTE_COLORS.find((c) => c.id === colorId) || NOTE_COLORS[0]).hex;
}

// Sirve una imagen adjunta: en dev el mock guarda data URLs (se devuelven tal
// cual); en Electron es un file path → protocolo dvpotro-note-img://.
export function buildNoteImageUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('dvpotro-note-img://')) return pathOrUrl;
  const normalized = String(pathOrUrl).replace(/\\/g, '/');
  return `dvpotro-note-img://${normalized.startsWith('/') ? '' : '/'}${encodeURI(normalized)}`;
}

function makeItemId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatReminder(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

// Presets de recordatorio: devuelven ISO. "Mañana 9AM" y "próxima semana" se
// anclan a horas concretas para no depender de la hora exacta del click.
function reminderPresets() {
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000);

  const tomorrow9 = new Date();
  tomorrow9.setDate(tomorrow9.getDate() + 1);
  tomorrow9.setHours(9, 0, 0, 0);

  const nextWeek9 = new Date();
  nextWeek9.setDate(nextWeek9.getDate() + 7);
  nextWeek9.setHours(9, 0, 0, 0);

  return [
    { label: 'En 1 hora', at: inOneHour.toISOString() },
    { label: 'Mañana 9:00', at: tomorrow9.toISOString() },
    { label: 'Próxima semana', at: nextWeek9.toISOString() },
  ];
}

function IconButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="p-2"
      style={{
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        borderRadius: 'var(--radius-button, 0px)',
      }}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}

function NoteEditorModal({ note, labels = [], onSave, onClose, onArchive, onTrash, onCreateLabel, onExport, onAttachImage, onRemoveImage }) {
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState(note);
  const [showColors, setShowColors] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const saveTimeoutRef = useRef(null);
  const draftRef = useRef(note);

  // draftRef espeja draft para que el cleanup (final save) lea lo último sin
  // re-suscribir el efecto en cada tecla.
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Auto-save debounced 300ms ante cualquier cambio del draft.
  useEffect(() => {
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      onSave(draftRef.current);
    }, 300);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [draft, onSave]);

  // Save final garantizado al desmontar (cierre) — no perder el último trazo.
  useEffect(
    () => () => {
      clearTimeout(saveTimeoutRef.current);
      onSave(draftRef.current);
    },
    [onSave],
  );

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      // Ctrl+Enter guarda y cierra (save-final ocurre en el cleanup del efecto).
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const patch = (fields) => setDraft((previous) => ({ ...previous, ...fields }));

  const setReminderAt = (at) => {
    patch({ reminder: { at, fired: false, snoozedFrom: null } });
    setShowReminder(false);
  };

  // El RichTextEditor pide adjuntar un File → devolvemos {src, filename} para
  // que lo inserte inline. draftRef mantiene el draft actual sin re-suscribir.
  const handleAttachImage = async (file) => {
    if (!onAttachImage) return null;
    return onAttachImage(draftRef.current, file);
  };

  const handleRemoveImageBySrc = async (src) => {
    if (!onRemoveImage) return;
    await onRemoveImage(draftRef.current, src);
  };

  const toggleType = () => {
    if (draft.type === 'text') {
      // Texto → checklist: cada línea no vacía del body se vuelve un item.
      const items = (draft.body || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ id: makeItemId(), text, done: false }));
      patch({ type: 'checklist', items: items.length ? items : [{ id: makeItemId(), text: '', done: false }], body: '' });
    } else {
      // Checklist → texto: items pendientes primero, luego hechos, una línea c/u.
      const body = [...draft.items]
        .sort((a, b) => Number(a.done) - Number(b.done))
        .map((i) => i.text)
        .filter(Boolean)
        .join('\n');
      patch({ type: 'text', body, items: [] });
    }
  };

  const updateItem = (id, fields) => {
    patch({ items: draft.items.map((item) => (item.id === id ? { ...item, ...fields } : item)) });
  };

  const addItem = () => {
    patch({ items: [...draft.items, { id: makeItemId(), text: '', done: false }] });
  };

  const removeItem = (id) => {
    patch({ items: draft.items.filter((item) => item.id !== id) });
  };

  const toggleLabel = (label) => {
    const has = draft.labels.includes(label);
    patch({ labels: has ? draft.labels.filter((l) => l !== label) : [...draft.labels, label] });
  };

  const submitNewLabel = async () => {
    const name = newLabel.trim();
    if (!name || !onCreateLabel) return;
    const created = await onCreateLabel(name);
    if (created) {
      patch({ labels: [...draft.labels, created] });
      setNewLabel('');
    }
  };

  // Items marcados van al fondo, preservando el orden dentro de cada grupo.
  const orderedItems = [...draft.items].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduced ? 0 : 0.18, ease: EASE }}
        role="dialog"
        aria-modal="true"
        aria-label="Editor de nota"
        className="flex max-h-[80vh] w-full max-w-[640px] flex-col border"
        style={{
          borderTopColor: 'var(--border)',
          borderRightColor: 'var(--border)',
          borderBottomColor: 'var(--border)',
          borderLeftWidth: '3px',
          borderLeftColor: noteColorHex(draft.color),
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-card, 0px)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-6">
          <input
            type="text"
            value={draft.title}
            onChange={(event) => patch({ title: event.target.value })}
            placeholder="Título"
            className="w-full bg-transparent outline-none"
            style={{
              color: 'var(--text-strong)',
              fontFamily: 'var(--font-display, sans-serif)',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          />

          {draft.type === 'text' ? (
            <RichTextEditor
              initialHtml={draft.body}
              onChange={(html) => patch({ body: html })}
              placeholder="Escribe una nota..."
              onAttachImage={onAttachImage ? handleAttachImage : undefined}
              onRemoveImage={handleRemoveImageBySrc}
            />
          ) : (
            <div className="mt-4 space-y-1">
              {orderedItems.map((item) => (
                <div key={item.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateItem(item.id, { done: !item.done })}
                    aria-label={item.done ? 'Desmarcar' : 'Marcar'}
                    className="shrink-0"
                    style={{ color: item.done ? 'var(--accent)' : 'var(--text-muted)' }}
                  >
                    {item.done ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  </button>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(event) => updateItem(item.id, { text: event.target.value })}
                    placeholder="Elemento"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{
                      color: item.done ? 'var(--text-muted)' : 'var(--text-normal)',
                      textDecoration: item.done ? 'line-through' : 'none',
                      fontFamily: 'var(--font-body, inherit)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label="Quitar elemento"
                    className="shrink-0 opacity-0 group-hover:opacity-100"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                className="mt-1 inline-flex items-center gap-2 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Añadir elemento
              </button>
            </div>
          )}

          {draft.labels.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {draft.labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-semibold uppercase"
                  style={{
                    borderColor: 'var(--border-normal)',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.14em',
                    borderRadius: 'var(--radius-badge, 0px)',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div
          className="relative flex items-center gap-1 border-t px-3 py-2"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <IconButton icon={Pin} label={draft.pinned ? 'Desfijar' : 'Fijar'} active={draft.pinned} onClick={() => patch({ pinned: !draft.pinned })} />
          <IconButton icon={draft.type === 'text' ? CheckSquare : Type} label={draft.type === 'text' ? 'Convertir a checklist' : 'Convertir a texto'} onClick={toggleType} />

          <div className="relative">
            <IconButton icon={Circle} label="Color" active={draft.color !== 'neutral'} onClick={() => { setShowColors((v) => !v); setShowLabels(false); }} />
            {showColors ? (
              <div
                className="absolute bottom-full left-0 mb-2 flex gap-1.5 border p-2"
                style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
              >
                {NOTE_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => { patch({ color: color.id }); setShowColors(false); }}
                    aria-label={color.label}
                    title={color.label}
                    className="h-5 w-5"
                    style={{
                      background: color.hex,
                      borderRadius: 'var(--radius-badge, 0px)',
                      outline: draft.color === color.id ? '2px solid var(--text-strong)' : 'none',
                      outlineOffset: '1px',
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <IconButton icon={Tag} label="Etiquetas" active={draft.labels.length > 0} onClick={() => { setShowLabels((v) => !v); setShowColors(false); }} />
            {showLabels ? (
              <div
                className="absolute bottom-full left-0 mb-2 max-h-48 w-48 overflow-y-auto border p-1"
                style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
              >
                {labels.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>Sin etiquetas todavía.</p>
                ) : (
                  labels.map((label) => {
                    const checked = draft.labels.includes(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleLabel(label)}
                        className="row-hover flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs"
                        style={{ color: 'var(--text-normal)' }}
                      >
                        <span className="shrink-0" style={{ color: checked ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {checked ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />}
                        </span>
                        {label}
                      </button>
                    );
                  })
                )}
                {onCreateLabel ? (
                  <div className="mt-1 flex items-center gap-1 border-t px-2 pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(event) => setNewLabel(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          submitNewLabel();
                        }
                      }}
                      placeholder="Nueva etiqueta"
                      className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                      style={{ color: 'var(--text-strong)' }}
                    />
                    <button type="button" onClick={submitNewLabel} aria-label="Crear etiqueta" style={{ color: 'var(--accent)' }}>
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <IconButton icon={Bell} label="Recordatorio" active={Boolean(draft.reminder)} onClick={() => { setShowReminder((v) => !v); setShowColors(false); setShowLabels(false); }} />
            {showReminder ? (
              <div
                className="absolute bottom-full left-0 mb-2 w-52 border p-1"
                style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
              >
                {reminderPresets().map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setReminderAt(preset.at)}
                    className="row-hover flex w-full items-center justify-between px-2 py-1.5 text-left text-xs"
                    style={{ color: 'var(--text-normal)' }}
                  >
                    {preset.label}
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)' }}>{formatReminder(preset.at)}</span>
                  </button>
                ))}
                <div className="mt-1 border-t px-2 pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Personalizado</p>
                  <input
                    type="datetime-local"
                    onChange={(event) => { if (event.target.value) setReminderAt(new Date(event.target.value).toISOString()); }}
                    className="field w-full px-2 py-1 text-xs"
                    style={{ color: 'var(--text-strong)' }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {onArchive ? (
            <IconButton icon={draft.archived ? ArchiveRestore : Archive} label={draft.archived ? 'Desarchivar' : 'Archivar'} onClick={() => { onArchive(draft); onClose(); }} />
          ) : null}
          {onTrash ? (
            <IconButton icon={Trash2} label="Mover a papelera" onClick={() => { onTrash(draft); onClose(); }} />
          ) : null}

          <div className="flex-1" />

          {/* Recordatorio activo: fecha mono + quitar. */}
          {draft.reminder ? (
            <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
              <Bell className="h-3 w-3" strokeWidth={1.5} fill="currentColor" />
              {formatReminder(draft.reminder.at)}
              <button type="button" onClick={() => patch({ reminder: null })} className="hov-accent" style={{ color: 'var(--text-muted)' }}>Quitar</button>
            </span>
          ) : null}

          {onExport ? (
            <button type="button" onClick={onExport} className="btn-outline inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold">
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
              Markdown
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="btn-outline px-4 py-1.5 text-sm font-semibold"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default NoteEditorModal;
