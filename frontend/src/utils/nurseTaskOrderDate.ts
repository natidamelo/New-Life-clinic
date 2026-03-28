import { format, isValid } from 'date-fns';

type Source = 'prescription' | 'start' | 'queued';

const SOURCE_LABEL: Record<Source, string> = {
  prescription: 'Prescribed',
  start: 'Course start',
  queued: 'Task queued',
};

function tryParseDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const d = new Date(value as string | number | Date);
  return isValid(d) ? d : null;
}

/** Best-effort “when this order entered nursing” for separating same-day / repeat visits. */
export function getNurseTaskOrderContext(task: unknown): { date: Date; source: Source } | null {
  if (!task || typeof task !== 'object') return null;
  const t = task as Record<string, unknown>;
  const md = t.medicationDetails as Record<string, unknown> | undefined;

  const fromPrescription = tryParseDate(md?.prescriptionDate);
  if (fromPrescription) return { date: fromPrescription, source: 'prescription' };

  const fromStart = tryParseDate(md?.startDate);
  if (fromStart) return { date: fromStart, source: 'start' };

  const fromCreated = tryParseDate(t.createdAt);
  if (fromCreated) return { date: fromCreated, source: 'queued' };

  return null;
}

/** One line for the medication card header, e.g. "Prescribed: 28 Mar 2026 · 14:30". */
export function formatNurseTaskOrderLine(task: unknown): string | null {
  const ctx = getNurseTaskOrderContext(task);
  if (!ctx) return null;
  return `${SOURCE_LABEL[ctx.source]}: ${format(ctx.date, 'dd MMM yyyy · HH:mm')}`;
}

/** Shown on grouped patient rows when multiple meds / visits exist. */
export function formatPatientGroupOrderSummary(tasks: unknown[] | undefined): string | null {
  if (!tasks?.length) return null;
  const times = tasks
    .map(t => getNurseTaskOrderContext(t)?.date.getTime())
    .filter((n): n is number => typeof n === 'number' && !Number.isNaN(n));
  if (!times.length) return null;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const fmt = (ms: number) => format(new Date(ms), 'dd MMM yyyy · HH:mm');
  if (min === max) return fmt(min);
  return `${fmt(min)} – ${fmt(max)}`;
}
