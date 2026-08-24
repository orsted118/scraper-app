import {
  Archive,
  ArchiveRestore,
  Bell,
  Check,
  ChevronDown,
  Circle,
  Copy,
  LayoutGrid,
  List,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Search,
  StickyNote,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NoteEditorModal, { buildNoteImageUrl } from '../components/NoteEditorModal';
import { NOTE_COLORS, noteColorHex } from '../utils/noteColors';
import { NOTE_STATUSES, DEFAULT_NOTE_STATUS, noteStatus } from '../utils/noteStatuses';
import { stripNoteHtml } from '../utils/sanitizeNoteHtml';
import { EASE } from '../utils/motion';

// Serializa una nota a texto plano para el portapapeles. Texto libre: título en
// primera línea, cuerpo sin HTML, checklists como "[x]"/"[ ]". Nada de
// front-matter — el usuario esperaría poder pegar esto en cualquier lado.
function noteToPlainText(note) {
  const parts = [];
  if (note.title) parts.push(note.title);

  if (note.type === 'checklist') {
    const items = (note.items || [])
      .map((item) => (item.done ? '[x] ' : '[ ] ') + (item.text || ''))
      .join('\n');
    if (items) parts.push(items);
  } else {
    const body = stripNoteHtml(note.body || '').trim();
    if (body) parts.push(body);
  }

  return parts.join('\n\n');
}

const DAY_MS = 24 * 60 * 60 * 1000;

const VIEWS = [
  { id: 'active', label: 'Notas', icon: StickyNote },
  { id: 'archived', label: 'Archivo', icon: Archive },
  { id: 'trashed', label: 'Papelera', icon: Trash2 },
];

const SORT_OPTIONS = [
  { id: 'updatedAt', label: 'Recientes' },
  { id: 'createdAt', label: 'Creación' },
  { id: 'title', label: 'Título' },
];

const TYPE_OPTIONS = [
  { id: 'text', label: 'Texto' },
  { id: 'checklist', label: 'Lista' },
];

const SHORTCUTS = [
  ['C', 'Nueva nota de texto'],
  ['L', 'Nueva lista'],
  ['/', 'Buscar'],
  ['Esc', 'Cerrar / limpiar selección'],
  ['↑ ↓ ← →', 'Navegar notas'],
  ['Enter', 'Abrir nota enfocada'],
  ['Ctrl+C', 'Copiar texto de enfocada'],
  ['Ctrl+D', 'Duplicar enfocada'],
  ['E', 'Archivar enfocada'],
  ['#', 'Mover a papelera'],
  ['?', 'Esta ayuda'],
];

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyNote(type = 'text') {
  return {
    id: makeId(),
    type,
    title: '',
    body: '',
    items: type === 'checklist' ? [{ id: makeId(), text: '', done: false }] : [],
    attachments: [],
    color: 'neutral',
    labels: [],
    pinned: false,
    archived: false,
    trashed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    reminder: null,
    __isNew: true,
  };
}

function formatRelative(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  if (diffMs < 7 * DAY_MS) return `hace ${Math.floor(hours / 24)}d`;

  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatReminderDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function NoteCard({ note, view, selected, selectionActive, focused, onCardClick, onOpen, onAction, onRemoveLabel, listMode }) {
  const doneCount = note.items.filter((i) => i.done).length;
  const previewItems = [...note.items].sort((a, b) => Number(a.done) - Number(b.done)).slice(0, 3);
  const extraItems = note.items.length - previewItems.length;
  const hasFutureReminder = note.reminder && !note.reminder.fired && new Date(note.reminder.at).getTime() > Date.now();

  const stop = (fn) => (event) => {
    event.stopPropagation();
    fn();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-note-card={note.id}
      onClick={(event) => onCardClick(event, note)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen(note);
      }}
      className="group row-hover relative flex cursor-pointer flex-col border p-4"
      style={{
        // Longhand por lado (no mezclar con el shorthand borderColor: React se
        // queja y re-renderea inconsistente).
        borderTopColor: selected ? 'var(--accent)' : focused ? 'var(--border-normal)' : 'var(--border-subtle)',
        borderRightColor: selected ? 'var(--accent)' : focused ? 'var(--border-normal)' : 'var(--border-subtle)',
        borderBottomColor: selected ? 'var(--accent)' : focused ? 'var(--border-normal)' : 'var(--border-subtle)',
        borderLeftWidth: '3px',
        borderLeftColor: noteColorHex(note.color),
        outline: focused ? '1px solid var(--border-normal)' : 'none',
        outlineOffset: '2px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card, 0px)',
        breakInside: listMode ? undefined : 'avoid',
        // El color y la selección cambian en el lugar (sin remontar la card):
        // sin transición el salto de tinta se lee como parpadeo.
        transition: 'background-color 200ms ease, border-color 200ms ease',
      }}
    >
      {/* Checkbox multi-select: visible en hover o cuando hay selección activa. */}
      <button
        type="button"
        onClick={stop(() => onCardClick({ ctrlKey: true }, note))}
        aria-label={selected ? 'Deseleccionar' : 'Seleccionar'}
        className={`absolute left-2 top-2 ${selected || selectionActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        style={{ color: selected ? 'var(--accent)' : 'var(--text-muted)' }}
      >
        {selected ? <Check className="h-4 w-4" strokeWidth={2} /> : <Circle className="h-4 w-4" strokeWidth={1.5} />}
      </button>

      {hasFutureReminder ? (
        <span
          className="absolute right-3 top-3 inline-flex items-center gap-1 text-[10px]"
          style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}
        >
          <Bell className="h-3 w-3" strokeWidth={1.5} fill="currentColor" />
          {formatReminderDate(note.reminder.at)}
        </span>
      ) : null}

      {/* Thumbnail de la primera imagen: TOP de la card, hairline abajo, badge +N. */}
      {(note.attachments || []).length > 0 ? (
        <div className="relative -mx-4 -mt-4 mb-3 overflow-hidden border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <img src={buildNoteImageUrl(note.attachments[0].path)} alt="" className="max-h-44 w-full object-cover" draggable="false" />
          {note.attachments.length > 1 ? (
            <span
              className="absolute right-2 top-2 px-1.5 py-0.5 text-[11px]"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums', borderRadius: 'var(--radius-badge, 0px)' }}
            >
              +{note.attachments.length - 1}
            </span>
          ) : null}
        </div>
      ) : null}

      {note.title ? (
        <h3
          className="truncate pr-6 font-extrabold"
          style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)', fontSize: '17px', letterSpacing: '-0.01em' }}
        >
          {note.title}
        </h3>
      ) : null}

      {note.type === 'text' ? (
        stripNoteHtml(note.body) ? (
          <p className="mt-1.5 text-sm leading-6" style={{ color: 'var(--text-muted)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' }}>
            {stripNoteHtml(note.body)}
          </p>
        ) : null
      ) : (
        <div className="mt-1.5 space-y-1">
          {previewItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <span className="shrink-0" style={{ color: item.done ? 'var(--accent)' : 'var(--text-muted)' }}>
                <Circle className="h-3 w-3" strokeWidth={1.5} fill={item.done ? 'currentColor' : 'none'} />
              </span>
              <span className="truncate" style={{ color: item.done ? 'var(--text-muted)' : 'var(--text-normal)', textDecoration: item.done ? 'line-through' : 'none' }}>
                {item.text || '—'}
              </span>
            </div>
          ))}
          {extraItems > 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
              +{extraItems} más · {doneCount}/{note.items.length} hechos
            </p>
          ) : null}
        </div>
      )}

      {note.labels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.labels.map((label) => (
            <span
              key={label}
              className="group/label inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase"
              style={{ borderColor: 'var(--border-normal)', color: 'var(--text-muted)', letterSpacing: '0.14em', borderRadius: 'var(--radius-badge, 0px)' }}
            >
              {label}
              <button
                type="button"
                onClick={stop(() => onRemoveLabel(note, label))}
                aria-label={`Quitar etiqueta ${label}`}
                className="opacity-0 group-hover/label:opacity-100"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-2.5 w-2.5" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {(() => {
            const status = noteStatus(note.status || DEFAULT_NOTE_STATUS);
            return (
              <span
                className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}
                title={`Estado: ${status.label}`}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5"
                  style={{ background: status.hex, borderRadius: 'var(--radius-badge, 0px)' }}
                />
                {status.short}
              </span>
            );
          })()}
          <span
            className="truncate text-[11px]"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}
          >
            {view === 'trashed' && note.deletedAt ? `eliminada ${formatRelative(note.deletedAt)}` : formatRelative(note.updatedAt)}
          </span>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          {view === 'active' ? (
            <>
              <button type="button" onClick={stop(() => onAction('togglePin', note))} aria-label={note.pinned ? 'Desfijar' : 'Fijar'} className="p-1.5" style={{ color: note.pinned ? 'var(--accent)' : 'var(--text-muted)' }}>
                {note.pinned ? <PinOff className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Pin className="h-3.5 w-3.5" strokeWidth={1.5} />}
              </button>
              <button type="button" onClick={stop(() => onAction('copyText', note))} aria-label="Copiar texto" title="Copiar texto" className="p-1.5" style={{ color: 'var(--text-muted)' }}>
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={stop(() => onAction('archive', note))} aria-label="Archivar" className="p-1.5" style={{ color: 'var(--text-muted)' }}>
                <Archive className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={stop(() => onAction('trash', note))} aria-label="Mover a papelera" className="p-1.5" style={{ color: 'var(--text-muted)' }}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </>
          ) : null}
          {view === 'archived' ? (
            <>
              <button type="button" onClick={stop(() => onAction('unarchive', note))} aria-label="Desarchivar" className="p-1.5" style={{ color: 'var(--text-muted)' }}>
                <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={stop(() => onAction('trash', note))} aria-label="Mover a papelera" className="p-1.5" style={{ color: 'var(--text-muted)' }}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </>
          ) : null}
          {view === 'trashed' ? (
            <>
              <button type="button" onClick={stop(() => onAction('restore', note))} aria-label="Restaurar" className="p-1.5" style={{ color: 'var(--text-muted)' }}>
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={stop(() => onAction('permanentDelete', note))} aria-label="Eliminar definitivamente" className="p-1.5" style={{ color: 'var(--accent)' }}>
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Notas({ deepLink } = {}) {
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const reduced = useReducedMotion();

  const [view, setView] = useState('active');
  const [notes, setNotes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [search, setSearch] = useState('');
  const [colorFilters, setColorFilters] = useState([]);
  const [labelFilters, setLabelFilters] = useState([]);
  const [typeFilters, setTypeFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [sortBy, setSortBy] = useState('updatedAt');
  const [viewMode, setViewMode] = useState('grid');
  const [editing, setEditing] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [openMenu, setOpenMenu] = useState(null); // 'color' | 'label' | 'type' | 'sort'
  const [showHelp, setShowHelp] = useState(false);
  const [renamingLabel, setRenamingLabel] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingLabel, setDeletingLabel] = useState(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [quickNote, setQuickNote] = useState({ text: '', type: 'text', color: 'neutral', pinned: false });
  const [toast, setToast] = useState('');

  const createdIdRef = useRef(null);
  const searchRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const lastSelectedRef = useRef(-1);

  const showToast = useCallback((message) => {
    clearTimeout(toastTimeoutRef.current);
    setToast(message);
    toastTimeoutRef.current = setTimeout(() => setToast(''), 2500);
  }, []);

  useEffect(() => () => clearTimeout(toastTimeoutRef.current), []);

  const refresh = useCallback(async () => {
    if (!api?.notes) {
      setLoaded(true);
      return;
    }
    const filters = {};
    if (colorFilters.length) filters.colors = colorFilters;
    if (labelFilters.length) filters.labels = labelFilters;
    if (typeFilters.length) filters.types = typeFilters;
    if (statusFilters.length) filters.statuses = statusFilters;
    if (search.trim()) filters.search = search.trim();

    const [list, labelList] = await Promise.all([
      api.notes.list({ view, filters }),
      api.notes.labelsList(),
    ]);
    setNotes(Array.isArray(list) ? list : []);
    setLabels(Array.isArray(labelList) ? labelList : []);
    setLoaded(true);
  }, [api, view, search, colorFilters, labelFilters, typeFilters, statusFilters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    api?.notes
      ?.settingsGet?.()
      .then((settings) => {
        if (settings?.view === 'grid' || settings?.view === 'list') setViewMode(settings.view);
        if (['updatedAt', 'createdAt', 'title'].includes(settings?.sortBy)) setSortBy(settings.sortBy);
      })
      .catch(() => {});
    // api estable durante la vida del renderer.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewMode = async (mode) => {
    setViewMode(mode);
    await api?.notes?.settingsUpdate?.({ view: mode });
  };

  const handleSort = async (next) => {
    setSortBy(next);
    setOpenMenu(null);
    await api?.notes?.settingsUpdate?.({ sortBy: next });
    await refresh();
  };

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedRef.current = -1;
  }, []);

  const openNew = (type = 'text') => { createdIdRef.current = null; setEditing(emptyNote(type)); };
  const openExisting = (note) => { createdIdRef.current = null; setEditing(note); };

  // Deep-link desde una notificación (app://notas?note={id}): abrir esa nota.
  useEffect(() => {
    if (!deepLink?.noteId || !api?.notes?.get) return;
    api.notes.get(deepLink.noteId).then((note) => {
      if (note) openExisting(note);
    }).catch(() => {});
    // deepLink es un objeto nuevo por navegación (incluye ts).
  }, [deepLink]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleFlat = notes;

  const handleCardClick = (event, note) => {
    const index = visibleFlat.findIndex((n) => n.id === note.id);

    if (event.ctrlKey || event.metaKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(note.id)) next.delete(note.id);
        else next.add(note.id);
        return next;
      });
      lastSelectedRef.current = index;
      return;
    }

    if (event.shiftKey && lastSelectedRef.current >= 0) {
      const [from, to] = [lastSelectedRef.current, index].sort((a, b) => a - b);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (let i = from; i <= to; i += 1) next.add(visibleFlat[i].id);
        return next;
      });
      return;
    }

    if (selectedIds.size > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(note.id)) next.delete(note.id);
        else next.add(note.id);
        return next;
      });
      lastSelectedRef.current = index;
      return;
    }

    openExisting(note);
  };

  const handleSave = useCallback(
    async (draft) => {
      if (!api?.notes) return;

      const isEmpty = !draft.title.trim()
        && !stripNoteHtml(draft.body)
        && draft.items.every((i) => !i.text.trim())
        && (draft.attachments || []).length === 0;
      const patchFields = {
        title: draft.title,
        body: draft.body,
        type: draft.type,
        items: draft.items,
        color: draft.color,
        labels: draft.labels,
        pinned: draft.pinned,
        reminder: draft.reminder,
      };

      try {
        if (draft.__isNew) {
          if (createdIdRef.current) {
            await api.notes.update(createdIdRef.current, patchFields);
          } else {
            if (isEmpty) return;
            const { __isNew, ...payload } = draft;
            const created = await api.notes.create(payload);
            createdIdRef.current = created?.id || null;
          }
        } else {
          await api.notes.update(draft.id, patchFields);
        }
        await refresh();
      } catch (_error) {
        showToast('Error al guardar nota');
      }
    },
    [api, refresh, showToast],
  );

  const handleAction = useCallback(
    async (action, note) => {
      if (!api?.notes) return;

      try {
        if (action === 'togglePin') await api.notes.update(note.id, { pinned: !note.pinned });
        if (action === 'archive') await api.notes.archive(note.id);
        if (action === 'unarchive') await api.notes.unarchive(note.id);
        if (action === 'trash') await api.notes.trash(note.id);
        if (action === 'restore') await api.notes.restore(note.id);
        if (action === 'permanentDelete') await api.notes.permanentDelete(note.id);
        if (action === 'duplicate') {
          await api.notes.duplicate(note.id);
          showToast('Nota duplicada');
        }
        if (action === 'copyText') {
          try {
            await navigator.clipboard.writeText(noteToPlainText(note));
            showToast('Texto copiado');
          } catch (_error) {
            showToast('No se pudo copiar');
          }
          return;
        }
        if (action === 'setStatus') {
          await api.notes.update(note.id, { status: note.__nextStatus });
        }
        await refresh();
      } catch (_error) {
        showToast('Error al realizar acción');
      }
    },
    [api, refresh, showToast],
  );

  const handleRemoveLabel = useCallback(
    async (note, label) => {
      try {
        await api?.notes?.update(note.id, { labels: note.labels.filter((l) => l !== label) });
        await refresh();
      } catch (_error) {
        showToast('Error al quitar etiqueta');
      }
    },
    [api, refresh, showToast],
  );

  const handleExport = useCallback(
    async (noteId) => {
      const result = await api?.notes?.exportMarkdown?.(noteId);
      if (result?.markdown) {
        try {
          await navigator.clipboard.writeText(result.markdown);
          showToast('Copiado a portapapeles');
        } catch (_error) {
          showToast('No se pudo copiar');
        }
      }
    },
    [api, showToast],
  );

  // Las imágenes se guardan por noteId en disco: una nota nueva debe existir
  // antes de adjuntar. Persistir on-demand con el mismo createdIdRef del save.
  const ensurePersisted = useCallback(
    async (draft) => {
      if (!draft.__isNew) return draft.id;
      if (createdIdRef.current) return createdIdRef.current;
      const { __isNew, ...payload } = draft;
      const created = await api.notes.create(payload);
      createdIdRef.current = created?.id || null;
      return createdIdRef.current;
    },
    [api],
  );

  // El editor manda un File → validar/persistir en el backend → devolver
  // {src, filename} para insertarlo inline. Toast en caso de error (límite/mime).
  const handleAttachImage = useCallback(
    async (draft, file) => {
      if (!api?.notes?.attachImage) return null;
      const noteId = await ensurePersisted(draft);
      if (!noteId) return null;
      const buffer = await file.arrayBuffer();
      const result = await api.notes.attachImage(noteId, buffer, file.name, file.type);
      if (result?.error) {
        showToast(result.error);
        return null;
      }
      await refresh();
      return { src: buildNoteImageUrl(result.attachment.path), filename: result.attachment.filename };
    },
    [api, ensurePersisted, refresh, showToast],
  );

  const handleRemoveImageBySrc = useCallback(
    async (draft, src) => {
      const noteId = draft.__isNew ? createdIdRef.current : draft.id;
      if (!noteId || !api?.notes?.removeAttachment) return;
      // src → attachment id: matchear por el path codificado en el src.
      const current = await api.notes.get(noteId);
      const att = (current?.attachments || []).find((a) => buildNoteImageUrl(a.path) === src);
      if (att) {
        await api.notes.removeAttachment(noteId, att.id);
        await refresh();
      }
    },
    [api, refresh],
  );

  const handleEmptyTrash = async () => {
    try {
      await api?.notes?.emptyTrash?.();
      await refresh();
    } catch (_error) {
      showToast('Error al vaciar papelera');
    }
  };

  const handleCreateLabel = useCallback(
    async (name) => {
      const result = await api?.notes?.labelsCreate?.(name);
      if (result?.error) return null;
      const updated = await api.notes.labelsList();
      setLabels(Array.isArray(updated) ? updated : []);
      return name.trim();
    },
    [api],
  );

  const submitNewLabelInNav = async () => {
    const name = newLabelName.trim();
    if (!name) return;
    await handleCreateLabel(name);
    setNewLabelName('');
  };

  const submitRename = async () => {
    const to = renameValue.trim();
    try {
      if (to && to !== renamingLabel) {
        await api?.notes?.labelsRename?.(renamingLabel, to);
      }
      setRenamingLabel(null);
      setRenameValue('');
      await refresh();
    } catch (_error) {
      setRenamingLabel(null);
      setRenameValue('');
      showToast('Error al renombrar etiqueta');
    }
  };

  const confirmDeleteLabel = async () => {
    try {
      await api?.notes?.labelsDelete?.(deletingLabel);
      if (labelFilters.includes(deletingLabel)) setLabelFilters((prev) => prev.filter((l) => l !== deletingLabel));
      setDeletingLabel(null);
      await refresh();
    } catch (_error) {
      setDeletingLabel(null);
      showToast('Error al eliminar etiqueta');
    }
  };

  const handleQuickNoteSubmit = async () => {
    if (!quickNote.text.trim()) return;
    const payload = quickNote.type === 'checklist'
      ? { type: 'checklist', color: quickNote.color, pinned: quickNote.pinned, items: quickNote.text.split('\n').filter(Boolean).map((t) => ({ text: t, done: false })) }
      : { type: 'text', color: quickNote.color, pinned: quickNote.pinned, body: quickNote.text };
    try {
      await api?.notes?.create(payload);
      setQuickNote({ text: '', type: 'text', color: 'neutral', pinned: false });
      await refresh();
    } catch (_error) {
      showToast('Error al crear nota rápida');
    }
  };

  // Bulk operations sobre la selección.
  const runBulk = async (action, payload) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      await api?.notes?.bulkAction?.(ids, action, payload);
      clearSelection();
      setOpenMenu(null);
      await refresh();
    } catch (_error) {
      showToast('Error en acción masiva');
    }
  };

  const closeEditor = () => setEditing(null);

  // ── Keyboard shortcuts globales ──────────────────────────────
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };

    const onKey = (event) => {
      // Esc funciona incluso escribiendo (blur + limpiar).
      if (event.key === 'Escape') {
        if (editing) return; // el modal maneja su propio Esc
        if (showHelp) { setShowHelp(false); return; }
        if (openMenu) { setOpenMenu(null); return; }
        if (selectedIds.size > 0) { clearSelection(); return; }
        if (search) { setSearch(''); return; }
        return;
      }

      if (editing || isTyping()) return;

      const focusedNote = focusedIndex >= 0 ? visibleFlat[focusedIndex] : null;

      if (event.key === 'c' || event.key === 'C') { event.preventDefault(); openNew('text'); }
      else if (event.key === 'l' || event.key === 'L') { event.preventDefault(); openNew('checklist'); }
      else if (event.key === '/') { event.preventDefault(); searchRef.current?.focus(); }
      else if (event.key === '?') { event.preventDefault(); setShowHelp(true); }
      else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); setFocusedIndex((i) => Math.min(visibleFlat.length - 1, i + 1)); }
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); setFocusedIndex((i) => Math.max(0, i - 1)); }
      else if (event.key === 'Enter' && focusedNote) { event.preventDefault(); openExisting(focusedNote); }
      else if ((event.ctrlKey || event.metaKey) && (event.key === 'd' || event.key === 'D') && focusedNote) { event.preventDefault(); handleAction('duplicate', focusedNote); }
      else if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'C') && focusedNote && !window.getSelection()?.toString()) { event.preventDefault(); handleAction('copyText', focusedNote); }
      else if ((event.key === 'e' || event.key === 'E') && focusedNote && view === 'active') { event.preventDefault(); handleAction('archive', focusedNote); }
      else if (event.key === '#' && focusedNote && view !== 'trashed') { event.preventDefault(); handleAction('trash', focusedNote); }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, showHelp, openMenu, selectedIds, search, focusedIndex, visibleFlat, view, clearSelection, handleAction]);

  // Focus visible fuera de rango tras un refresh → resetear.
  useEffect(() => {
    if (focusedIndex >= visibleFlat.length) setFocusedIndex(-1);
  }, [visibleFlat.length, focusedIndex]);

  const pinned = useMemo(() => notes.filter((n) => n.pinned), [notes]);
  const others = useMemo(() => notes.filter((n) => !n.pinned), [notes]);
  const labelCounts = useMemo(() => {
    // Conteo global de cada etiqueta (sobre las notas cargadas de la vista).
    const map = {};
    for (const note of notes) for (const l of note.labels) map[l] = (map[l] || 0) + 1;
    return map;
  }, [notes]);

  // El margen entre cards baja al wrapper de motion: con [&>*]:mb-4 el selector
  // seguiria pegandole al motion.div, pero conviene tenerlo explicito ahora que
  // el hijo directo dejo de ser la NoteCard.
  const gridClass = viewMode === 'grid'
    ? 'columns-1 gap-4 sm:columns-2 xl:columns-3'
    : 'flex flex-col gap-3';

  const renderCards = (list) => (
    // La key por vista fuerza el remonte al saltar de activas a archivadas o
    // papelera: el set entero vuelve a entrar en cascada y marca el cambio.
    <div key={`${view}-${viewMode}`} className={gridClass}>
      <AnimatePresence>
        {list.map((note, index) => (
          <motion.div
            key={note.id}
            // columns CSS posiciona por flow: framer no puede hacer FLIP real en
            // un masonry, asi que el layout queda fuera y solo entra/sale.
            layout={false}
            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{
              duration: reduced ? 0 : 0.18,
              delay: reduced ? 0 : Math.min(index * 0.03, 0.3),
              ease: EASE,
            }}
            className={viewMode === 'grid' ? 'mb-4' : ''}
            style={{ breakInside: viewMode === 'grid' ? 'avoid' : undefined }}
          >
            <NoteCard
              note={note}
              view={view}
              selected={selectedIds.has(note.id)}
              selectionActive={selectedIds.size > 0}
              focused={visibleFlat[focusedIndex]?.id === note.id}
              onCardClick={handleCardClick}
              onOpen={openExisting}
              onAction={handleAction}
              onRemoveLabel={handleRemoveLabel}
              listMode={viewMode === 'list'}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  const filterChipActive = (arr) => arr.length > 0;

  const toggleIn = (setter, value) => setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 12rem)' }} onClick={() => openMenu && setOpenMenu(null)}>
      {/* Nav interno */}
      <aside className="w-48 shrink-0 border-r pr-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <nav className="space-y-0.5">
          {VIEWS.map((entry) => {
            const Icon = entry.icon;
            const isActive = view === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => { setView(entry.id); clearSelection(); }}
                className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm"
                style={{
                  color: isActive ? 'var(--text-strong)' : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 500,
                  borderLeftWidth: '2px',
                  borderLeftStyle: 'solid',
                  borderLeftColor: isActive ? 'var(--accent)' : 'transparent',
                  background: isActive ? 'color-mix(in srgb, var(--text-strong) 4%, transparent)' : 'transparent',
                }}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                {entry.label}
              </button>
            );
          })}
        </nav>

        {/* Gestión de etiquetas */}
        <div className="mt-6">
          <p className="px-2.5 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
            Etiquetas
          </p>
          <div className="mt-1 space-y-0.5">
            {labels.map((label) => {
              const isActive = labelFilters.includes(label);
              if (renamingLabel === label) {
                return (
                  <input
                    key={label}
                    type="text"
                    value={renameValue}
                    autoFocus
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={submitRename}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitRename();
                      if (event.key === 'Escape') { setRenamingLabel(null); setRenameValue(''); }
                    }}
                    className="field w-full px-2 py-1 text-xs"
                    style={{ color: 'var(--text-strong)' }}
                  />
                );
              }
              return (
                <div key={label} className="group/lbl flex items-center gap-1 px-2.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => { setView('active'); toggleIn(setLabelFilters, label); }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs"
                    style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                  >
                    <Tag className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{label}</span>
                    {labelCounts[label] ? (
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)' }}>{labelCounts[label]}</span>
                    ) : null}
                  </button>
                  <button type="button" onClick={() => { setRenamingLabel(label); setRenameValue(label); }} aria-label={`Renombrar ${label}`} className="opacity-0 group-hover/lbl:opacity-100" style={{ color: 'var(--text-muted)' }}>
                    <Pencil className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                  <button type="button" onClick={() => setDeletingLabel(label)} aria-label={`Eliminar ${label}`} className="opacity-0 group-hover/lbl:opacity-100" style={{ color: 'var(--text-muted)' }}>
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              );
            })}
            <div className="flex items-center gap-1 px-2.5 pt-1">
              <input
                type="text"
                value={newLabelName}
                onChange={(event) => setNewLabelName(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') submitNewLabelInNav(); }}
                placeholder="Nueva etiqueta"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                style={{ color: 'var(--text-strong)' }}
              />
              <button type="button" onClick={submitNewLabelInNav} aria-label="Crear etiqueta" style={{ color: 'var(--accent)' }}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido */}
      <div className="min-w-0 flex-1 pl-6">
        <div className="flex flex-wrap items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="field relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar notas... ( / )"
              className="w-full bg-transparent px-3 py-2 pl-9 text-sm outline-none"
              style={{ color: 'var(--text-strong)' }}
            />
          </div>

          {/* Filter chips */}
          <FilterChip label="Color" active={filterChipActive(colorFilters)} open={openMenu === 'color'} onToggle={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'color' ? null : 'color'); }}>
            <div className="flex flex-wrap gap-1.5 p-2" style={{ width: '132px' }}>
              {NOTE_COLORS.map((color) => (
                <button key={color.id} type="button" onClick={(e) => { e.stopPropagation(); toggleIn(setColorFilters, color.id); }} aria-label={color.label} title={color.label} className="h-5 w-5" style={{ background: color.hex, borderRadius: 'var(--radius-badge, 0px)', outline: colorFilters.includes(color.id) ? '2px solid var(--text-strong)' : 'none', outlineOffset: '1px' }} />
              ))}
            </div>
          </FilterChip>

          <FilterChip label="Etiquetas" active={filterChipActive(labelFilters)} open={openMenu === 'label'} onToggle={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'label' ? null : 'label'); }}>
            <div className="max-h-48 w-44 overflow-y-auto p-1">
              {labels.length === 0 ? <p className="px-2 py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>Sin etiquetas.</p> : labels.map((label) => (
                <button key={label} type="button" onClick={(e) => { e.stopPropagation(); toggleIn(setLabelFilters, label); }} className="row-hover flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs" style={{ color: 'var(--text-normal)' }}>
                  <span style={{ color: labelFilters.includes(label) ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {labelFilters.includes(label) ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </FilterChip>

          <FilterChip label="Tipo" active={filterChipActive(typeFilters)} open={openMenu === 'type'} onToggle={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'type' ? null : 'type'); }}>
            <div className="w-32 p-1">
              {TYPE_OPTIONS.map((t) => (
                <button key={t.id} type="button" onClick={(e) => { e.stopPropagation(); toggleIn(setTypeFilters, t.id); }} className="row-hover flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs" style={{ color: 'var(--text-normal)' }}>
                  <span style={{ color: typeFilters.includes(t.id) ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {typeFilters.includes(t.id) ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </FilterChip>

          <FilterChip label="Estado" active={filterChipActive(statusFilters)} open={openMenu === 'status'} onToggle={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'status' ? null : 'status'); }}>
            <div className="w-40 p-1">
              {NOTE_STATUSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleIn(setStatusFilters, s.id); }}
                  className="row-hover flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs"
                  style={{ color: 'var(--text-normal)' }}
                >
                  <span style={{ color: statusFilters.includes(s.id) ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {statusFilters.includes(s.id) ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  </span>
                  <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0" style={{ background: s.hex, borderRadius: 'var(--radius-badge, 0px)' }} />
                  {s.label}
                </button>
              ))}
            </div>
          </FilterChip>

          {/* Sort dropdown */}
          <div className="relative">
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'sort' ? null : 'sort'); }} className="btn-outline inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold">
              {SORT_OPTIONS.find((s) => s.id === sortBy)?.label}
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            {openMenu === 'sort' ? (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 border" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}>
                {SORT_OPTIONS.map((option) => (
                  <button key={option.id} type="button" onClick={(e) => { e.stopPropagation(); handleSort(option.id); }} className="row-hover flex w-full items-center justify-between px-3 py-2 text-left text-xs" style={{ color: sortBy === option.id ? 'var(--accent)' : 'var(--text-normal)' }}>
                    {option.label}
                    {sortBy === option.id ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-px border" style={{ borderColor: 'var(--border-normal)', borderRadius: 'var(--radius-button, 0px)' }}>
            <button type="button" onClick={() => handleViewMode('grid')} aria-label="Vista grid" className="p-2" style={{ background: viewMode === 'grid' ? 'var(--accent)' : 'transparent', color: viewMode === 'grid' ? 'var(--on-accent)' : 'var(--text-muted)' }}>
              <LayoutGrid className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => handleViewMode('list')} aria-label="Vista lista" className="p-2" style={{ background: viewMode === 'list' ? 'var(--accent)' : 'transparent', color: viewMode === 'list' ? 'var(--on-accent)' : 'var(--text-muted)' }}>
              <List className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          <button type="button" onClick={() => openNew('text')} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Nueva nota
          </button>
        </div>

        <motion.div key={view} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.2, ease: EASE }} className="mt-5 pb-16">
          {view === 'active' ? (
            <QuickNoteRow quickNote={quickNote} setQuickNote={setQuickNote} onSubmit={handleQuickNoteSubmit} />
          ) : null}

          {view === 'trashed' ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                Las notas en la papelera se vacían tras 30 días.
              </p>
              {notes.length > 0 ? (
                <button type="button" onClick={handleEmptyTrash} className="btn-outline btn-outline-accent px-3 py-1.5 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  Vaciar papelera
                </button>
              ) : null}
            </div>
          ) : null}

          {!loaded ? null : notes.length === 0 ? (
            <div className="flex min-h-[36vh] flex-col items-start justify-center border border-dashed p-8" style={{ borderColor: 'var(--border-subtle)', borderRadius: 'var(--radius-card, 0px)' }}>
              <StickyNote className="h-7 w-7" strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
              <h2 className="mt-4 font-extrabold" style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)', fontSize: 'clamp(28px, 4vw, 40px)', letterSpacing: '-0.02em' }}>
                {view === 'active' && !search && !colorFilters.length && !labelFilters.length && !typeFilters.length ? 'Aún no hay notas' : 'Nada por aquí'}
              </h2>
              <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
                {view === 'active' ? 'Crea tu primera nota o usa la fila rápida de arriba.' : view === 'archived' ? 'Las notas que archives aparecerán aquí.' : 'La papelera está vacía.'}
              </p>
            </div>
          ) : view === 'active' && pinned.length > 0 ? (
            <div className="space-y-6">
              <section>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Fijadas</p>
                {renderCards(pinned)}
              </section>
              {others.length > 0 ? (
                <section className="border-t pt-6" style={{ borderColor: 'var(--border-subtle)' }}>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Otras</p>
                  {renderCards(others)}
                </section>
              ) : null}
            </div>
          ) : (
            renderCards(notes)
          )}
        </motion.div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.18, ease: EASE }}
          className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t px-6"
          style={{ height: '48px', borderColor: 'var(--border-normal)', background: 'var(--bg-card)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
            {selectedIds.size} {selectedIds.size === 1 ? 'nota' : 'notas'}
          </span>
          <div className="flex-1" />
          <div className="relative">
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'bulkColor' ? null : 'bulkColor'); }} className="btn-outline px-3 py-1.5 text-xs font-semibold">Color</button>
            {openMenu === 'bulkColor' ? (
              <div className="absolute bottom-full right-0 mb-2 flex flex-wrap gap-1.5 border p-2" style={{ width: '132px', borderColor: 'var(--border-normal)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}>
                {NOTE_COLORS.map((color) => (
                  <button key={color.id} type="button" onClick={(e) => { e.stopPropagation(); runBulk('color', { color: color.id }); }} aria-label={color.label} className="h-5 w-5" style={{ background: color.hex, borderRadius: 'var(--radius-badge, 0px)' }} />
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative">
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'bulkLabel' ? null : 'bulkLabel'); }} className="btn-outline px-3 py-1.5 text-xs font-semibold">Etiqueta</button>
            {openMenu === 'bulkLabel' ? (
              <div className="absolute bottom-full right-0 mb-2 max-h-40 w-40 overflow-y-auto border p-1" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}>
                {labels.length === 0 ? <p className="px-2 py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>Sin etiquetas.</p> : labels.map((label) => (
                  <button key={label} type="button" onClick={(e) => { e.stopPropagation(); runBulk('label-add', { label }); }} className="row-hover w-full px-2 py-1.5 text-left text-xs" style={{ color: 'var(--text-normal)' }}>{label}</button>
                ))}
              </div>
            ) : null}
          </div>
          {view !== 'archived' ? (
            <button type="button" onClick={() => runBulk('archive')} className="btn-outline px-3 py-1.5 text-xs font-semibold">Archivar</button>
          ) : (
            <button type="button" onClick={() => runBulk('unarchive')} className="btn-outline px-3 py-1.5 text-xs font-semibold">Desarchivar</button>
          )}
          <button type="button" onClick={() => runBulk('trash')} className="btn-outline btn-outline-accent px-3 py-1.5 text-xs font-semibold" style={{ color: 'var(--accent)' }}>Eliminar</button>
          <button type="button" onClick={clearSelection} className="btn-outline px-3 py-1.5 text-xs font-semibold">Cancelar</button>
        </motion.div>
      ) : null}

      {/* Toast */}
      {editing ? (
        <NoteEditorModal
          note={editing}
          labels={labels}
          onSave={handleSave}
          onClose={closeEditor}
          onArchive={view !== 'trashed' ? (draft) => handleAction(draft.archived ? 'unarchive' : 'archive', draft) : undefined}
          onTrash={view !== 'trashed' ? (draft) => handleAction('trash', draft) : undefined}
          onCreateLabel={handleCreateLabel}
          onExport={createdIdRef.current || !editing.__isNew ? () => handleExport(createdIdRef.current || editing.id) : undefined}
          onAttachImage={handleAttachImage}
          onRemoveImage={handleRemoveImageBySrc}
          onToast={showToast}
        />
      ) : null}

      {/* Después de los modales y por encima de ellos: con z-50 y antes en el
          DOM, el overlay del editor lo tapaba y los errores de guardado se leían
          a través de un velo negro. */}
      {toast ? (
        <div className="fixed bottom-16 left-1/2 z-[70] -translate-x-1/2 border px-4 py-2 text-xs" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-card)', color: 'var(--text-strong)', fontFamily: 'var(--font-mono, monospace)', borderRadius: 'var(--radius-card, 0px)' }}>
          {toast}
        </div>
      ) : null}

      {/* Modal confirmación borrar etiqueta */}
      {deletingLabel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0, 0, 0, 0.4)' }} onClick={() => setDeletingLabel(null)}>
          <motion.div initial={reduced ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduced ? 0 : 0.18, ease: EASE }} role="dialog" aria-modal="true" className="w-full max-w-md border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--accent)' }}>Confirmar</p>
            <h4 className="mt-2 text-xl font-extrabold" style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)', letterSpacing: '-0.02em' }}>Eliminar etiqueta «{deletingLabel}»</h4>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
              Se quitará de {labelCounts[deletingLabel] || 0} {(labelCounts[deletingLabel] || 0) === 1 ? 'nota' : 'notas'}. Las notas no se eliminan.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setDeletingLabel(null)} className="btn-outline px-4 py-2 text-sm font-semibold">Cancelar</button>
              <button type="button" onClick={confirmDeleteLabel} className="btn-primary px-4 py-2 text-sm font-semibold">Eliminar etiqueta</button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {/* Modal ayuda de atajos */}
      {showHelp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0, 0, 0, 0.4)' }} onClick={() => setShowHelp(false)}>
          <motion.div initial={reduced ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduced ? 0 : 0.18, ease: EASE }} role="dialog" aria-modal="true" aria-label="Atajos de teclado" className="w-full max-w-md border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }} onClick={(e) => e.stopPropagation()}>
            <h4 className="text-xl font-extrabold" style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-display, sans-serif)', letterSpacing: '-0.02em' }}>Atajos de teclado</h4>
            <table className="mt-4 w-full text-sm">
              <tbody>
                {SHORTCUTS.map(([key, desc]) => (
                  <tr key={key} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="py-1.5 pr-4" style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>{key}</td>
                    <td className="py-1.5" style={{ color: 'var(--text-normal)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setShowHelp(false)} className="btn-outline px-4 py-2 text-sm font-semibold">Cerrar</button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({ label, active, open, onToggle, children }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 border px-3 py-2 text-xs font-semibold"
        style={{
          borderColor: active ? 'var(--accent)' : 'var(--border-normal)',
          background: active ? 'var(--accent)' : 'transparent',
          color: active ? 'var(--on-accent)' : 'var(--text-muted)',
          borderRadius: 'var(--radius-button, 0px)',
        }}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 border" style={{ borderColor: 'var(--border-normal)', background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }} onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function QuickNoteRow({ quickNote, setQuickNote, onSubmit }) {
  const patch = (fields) => setQuickNote((prev) => ({ ...prev, ...fields }));

  return (
    <div
      className="mb-6 flex items-center gap-2 border p-2"
      style={{ borderTopColor: 'var(--border-subtle)', borderRightColor: 'var(--border-subtle)', borderBottomColor: 'var(--border-subtle)', borderLeftWidth: '3px', borderLeftColor: noteColorHex(quickNote.color), background: 'var(--bg-card)', borderRadius: 'var(--radius-card, 0px)' }}
    >
      <input
        type="text"
        value={quickNote.text}
        onChange={(event) => patch({ text: event.target.value })}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSubmit(); } }}
        onBlur={() => { if (quickNote.text.trim()) onSubmit(); }}
        placeholder="Escribe una nota..."
        className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
        style={{ color: 'var(--text-strong)' }}
      />
      <button type="button" onClick={() => patch({ type: quickNote.type === 'text' ? 'checklist' : 'text' })} aria-label="Convertir tipo" className="p-1.5" style={{ color: quickNote.type === 'checklist' ? 'var(--accent)' : 'var(--text-muted)' }}>
        <Check className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <div className="flex items-center gap-0.5">
        {NOTE_COLORS.slice(0, 6).map((color) => (
          <button key={color.id} type="button" onClick={() => patch({ color: color.id })} aria-label={color.label} title={color.label} className="h-3.5 w-3.5" style={{ background: color.hex, borderRadius: 'var(--radius-badge, 0px)', outline: quickNote.color === color.id ? '2px solid var(--text-strong)' : 'none', outlineOffset: '1px' }} />
        ))}
      </div>
      <button type="button" onClick={() => patch({ pinned: !quickNote.pinned })} aria-label="Fijar" className="p-1.5" style={{ color: quickNote.pinned ? 'var(--accent)' : 'var(--text-muted)' }}>
        <Pin className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default Notas;
