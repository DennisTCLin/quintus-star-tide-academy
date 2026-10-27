import "./brand.css";

export default function BrandLogo({ variant = "header" }: { variant?: "header" | "welcome" | "footer" }) {
  return (
    <div className={`brand-logo brand-logo--${variant}`} role="img" aria-label="星潮學院 Star Tide Academy — 星潮小龍">
      <img
        className="brand-logo-mark"
        src="/assets/star-tide-dragon.png"
        alt=""
        width="256"
        height="256"
        decoding="async"
      />
      <div className="brand-wordmark" aria-hidden="true">
        <strong className="brand-name">星潮學院</strong>
        <span className="brand-english">STAR TIDE ACADEMY</span>
        {variant !== "footer" && <span className="brand-tagline">一起向星海出發</span>}
      </div>
    </div>
  );
}
