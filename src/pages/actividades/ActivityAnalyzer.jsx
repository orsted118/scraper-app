import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ListChecks,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';
import { EASE } from '../../utils/motion';

const ACCEPTED = '.pdf,.docx';

// El acento marca lo cumplido; el resto usa los tokens de estado del tema. No
// hay token propio para "parcial", así que reusa el de retrasada (ámbar).
const MET_PRESENTATION = {
  yes: { Icon: CheckCircle2, color: 'var(--accent)', label: 'Cumple' },
  no: { Icon: XCircle, color: 'var(--error-text)', label: 'No cumple' },
  partial: { Icon: AlertCircle, color: 'var(--retrasada-text)', label: 'Parcial' },
  unclear: { Icon: HelpCircle, color: 'var(--text-muted)', label: 'Sin determinar' },
};

function Banner({ message }) {
  if (!message) return null;

  return (
    <div
      className="flex items-start gap-3 border px-4 py-3 text-sm"
      style={{
        background: 'var(--error-bg)',
        borderColor: 'var(--error-border)',
        color: 'var(--error-text)',
        borderRadius: 'var(--radius-card, 0px)',
      }}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function RequirementsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="animate-pulse border-l py-3 pl-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="h-3 w-2/3" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="mt-2 h-2 w-1/3" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      ))}
    </div>
  );
}

function TypeBadge({ type }) {
  return (
    <span
      className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]"
      style={{
        background: 'var(--bg-tertiary)',
        color: 'var(--text-muted)',
        borderRadius: 'var(--radius-badge, 0px)',
      }}
    >
      {type}
    </span>
  );
}

function ActivityAnalyzer({ activity }) {
  const reduced = useReducedMotion();
  const api = typeof window !== 'undefined' ? window.scraperApp : null;
  const fileInputRef = useRef(null);

  const [status, setStatus] = useState('idle');
  const [requirements, setRequirements] = useState([]);
  const [error, setError] = useState('');
  const [verifyStatus, setVerifyStatus] = useState('idle');
  const [verifyError, setVerifyError] = useState('');
  const [results, setResults] = useState([]);
  const [submissionMeta, setSubmissionMeta] = useState(null);

  const handleAnalyze = async () => {
    if (!api?.analyzer) {
      setStatus('error');
      setError('El analizador solo funciona dentro de DVPotro.');
      return;
    }

    setStatus('analyzing');
    setError('');

    try {
      const response = await api.analyzer.extractRequirements(activity);

      if (!response?.ok) {
        setStatus('error');
        setError(response?.error || 'No fue posible analizar la consigna.');
        return;
      }

      setRequirements(response.requirements || []);
      setStatus('done');
    } catch (_error) {
      setStatus('error');
      setError('No fue posible analizar la consigna.');
    }
  };

  const handleFile = async (file) => {
    if (!file || !api?.analyzer) {
      return;
    }

    setVerifyStatus('verifying');
    setVerifyError('');
    setResults([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsed = await api.analyzer.parseFile({ arrayBuffer, filename: file.name });

      if (!parsed?.ok) {
        setVerifyStatus('error');
        setVerifyError(parsed?.error || 'No fue posible leer el archivo.');
        return;
      }

      const verified = await api.analyzer.verifySubmission(requirements, parsed.submission, activity?.id);

      if (!verified?.ok) {
        setVerifyStatus('error');
        setVerifyError(verified?.error || 'No fue posible verificar la entrega.');
        return;
      }

      setSubmissionMeta({ name: file.name, ...parsed.submission, text: undefined });
      setResults(verified.results || []);
      setVerifyStatus('done');
    } catch (_error) {
      setVerifyStatus('error');
      setVerifyError('No fue posible procesar la entrega.');
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    handleFile(event.dataTransfer?.files?.[0]);
  };

  if (status === 'idle') {
    return (
      <div className="border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          type="button"
          onClick={handleAnalyze}
          className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]"
        >
          <ListChecks className="h-4 w-4" />
          Analizar requisitos
        </button>
      </div>
    );
  }

  if (status === 'analyzing') {
    return (
      <div className="border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <p
          className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--text-muted)' }}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Leyendo la consigna
        </p>
        <RequirementsSkeleton />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <Banner message={error} />
        <button
          type="button"
          onClick={handleAnalyze}
          className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]"
        >
          <ListChecks className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    );
  }

  const resultsById = new Map(results.map((item) => [item.requirementId, item]));

  return (
    <motion.div
      className="space-y-5 border-t pt-4"
      style={{ borderColor: 'var(--border-subtle)' }}
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
    >
      <div>
        <p
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--text-muted)' }}
        >
          <ListChecks className="h-3.5 w-3.5" />
          Requisitos
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
            {requirements.length}
          </span>
        </p>

        <div className="mt-3">
          {requirements.map((requirement) => {
            const result = resultsById.get(requirement.id);
            const presentation = result ? MET_PRESENTATION[result.met] : null;
            const Icon = presentation?.Icon;

            return (
              <div
                key={requirement.id}
                className="border-l py-3 pl-3"
                style={{
                  borderLeftWidth: '3px',
                  borderLeftColor: presentation ? presentation.color : 'var(--border-subtle)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm" style={{ color: 'var(--text-strong)' }}>
                    {requirement.description}
                  </p>
                  <TypeBadge type={requirement.type} />
                </div>

                {requirement.criteria ? (
                  <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
                    {requirement.criteria}
                  </p>
                ) : null}

                {presentation ? (
                  <div className="mt-2 flex items-start gap-2">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: presentation.color }} />
                    <div className="min-w-0">
                      <p
                        className="text-[10px] font-bold uppercase tracking-[0.16em]"
                        style={{ color: presentation.color }}
                      >
                        {presentation.label}
                        <span
                          className="ml-2"
                          style={{
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {Math.round((result.confidence || 0) * 100)}%
                        </span>
                      </p>
                      {result.notes ? (
                        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-normal)' }}>
                          {result.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--text-muted)' }}
        >
          Chequear mi entrega
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            // Reset: sin esto, re-elegir el mismo archivo no dispara change.
            event.target.value = '';
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(event) => event.preventDefault()}
          disabled={verifyStatus === 'verifying'}
          className="drop-zone mt-3 flex w-full flex-col items-center justify-center border border-dashed px-6 py-8 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--border-normal)', borderRadius: 'var(--radius-card, 0px)' }}
        >
          {verifyStatus === 'verifying' ? (
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          ) : (
            <Upload className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
          )}
          <span className="mt-3 text-sm" style={{ color: 'var(--text-normal)' }}>
            {verifyStatus === 'verifying' ? 'Revisando la entrega...' : 'Arrastra tu PDF o DOCX, o haz clic para elegirlo'}
          </span>
          {submissionMeta && verifyStatus === 'done' ? (
            <span
              className="mt-2 text-[10px] uppercase tracking-[0.16em]"
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono, monospace)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {submissionMeta.name} · {submissionMeta.wordCount} palabras
              {submissionMeta.pageCount ? ` · ${submissionMeta.pageCount} páginas` : ''}
            </span>
          ) : null}
        </button>

        <AnimatePresence initial={false}>
          {verifyError ? (
            <motion.div
              initial={reduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: reduced ? 0 : 0.18, ease: EASE }}
              style={{ overflow: 'hidden' }}
            >
              <div className="pt-3">
                <Banner message={verifyError} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default ActivityAnalyzer;
