/**
 * Vertical timeline component — HTML, not SVG.
 *
 * Renders an ordered list of events as a vertical line with circle markers
 * + labels. Used by `TimelineEvolutionCard` to show profile-change milestones.
 *
 * Implementation choice: HTML+Tailwind, not SVG. The layout (text labels
 * next to dots) is more naturally HTML, html-to-image captures it cleanly,
 * and the styling is one Tailwind border instead of an SVG path. The viz
 * library's contract is "reusable presentation," not "must be SVG."
 *
 * Pre-formatted `timeLabel` strings are passed in by the caller — Timeline
 * doesn't know how to format dates, only how to lay them out.
 */

export type TimelineEvent = {
  id: string;
  label: string;
  detail?: string;
  timeLabel: string;
};

export type TimelineProps = {
  events: TimelineEvent[];
};

export function Timeline({ events }: TimelineProps) {
  if (events.length === 0) return null;

  return (
    <ol className="relative space-y-4 border-l-2 border-white/30 pl-5">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            className="absolute -left-[1.55rem] top-1.5 block h-3 w-3 rounded-full bg-white"
            aria-hidden="true"
          />
          <div className="text-xs uppercase tracking-wider opacity-70">
            {event.timeLabel}
          </div>
          <div className="font-semibold leading-snug">{event.label}</div>
          {event.detail && (
            <div className="mt-0.5 text-xs opacity-70">{event.detail}</div>
          )}
        </li>
      ))}
    </ol>
  );
}
