export type ElementName = "金" | "木" | "水" | "火" | "土";

// Stable display order. Companion assignments live on the registry records,
// never on catalog position, so adding/reordering cards cannot change affinity.
export const ELEMENTS = [
  { name: "金", zy: "ㄐㄧㄣ", icon: "🪙", generates: "水", overcomes: "木", burst: "金芒破陣" },
  { name: "木", zy: "ㄇㄨˋ", icon: "🌿", generates: "火", overcomes: "土", burst: "青木綻放" },
  { name: "水", zy: "ㄕㄨㄟˇ", icon: "💧", generates: "木", overcomes: "火", burst: "碧水奔流" },
  { name: "火", zy: "ㄏㄨㄛˇ", icon: "🔥", generates: "土", overcomes: "金", burst: "烈火衝擊" },
  { name: "土", zy: "ㄊㄨˇ", icon: "⛰️", generates: "金", overcomes: "水", burst: "厚土震波" },
] as const satisfies readonly { name: ElementName; zy: string; icon: string; generates: ElementName; overcomes: ElementName; burst: string }[];

export function elementIndex(name: ElementName): number {
  return ELEMENTS.findIndex(element => element.name === name);
}

export function hasElementAdvantage(attacker: number, defender: number): boolean {
  return !!ELEMENTS[attacker] && !!ELEMENTS[defender]
    && ELEMENTS[attacker].overcomes === ELEMENTS[defender].name;
}

export const ELEMENT_RULES = "金剋木、木剋土、土剋水、水剋火、火剋金";
export const GENERATION_RULES = "金生水、水生木、木生火、火生土、土生金";
export const GENERATION_HEAL = 8;

export function hasElementGeneration(source: number, target: number): boolean {
  return !!ELEMENTS[source] && !!ELEMENTS[target]
    && ELEMENTS[source].generates === ELEMENTS[target].name;
}
