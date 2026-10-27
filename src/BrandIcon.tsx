import { Fragment, type ReactNode } from "react";
import "./brand-icons.css";
import spriteMarkup from "../public/assets/brand-icons.svg?raw";

// Keep paint servers in the same document: WebKit loses gradients through external <use>.
const inlineSprite = spriteMarkup.replace(/^<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/, "")
  .replace(/\bid="([^"]+)"/g, 'id="brand-ui-$1"')
  .replace(/url\(#([^)]+)\)/g, "url(#brand-ui-$1)");
export function BrandIconSprite() {
  return <svg className="brand-icon-sprite" aria-hidden="true" focusable="false"
    dangerouslySetInnerHTML={{__html:inlineSprite}} />;
}


// UI symbols only. Learning pictures, answer choices and phonetic marks bypass this map.
export const BRAND_SYMBOLS = {
  "🪙": "metal", "⛰️": "earth", "💧": "water", "🌿": "leaf", "🌱": "leaf", "☘": "leaf", "🔥": "fire",
  "✨": "spark", "✦": "spark", "✧": "spark", "🌟": "star", "⭐": "star", "★": "star", "☆": "star",
  "🔎": "focus", "🔍": "focus", "🛡️": "shield", "🟡": "coin", "💚": "heart", "💙": "heart",
  "⚔️": "battle", "📖": "book", "📚": "book", "🃏": "cards", "♊": "duplicate", "🎟️": "ticket",
  "🐾": "paw", "🔊": "speaker", "👂": "ear", "♫": "music", "🎵": "music", "▶": "play",
  "Ⅱ": "pause", "⏹": "stop", "✓": "check", "✕": "close", "➜": "arrow", "🔁": "repeat", "🔄": "repeat",
  "👤": "person", "👥": "people", "🤖": "robot", "🔒": "lock", "📅": "calendar", "☀️": "sun", "☾": "moon",
  "🧭": "compass", "🐚": "shell", "🌸": "flower", "❋": "flower", "🐬": "dolphin",
  "🖼️": "picture", "🧩": "puzzle", "🔢": "math", "🔤": "letters", "💡": "bulb", "👆": "hand",
  "☁": "cloud", "☁️": "cloud", "🎁": "gift", "🎉": "gift", "⛵": "boat", "🛟": "life",
  "📤": "upload", "📥": "download", "🤝": "exchange", "↔": "exchange", "🌠": "meteor",
  "🏆": "cup", "👑": "crown", "🎯": "focus", "💎": "crystal", "🦀": "crab",
} as const;
export type BrandIconName = (typeof BRAND_SYMBOLS)[keyof typeof BRAND_SYMBOLS] | "sword";

export default function BrandIcon({ name, className = "", symbol }: {
  name: BrandIconName; className?: string; symbol?: string;
}) {
  return <span className={`brand-glyph ${symbol === "☆" ? "brand-glyph-empty" : ""} ${className}`}>
    <svg className="brand-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false" data-brand-icon={name}>
      <use href={`#brand-ui-${name}`} />
    </svg>
    {/* Keep the original accessible text; decorative ancestors can still hide it. */}
    {symbol && <span className="brand-symbol-text">{symbol}</span>}
  </span>;
}
const escaped = Object.keys(BRAND_SYMBOLS).sort((a, b) => b.length - a.length)
  .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const symbolPattern = new RegExp(`(${escaped.join("|")})`, "gu");

export function renderBrandText(text: string, renderPlain: (text: string) => ReactNode = text => text): ReactNode {
  const parts = text.split(symbolPattern);
  if (parts.length === 1) return renderPlain(text);
  return parts.map((part, i) => {
    const name = BRAND_SYMBOLS[part as keyof typeof BRAND_SYMBOLS];
    return name ? <BrandIcon key={i} name={name} symbol={part} /> : <Fragment key={i}>{renderPlain(part)}</Fragment>;
  });
}
export function BrandText({ text }: { text: string }) {
  return <>{renderBrandText(text)}</>;
}
