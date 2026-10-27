import { clientId as createClientId } from "./client-id";
import { useEffect, useRef, useState } from "react";
import { request } from "./cloud";
import type { PlayerId } from "./game-view";

import type { Activity } from "./social-activity";
export type Friend = { id: PlayerId; key?: string; sameAccount?: boolean; avatarKey?: string; name: string; lastSeenAt: number | null; onlineUntil: number | null; hasActivity?: boolean; activity?: Activity | null };
export function otherFriends(friends: Friend[], player: PlayerId): Friend[] {
  return friends.filter(friend => friend.id !== player || (Boolean(friend.key) && friend.sameAccount === false));
}
export type FriendsState = { serverNow: number; friends: Friend[] };
export type PresenceSnapshot = { data: FriendsState; receivedAt: number } | null;

export function lastSeenLabel(lastSeenAt: number | null, now: number, hasActivity = false): string {
  if (lastSeenAt === null) return hasActivity ? "已有冒險紀錄・時間未記錄" : "上線時間未記錄";
  const minutes = Math.floor(Math.max(0, now - lastSeenAt) / 60000);
  if (minutes < 1) return "剛剛上線過";
  if (minutes < 60) return `${minutes} 分鐘前上線`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前上線`;
  return `${Math.floor(hours / 24)} 天前上線`;
}

// Each mounted player view owns one lease. Never reuse sessionStorage IDs:
// browsers copy sessionStorage when duplicating a tab.
export function trackPresence(
  player: PlayerId,
  csrf: string,
  receive: (snapshot: PresenceSnapshot) => void,
  activity: () => Activity = () => "home",
) {
  const clientId = createClientId();
  let sequence = 0, stopped = false, pending = 0;
  const visible = () => document.visibilityState === "visible" && navigator.onLine;
  const send = async (active: boolean) => {
    const issued = ++sequence;
    pending = active ? issued : 0;
    try {
      const data = await request<FriendsState>("presence", { clientId, player, sequence: issued, active, activity: activity() }, csrf, !active);
      if (!stopped && issued === sequence && active && visible())
        receive({ data, receivedAt: Date.now() });
    } catch {
      if (!stopped && issued === sequence) receive(null);
    } finally {
      if (pending === issued) pending = 0;
    }
  };
  const refresh = () => {
    if (!stopped && visible() && !pending) void send(true);
  };
  const leave = () => { receive(null); void send(false); };
  const visibility = () => {
    if (visible()) refresh(); else leave();
  };
  const offline = () => { receive(null); void send(false); };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", leave);
  window.addEventListener("pageshow", refresh);
  window.addEventListener("online", refresh);
  window.addEventListener("offline", offline);
  const timer = setInterval(refresh, 10000);
  refresh();
  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", leave);
    window.removeEventListener("pageshow", refresh);
    window.removeEventListener("online", refresh);
    window.removeEventListener("offline", offline);
    void send(false);
  };
}

export function usePresence(player: PlayerId | null, csrf: string | undefined, activity: Activity = "home") {
  const currentActivity = useRef(activity);
  currentActivity.current = activity;
  const [snapshot, setSnapshot] = useState<PresenceSnapshot>(null);
  useEffect(() => {
    setSnapshot(null);
    if (player && csrf) return trackPresence(player, csrf, setSnapshot, () => currentActivity.current);
  }, [player, csrf]);
  return snapshot;
}
