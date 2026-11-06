import type { islandProtection } from './conquest-presentation';

type Status = NonNullable<ReturnType<typeof islandProtection>>;
export default function ConquestIslandProtection({ status }: { status: Status }) {
  return <span className="cq-island-protection" data-protection={status.kind}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {status.kind === 'protected' ? <><path d="M12 2 21 6v6c0 5-6 9-9 10-3-1-9-5-9-10V6Z"/><path d="m8 12 3 3 5-6"/></>
        : status.kind === 'preparing' ? <><path d="M5 3h14M5 21h14M7 3v4c0 2 3 4 5 5-2 1-5 3-5 5v4M17 3v4c0 2-3 4-5 5 2 1 5 3 5 5v4"/><path d="m9 7 3 2 3-2M9 18h6"/></>
        : <><path d="m3 3 5 1 12 15-2 2L4 8Zm18 0-5 1-4 5m-3 4-5 6 2 2 5-6M14 20l6-6M4 14l6 6"/></>}
    </svg>
    <span><b>{status.label}</b><span className="cq-protection-time">{status.until ? <time dateTime={new Date(status.until).toISOString()}>{status.detail}</time> : status.detail}</span>
      {status.kind === 'preparing' && <span className="cq-protection-warning">仍可被進攻</span>}
    </span>
  </span>;
}
