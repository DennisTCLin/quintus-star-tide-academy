import { emptyPlayer } from "./island/engine";
import { mergeLearning } from "./learning-engine";
import {
  FAMILY_KEY,
  PLAYERS,
  newFamily,
  validateFamily,
  reconcileMasteredQuestions,
  type Family,
} from "./adventure";
import { STORAGE_KEY } from "./core";
import { EQUIPPED_CHARACTER_KEY, readEquippedCharacter } from "./characters";
export function readFamily(): Family {
  const raw = localStorage.getItem(FAMILY_KEY);
  if (raw) return validateFamily(JSON.parse(raw));
  return newFamily(
    localStorage.getItem(STORAGE_KEY),
    readEquippedCharacter(localStorage.getItem(EQUIPPED_CHARACTER_KEY)),
  );
}
export async function transact<T>(
  update: (family: Family) => T,
): Promise<{ family: Family; result: T }> {
  if (!navigator.locks)
    throw Error(
      "這個瀏覽器不支援安全保存。請使用新版 Chrome、Safari 或 Edge。",
    );
  return navigator.locks.request(FAMILY_KEY, () => {
    const family = readFamily();
    const result = update(family);
    family.revision++;
    const safe = validateFamily(family);
    localStorage.setItem(FAMILY_KEY, JSON.stringify(safe));
    return { family: safe, result };
  });
}
export function exportBackup(family: Family) {
  return {
    format: "star-tide-family",
    version: 1,
    exportedAt: new Date().toISOString(),
    family: validateFamily(family),
  };
}
export function parseBackup(raw: string): Family {
  if (raw.length > 5_000_000) throw Error("備份太大");
  const data = JSON.parse(raw);
  if (data.format !== "star-tide-family" || data.version !== 1)
    throw Error("不是整合版家庭備份");
  return validateFamily(data.family);
}

// Restoring inventory cannot erase this browser's known first-acquisition history.
export function restoreFamily(current: Family, incoming: Family) {
  const restored = validateFamily(incoming);
  for (const player of PLAYERS) {
    const existing = current.profiles[player.id],
      next = restored.profiles[player.id];
    next.learning = mergeLearning(existing.learning, next.learning);
    // An imported active run may expose old answers; resume it as non-rewarding review.
    if (next.run?.status === "active") {
      next.run.practice = true;
      next.run.learningEnabled = false;
      next.run.review = next.run.questions.map(() => true);
    }
    if (existing.day > next.day) {
      next.day = existing.day;
      next.credited = [...existing.credited];
      next.attempted = [...existing.attempted];
      next.draws = existing.draws;
    } else if (existing.day === next.day) {
      next.credited = [
        ...new Set([...existing.credited, ...next.credited]),
      ];
      next.attempted = [
        ...new Set([...existing.attempted, ...next.attempted]),
      ];
    }
    // Backups cannot erase a first attempt, even when the backup predates the island.
    if (existing.mathIsland) {
      const island = next.mathIsland ??= emptyPlayer();
      if (existing.mathIsland.day > island.day) {
        island.day = existing.mathIsland.day;
        island.attempted = [...existing.mathIsland.attempted];
      } else if (existing.mathIsland.day === island.day) {
        island.attempted = [...new Set([...existing.mathIsland.attempted, ...island.attempted])];
      }
    }
    // Imported questions may already expose solutions. Start a fresh island run.
    if (next.mathIsland?.run && !next.mathIsland.run.completed) delete next.mathIsland.run;
    reconcileMasteredQuestions(next, player.grade);
    const history = next.firstAcquired;
    for (const [pet, day] of Object.entries(
      current.profiles[player.id].firstAcquired,
    )) {
      if (!(pet in history)) history[pet] = day;
      else if (history[pet] === null || day === null) history[pet] = null;
      else history[pet] = day < history[pet]! ? day : history[pet];
    }
  }
  const revision = current.revision;
  Object.assign(current, restored, { revision });
}
