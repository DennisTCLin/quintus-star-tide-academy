import { BrandText } from "./BrandIcon";
import { createContext, useContext } from "react";
import { PLAYERS, type PlayerId } from "./game-view";

export const playerPhotos: Partial<Record<PlayerId, string>> = {
  quintus: "/players/quintus.jpg?v=1",
  alston: "/players/alston.jpg?v=1",
  doudou: "/players/doudou.jpg?v=1",
  feifei: "/players/feifei.jpg?v=1",
  qingqing: "/players/qingqing.jpg?v=1",
};

// A player ID is a grade/profile slot, not a unique child account.
const accountPhotos: Record<string, { playerId: PlayerId; photo: string | null }> = {
  jasper: { playerId: "qingqing", photo: "/players/jasper.jpg?v=1" },
  alan: { playerId: "quintus", photo: "/players/alan.jpg?v=1" },
  jimmy: { playerId: "feifei", photo: "/players/jimmy.jpg?v=1" },
  brownie: { playerId: "quintus", photo: "/players/brownie.jpg?v=1" },
  dennistc: { playerId: "alston", photo: null },
  trial_g6: { playerId: "alston", photo: null },
};
const AccountAvatarContext = createContext<{ username: string; playerId?: PlayerId | null } | null>(null);
export const AccountAvatarProvider = AccountAvatarContext.Provider;

// Decorative beside the visible player name; all contexts share one photo source.
export default function PlayerAvatar({ id, className = "", avatarKey }: {
  id: PlayerId;
  className?: string;
  avatarKey?: string | null;
}) {
  const account = useContext(AccountAvatarContext);
  const username = avatarKey === undefined ? account?.username.toLowerCase() : avatarKey;
  const matches = avatarKey !== undefined || account?.playerId === id;
  const override = username && matches && accountPhotos[username]?.playerId === id
    ? accountPhotos[username] : undefined;
  const photo = avatarKey === "unknown" ? null : override ? override.photo : playerPhotos[id];
  return (
    <span className={`player-avatar avatar-${id}${override ? ` account-avatar-${username}` : ""} ${className}`} aria-hidden="true">
      {photo ? <img src={photo} alt="" decoding="async" /> : <BrandText text={PLAYERS.find(player => player.id === id)?.icon ?? "🐾"} />}
    </span>
  );
}
