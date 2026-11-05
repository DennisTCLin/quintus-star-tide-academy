import BrandIcon from "./BrandIcon";
import "./nav-icons.css";

export type NavIconName = "cinema" | "conquest" | "territory" | "home" | "collection" | "leaderboard" | "lottery" | "trade" | "battle" | "parent";

// One Higgsfield-generated atlas keeps the seven symbols visually consistent.
// The adjacent text labels provide each button's accessible name.
export default function NavIcon({ name }: { name: NavIconName }) {
  if (name === "cinema") return <span className="nav-icon nav-icon--cinema" aria-hidden="true"><svg viewBox="0 0 32 32"><rect x="3" y="5" width="26" height="22" rx="3" /><path d="M13 11l8 5-8 5zM7 5v22M25 5v22" /></svg></span>;
  if (name === "conquest") return <span className="nav-icon nav-icon--conquest" aria-hidden="true"><img src="/assets/navigation/conquest-fortress.v-c1549f292cd3.webp" alt="" width="192" height="192" decoding="async" /></span>;
  if (name === "territory") return <span className="nav-icon nav-icon--territory" aria-hidden="true"><BrandIcon name="earth" /></span>;
  return <span className={`nav-icon nav-icon--${name}`} aria-hidden="true" />;
}
