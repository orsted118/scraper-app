import { FileDown, Image as ImageIcon, ImageOff, MoreVertical, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { TrackCover } from '../BottomPlayerBar';
import TrackContextMenu from '../TrackContextMenu';
import EmptyMessage from './EmptyMessage';
import { formatDuration, formatTotalDuration } from '../../utils/format';
import { matchesQuery } from '../../utils/search';

// La portada custom manda; si no hay, se usa la del primer track que tenga una;
// si tampoco, TrackCover dibuja su placeholder.
function resolveCover(playlist, byPath) {
  if (playlist.coverPath) {
    return { coverPath: playlist.coverPath };
  }

  const firstWithCover = playlist.tracks.map((path) => byPath.get(path)).find((track) => track?.coverPath);
  return { coverPath: firstWithCover?.coverPath || null };
}

function PlaylistsView({ tracks = [], search = '', playlists: store, onPlay }) {
  const [expandedId, setExpandedId] = useState(null);
  const [draftName, setDraftName] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [notice, setNotice] = useState('');
  const dragFromRef = useRef(null);

  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const byPath = useMemo(() => new Map(tracks.map((track) => [track.path, track])), [tracks]);
  const needle = search.trim();

  // El filtro busca por nombre de playlist y no por sus pistas: una playlist es
  // una unidad curada, no una agrupación derivada como álbumes o artistas.
  const visible = useMemo(
    () => (needle ? store.playlists.filter((entry) => matchesQuery(entry.name, needle)) : store.playlists),
    [store.playlists, needle],
  );

  const expanded = store.playlists.find((entry) => entry.id === expandedId) || null;

  const statsFor = (playlist) => {
    const resolved = playlist.tracks.map((path) => byPath.get(path)).filter(Boolean);
    const total = resolved.reduce((sum, track) => sum + (track.duration || 0), 0);
    return [
      `${playlist.tracks.length} pista${playlist.tracks.length === 1 ? '' : 's'}`,
      formatTotalDuration(total) || null,
    ]
      .filter(Boolean)
      .join(' · ');
  };

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2200);
  };

  const handleCreate = async () => {
    const name = String(draftName || '').trim();
    if (!name) return;

    const created = await store.create(name);
    setDraftName(null);
    if (created) setExpandedId(created.id);
  };

  const handleImport = async () => {
    if (!api?.playlists?.pickM3u) return;

    const filePath = await api.playlists.pickM3u();
    if (!filePath) return;

    const result = await store.importM3u(filePath);

    if (!result) {
      flash('No fue posible importar el M3U.');
      return;
    }

    setExpandedId(result.playlist.id);
    flash(
      result.unmatchedCount > 0
        ? `${result.matchedCount} pistas importadas · ${result.unmatchedCount} sin coincidencia en la biblioteca`
        : `${result.matchedCount} pistas importadas`,
    );
  };

  const handlePickCover = async (playlist) => {
    if (!api?.playlists?.pickImage) return;

    const filePath = await api.playlists.pickImage();
    if (!filePath) return;

    const bytes = await api.playlists.readImage(filePath);
    if (!bytes) {
      flash('No fue posible leer la imagen.');
      return;
    }

    await store.setCover(playlist.id, bytes, filePath);
  };

  const handleDelete = async (playlist) => {
    // confirm nativo: borrar una playlist no se deshace y no hay papelera.
    if (!window.confirm(`¿Eliminar la playlist «${playlist.name}»? No se puede deshacer.`)) return;

    // Cerrar el expand antes de borrar, si no queda apuntando a un id muerto.
    setExpandedId(null);
    setEditingName(false);
    await store.remove(playlist.id);
  };

  const handleDrop = (toIndex) => {
    const fromIndex = dragFromRef.current;
    dragFromRef.current = null;
    if (fromIndex === null || fromIndex === toIndex || !expanded) return;
    store.reorder(expanded.id, fromIndex, toIndex);
  };

  const playFrom = (playlist, index) => {
    const resolved = playlist.tracks.map((path) => byPath.get(path)).filter(Boolean);
    if (resolved.length === 0) return;

    // El índice viene de la lista completa (con faltantes); se traduce a la
    // lista reproducible para no arrancar en la pista equivocada.
    const target = byPath.get(playlist.tracks[index]);
    const playIndex = target ? resolved.findIndex((track) => track.path === target.path) : 0;
    onPlay(resolved, playIndex < 0 ? 0 : playIndex);
  };

  const menuActions = (playlist) => [
    { key: 'rename', label: 'Renombrar', Icon: Pencil, onClick: () => setEditingName(true) },
    { key: 'cover', label: 'Cambiar portada', Icon: ImageIcon, onClick: () => handlePickCover(playlist) },
    ...(playlist.coverPath
      ? [{ key: 'cover-off', label: 'Quitar portada', Icon: ImageOff, onClick: () => store.removeCover(playlist.id) }]
      : []),
    { key: 'delete', label: 'Eliminar playlist', Icon: Trash2, onClick: () => handleDelete(playlist), separated: true },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <p
          className="text-xs font-bold uppercase"
          style={{
            color: 'var(--text-muted)',
            letterSpacing: '0.14em',
            fontFamily: 'var(--font-mono, monospace)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {notice || `${store.playlists.length} playlist${store.playlists.length === 1 ? '' : 's'}`}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {draftName === null ? (
            <button
              type="button"
              onClick={() => setDraftName('')}
              className="btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              Nueva playlist
            </button>
          ) : (
            <div className="field relative flex items-center">
              <input
                autoFocus
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleCreate();
                  if (event.key === 'Escape') setDraftName(null);
                }}
                placeholder="Nombre de la playlist..."
                aria-label="Nombre de la playlist nueva"
                className="w-full bg-transparent px-3 py-1.5 text-xs outline-none"
                style={{ color: 'var(--text-strong)', width: '200px' }}
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={!draftName.trim()}
                className="btn-primary shrink-0 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Crear
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleImport}
            className="btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
          >
            <FileDown className="h-3.5 w-3.5" strokeWidth={1.5} />
            Importar M3U
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyMessage
          title={needle ? `Sin playlists para «${needle}»` : 'Aún no tenés playlists'}
          detail={needle ? undefined : 'Creá una con «Nueva playlist» o importá un M3U.'}
        />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {visible.map((playlist) => {
            const isExpanded = playlist.id === expandedId;

            return (
              <button
                key={playlist.id}
                type="button"
                onClick={() => {
                  setExpandedId(isExpanded ? null : playlist.id);
                  setEditingName(false);
                }}
                aria-expanded={isExpanded}
                className="text-left"
              >
                <div
                  style={{
                    // outline y no border: no empuja el layout del grid.
                    outline: isExpanded ? '1px solid var(--accent)' : '1px solid transparent',
                  }}
                  onMouseEnter={(event) => {
                    if (!isExpanded) event.currentTarget.style.outline = '1px solid var(--border-normal)';
                  }}
                  onMouseLeave={(event) => {
                    if (!isExpanded) event.currentTarget.style.outline = '1px solid transparent';
                  }}
                >
                  <TrackCover track={resolveCover(playlist, byPath)} size={220} />
                </div>
                <p
                  className="mt-2 truncate font-bold"
                  style={{
                    color: isExpanded ? 'var(--accent)' : 'var(--text-strong)',
                    fontFamily: 'var(--font-display, sans-serif)',
                    fontSize: '15px',
                    letterSpacing: '-0.01em',
                  }}
                  title={playlist.name}
                >
                  {playlist.name}
                </p>
                <p
                  className="mt-0.5 truncate"
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '12px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {statsFor(playlist)}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {expanded ? (
        <section className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border-normal)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {editingName ? (
              <input
                autoFocus
                type="text"
                defaultValue={expanded.name}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    store.rename(expanded.id, event.currentTarget.value);
                    setEditingName(false);
                  }
                  if (event.key === 'Escape') setEditingName(false);
                }}
                onBlur={(event) => {
                  store.rename(expanded.id, event.currentTarget.value);
                  setEditingName(false);
                }}
                aria-label="Nombre de la playlist"
                className="field px-3 py-1.5 font-extrabold"
                style={{
                  color: 'var(--text-strong)',
                  fontFamily: 'var(--font-display, sans-serif)',
                  fontSize: '22px',
                  letterSpacing: '-0.02em',
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                title="Renombrar playlist"
                className="text-left font-extrabold"
                style={{
                  color: 'var(--text-strong)',
                  fontFamily: 'var(--font-display, sans-serif)',
                  fontSize: '22px',
                  letterSpacing: '-0.02em',
                }}
              >
                {expanded.name}
              </button>
            )}

            <div className="flex items-center gap-3">
              <p
                className="text-xs"
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {statsFor(expanded)}
              </p>

              <button
                type="button"
                onClick={() => playFrom(expanded, 0)}
                disabled={expanded.tracks.length === 0}
                className="btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                Reproducir todo
              </button>

              <button
                type="button"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setMenuAnchor({ x: rect.left, y: rect.bottom });
                }}
                aria-label="Opciones de la playlist"
                aria-haspopup="menu"
                title="Opciones"
                className="inline-flex h-8 w-8 items-center justify-center border"
                style={{
                  borderColor: 'var(--border-normal)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-normal)',
                  borderRadius: 'var(--radius-button, 0px)',
                }}
              >
                <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setExpandedId(null);
                  setEditingName(false);
                }}
                aria-label="Cerrar playlist"
                title="Cerrar"
                className="inline-flex h-8 w-8 items-center justify-center"
                style={{ color: 'var(--text-muted)', borderRadius: 'var(--radius-button, 0px)' }}
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="mt-3">
            {expanded.tracks.length === 0 ? (
              <EmptyMessage
                title="Playlist vacía"
                detail="Agregá canciones desde el menú contextual de cualquier pista."
              />
            ) : (
              expanded.tracks.map((trackPath, index) => {
                const track = byPath.get(trackPath);
                // La pista puede no estar en la biblioteca: unidad desmontada o
                // archivo movido. Se muestra apagada y sin acción, nunca se
                // borra sola — el usuario puede querer recuperarla.
                const missing = !track;

                return (
                  <div
                    key={`${trackPath}-${index}`}
                    draggable
                    onDragStart={() => {
                      dragFromRef.current = index;
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className="group row-hover flex w-full items-center gap-4 border-t"
                    style={{ borderTopColor: 'var(--border-subtle)', paddingLeft: '12px' }}
                  >
                    <button
                      type="button"
                      onClick={() => !missing && playFrom(expanded, index)}
                      disabled={missing}
                      className="flex min-w-0 flex-1 items-center gap-4 py-3 text-left disabled:cursor-default"
                    >
                      <span
                        className="w-6 shrink-0 text-right text-xs"
                        style={{
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-bold"
                          style={{
                            color: missing ? 'var(--text-muted)' : 'var(--text-strong)',
                            fontFamily: 'var(--font-display, sans-serif)',
                            fontSize: '18px',
                            letterSpacing: '-0.01em',
                          }}
                          title={trackPath}
                        >
                          {track?.title || trackPath.split(/[\\/]/).pop()}
                        </p>
                        <p
                          className="mt-0.5 truncate"
                          style={{
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '13px',
                          }}
                        >
                          {missing ? 'No disponible' : track.artist}
                        </p>
                      </div>
                    </button>

                    <p
                      className="shrink-0 text-right text-xs"
                      style={{
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {missing ? '' : formatDuration(track.duration)}
                    </p>

                    <button
                      type="button"
                      onClick={() => store.removeTrack(expanded.id, trackPath)}
                      aria-label={`Quitar ${track?.title || 'pista'} de la playlist`}
                      title="Quitar de la playlist"
                      className="shrink-0 p-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      style={{ color: 'var(--text-muted)', borderRadius: 'var(--radius-button, 0px)' }}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                );
              })
            )}
            <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }} />
          </div>
        </section>
      ) : null}

      {menuAnchor && expanded ? (
        <TrackContextMenu
          x={menuAnchor.x}
          y={menuAnchor.y}
          actions={menuActions(expanded)}
          onClose={() => setMenuAnchor(null)}
        />
      ) : null}
    </div>
  );
}

export default PlaylistsView;
