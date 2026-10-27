import BrandIcon from "./BrandIcon";
import "./nav-icons.css";

export type NavIconName = "territory" | "home" | "collection" | "leaderboard" | "lottery" | "trade" | "battle" | "parent";

// One Higgsfield-generated atlas keeps the seven symbols visually consistent.
// The adjacent text labels provide each button's accessible name.
export default function NavIcon({ name }: { name: NavIconName }) {
  if (name === "territory") return <span className="nav-icon nav-icon--territory" aria-hidden="true"><BrandIcon name="earth" /></span>;
  return <span className={`nav-icon nav-icon--${name}`} aria-hidden="true" />;
}
