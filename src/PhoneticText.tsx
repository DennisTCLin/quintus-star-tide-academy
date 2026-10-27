import './phonetic-text.css';

/** Keep the original reading and neutral-tone position; only emphasize its marks. */
export function PhoneticText({ text }: { text: string }) {
  return <>{text.split(/([ˊˇˋ˙])/u).map((part, i) =>
    /^[ˊˇˋ˙]$/u.test(part) ? <span className="phonetic-tone" key={i}>{part}</span> : part,
  )}</>;
}

const TONES: Record<string, { name: string; path?: string }> = {
  '―': { name: '一聲', path: 'M12 32 H52' },
  'ˊ': { name: '二聲', path: 'M16 48 L48 16' },
  'ˇ': { name: '三聲', path: 'M12 20 L32 46 L52 20' },
  'ˋ': { name: '四聲', path: 'M16 16 L48 48' },
  '˙': { name: '輕聲' },
};
export const toneName = (text: string) => TONES[text]?.name;

/** Standalone answers need a full-size mark, independent of font accent metrics. */
export function ToneChoice({ mark }: { mark: string }) {
  const tone = TONES[mark];
  if (!tone) return null;
  return <span className="tone-choice">
    <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden="true" focusable="false">
      {tone.path ? <path d={tone.path} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /> : <circle cx="32" cy="32" r="7" fill="currentColor" />}
    </svg>
    <span>{tone.name}</span>
  </span>;
}
