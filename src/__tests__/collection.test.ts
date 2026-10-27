import { describe, it, expect } from "vitest";
import {
  newFamily,
  validateFamily,
  taipeiDay,
  collectionWeekStart,
  collectionRanking,
  collectionStats,
  buyPet,
  draw,
  proposeTrade,
  acceptTrade,
  tradeSuggestions,
  importGarden,
  PLAYERS,
} from "../adventure";
import { restoreFamily, exportBackup, parseBackup } from "../family-store";
const day = "2026-10-24";
function purchase(
  s: ReturnType<typeof newFamily>,
  who: "quintus" | "feifei",
  pet: string,
  when = day,
) {
  s.profiles[who].coins = 10_000;
  buyPet(s, who, pet, `${who}-${pet}-${when}`, when);
}
describe("collectible card ranking", () => {
  it("migrates v2 without inventing dates and preserves inventory and backup roundtrip", () => {
    const old = JSON.parse(JSON.stringify(newFamily()));
    old.version = 2;
    for (const p of Object.values(old.profiles) as any[])
      delete p.firstAcquired;
    old.profiles.doudou.owned.maltese = 3;
    const migrated = validateFamily(old);
    expect(migrated.version).toBe(9);
    expect(migrated.profiles.doudou.owned.maltese).toBe(3);
    expect(migrated.profiles.doudou.firstAcquired.maltese).toBeNull();
    expect(
      collectionRanking(migrated, "day", day).every(
        (r) => r.score === 0 && r.rank === null,
      ),
    ).toBe(true);
    expect(collectionRanking(migrated, "all", day)[0]).toMatchObject({
      id: "doudou",
      score: 2,
      total: 4,
      duplicates: 2,
      rank: 1,
    });
    expect(parseBackup(JSON.stringify(exportBackup(migrated)))).toEqual(
      migrated,
    );
    expect(old.version).toBe(2);
  });
  it("rejects missing or corrupt v3 history rather than resetting it", () => {
    for (const bad of [
      undefined,
      { tideglow: null, fake: day },
      { tideglow: null, maltese: "2026-02-30" },
      { tideglow: day },
    ]) {
      const s = newFamily();
      (s.profiles.doudou as any).firstAcquired = bad;
      expect(() => validateFamily(s)).toThrow();
    }
    const s = newFamily();
    s.profiles.doudou.owned.maltese = 1;
    expect(() => validateFamily(s)).toThrow();
  });
  it("uses Taipei midnight and Monday week boundaries across years", () => {
    expect(taipeiDay(new Date("2026-10-24T15:59:59Z"))).toBe("2026-10-24");
    expect(taipeiDay(new Date("2026-10-24T16:00:00Z"))).toBe("2026-10-25");
    expect(collectionWeekStart("2027-01-01")).toBe("2026-12-28");
    expect(collectionWeekStart("2026-10-25")).toBe("2026-10-19");
    expect(collectionWeekStart("2026-10-26")).toBe("2026-10-26");
  });
  it("counts different new cards, excludes future dates, and shares tied ranks", () => {
    const s = newFamily();
    purchase(s, "quintus", "pebblefin", "2026-10-19");
    purchase(s, "quintus", "foamferret", day);
    purchase(s, "feifei", "maltese", day);
    purchase(s, "feifei", "pig", "2026-10-25");
    const daily = collectionRanking(s, "day", day);
    expect(daily.slice(0, 2).map((r) => [r.id, r.score, r.rank])).toEqual([
      ["quintus", 1, 1],
      ["feifei", 1, 1],
    ]);
    expect(daily[2].rank).toBeNull();
    expect(collectionRanking(s, "week", day)[0]).toMatchObject({
      id: "quintus",
      score: 2,
    });
    expect(
      collectionRanking(s, "week", "2026-10-26").every((r) => r.score === 0),
    ).toBe(true);
  });
  it("duplicate draws add one card but no second collection point", () => {
    const s = newFamily();
    s.profiles.doudou.tickets = 3;
    const a = draw(s, "doudou", "draw1", 0.1, 0, day, day);
    const b = draw(s, "doudou", "draw2", 0.1, 0, day, day);
    expect(a).toMatchObject({ kind: "pet", duplicate: false, copies: 1 });
    expect(b).toMatchObject({
      kind: "pet",
      pet: a.pet,
      duplicate: true,
      copies: 2,
    });
    expect(s.profiles.doudou.firstAcquired[a.pet!]).toBe(day);
    expect(collectionRanking(s, "day", day)[0]).toMatchObject({
      id: "doudou",
      score: 1,
    });
    expect(collectionStats(s.profiles.doudou)).toEqual({
      unique: 2,
      total: 3,
      duplicates: 1,
    });
    expect(() => validateFamily(s)).not.toThrow();
  });
  it("trades conserve cards, record only unseen types, and do not reward a round trip", () => {
    const s = newFamily();
    purchase(s, "quintus", "pebblefin", "2026-10-23");
    purchase(s, "feifei", "foamferret", "2026-10-23");
    proposeTrade(s, {
      id: "swap",
      from: "quintus",
      to: "feifei",
      give: "pebblefin",
      receive: "foamferret",
    });
    acceptTrade(s, "feifei", "swap", day);
    expect(s.profiles.quintus.firstAcquired.pebblefin).toBe("2026-10-23");
    expect(s.profiles.quintus.owned.pebblefin).toBeUndefined();
    expect(s.profiles.quintus.firstAcquired.foamferret).toBe(day);
    proposeTrade(s, {
      id: "return",
      from: "quintus",
      to: "feifei",
      give: "foamferret",
      receive: "pebblefin",
    });
    acceptTrade(s, "feifei", "return", "2026-10-25");
    expect(
      collectionRanking(s, "day", "2026-10-25").every((r) => r.score === 0),
    ).toBe(true);
    expect(
      PLAYERS.reduce((n, p) => n + collectionStats(s.profiles[p.id]).total, 0),
    ).toBe(PLAYERS.length + 2);
    expect(() => validateFamily(s)).not.toThrow();
  });
  it("suggests only reciprocal spare cards and leaves transaction confirmation separate", () => {
    const s = newFamily();
    purchase(s, "quintus", "pebblefin");
    purchase(s, "feifei", "foamferret");
    expect(tradeSuggestions(s, "quintus")).toEqual([]);
    s.profiles.quintus.owned.pebblefin = 2;
    s.profiles.feifei.owned.foamferret = 2;
    const before = structuredClone(s);
    expect(tradeSuggestions(s, "quintus")).toEqual([
      { to: "feifei", give: "pebblefin", receive: "foamferret" },
    ]);
    expect(s).toEqual(before);
    s.profiles.quintus.owned.foamferret = 1;
    expect(tradeSuggestions(s, "quintus")).toEqual([]);
  });
  it("restores inventory while merging known history and preserving transaction revision", () => {
    const s = newFamily(),
      backup = newFamily();
    purchase(s, "quintus", "pebblefin", "2026-10-20");
    purchase(backup, "quintus", "pebblefin", day);
    purchase(backup, "feifei", "maltese", day);
    s.profiles.feifei.firstAcquired.maltese = null;
    s.revision = 20;
    backup.revision = 4;
    const untouched = structuredClone(backup);
    restoreFamily(s, backup);
    expect(s.revision).toBe(20);
    expect(s.profiles.quintus.firstAcquired.pebblefin).toBe("2026-10-20");
    expect(s.profiles.feifei.firstAcquired.maltese).toBeNull();
    expect(backup).toEqual(untouched);
    restoreFamily(s, newFamily());
    expect(s.profiles.quintus.owned.pebblefin).toBeUndefined();
    purchase(s, "quintus", "pebblefin", "2026-10-25");
    expect(s.profiles.quintus.firstAcquired.pebblefin).toBe("2026-10-20");
    expect(() => validateFamily(s)).not.toThrow();
  });
  it("prevents legacy garden import overwriting a traded collection", () => {
    const s = newFamily();
    s.profiles.feifei.owned.maltese = 2;
    s.profiles.feifei.firstAcquired.maltese = day;
    expect(() => importGarden(s, "feifei", {})).toThrow("尚未開始遊玩");
    expect(s.profiles.feifei.owned.maltese).toBe(2);
  });
});
