import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type ReactNode,
  type ReactElement,
} from "react";
import BrandIcon, { BrandText, renderBrandText } from "./BrandIcon";
import dictionary from "./data/interface-zhuyin-packed.json";
import { PhoneticText } from "./PhoneticText";
export const ReadingContext = createContext({ grade: 4, voice: true });
// Resolve only the displayed syllables; never expand a second full dictionary.
const chars: Record<string, number> = dictionary.chars;
const phrases: Record<string, number[]> = dictionary.phrases;
const byStart = new Map<string, string[]>();
for (const key of Object.keys(phrases).sort((a, b) => b.length - a.length)) {
  byStart.set(key[0], [...(byStart.get(key[0]) ?? []), key]);
}
export function syllables(text: string): { text: string; zy: string }[] {
  const result: { text: string; zy: string }[] = [];
  for (let i = 0; i < text.length; ) {
    const phrase = byStart.get(text[i])?.find((key) => text.startsWith(key, i));
    if (phrase) {
      for (let n = 0; n < phrase.length; n++)
        result.push({ text: phrase[n], zy: dictionary.syllables[phrases[phrase][n]] ?? "" });
      i += phrase.length;
    } else {
      const c = String.fromCodePoint(text.codePointAt(i)!);
      result.push({ text: c, zy: dictionary.syllables[chars[c]] ?? "" });
      i += c.length;
    }
  }
  return result;
}
export function AutoRuby({ text }: { text: string }) {
  const { grade } = useContext(ReadingContext);
  if (grade === 2) return <BrandText text={text} />;
  return (
    <>
      {renderBrandText(text, plain => syllables(plain).map((x, i) =>
        x.zy ? (
          <ruby className="auto-ruby" key={i}>
            {x.text}
            <rt><PhoneticText text={x.zy} /></rt>
          </ruby>
        ) : (
          x.text
        ),
      ))}
    </>
  );
}
export function annotateTree(node: ReactNode, grade: number): ReactNode {
  return Children.map(node, (child) => {
    if (typeof child === "string") return renderBrandText(child);
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<{ children?: ReactNode; "data-learning-content"?: boolean }>;
    if (
      el.props["data-learning-content"] ||
      (typeof el.type === "string" &&
      ["ruby", "rt", "input", "select", "option", "textarea", "svg", "code"].includes(el.type))
    )
      return el;
    return el.props.children
      ? cloneElement(el, {}, annotateTree(el.props.children, grade))
      : el;
  });
}
export function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((n) =>
      typeof n === "string" || typeof n === "number"
        ? String(n)
        : isValidElement(n)
          ? n.type === "rt" || n.type === "rp" || (n.props as { "aria-hidden"?: boolean })["aria-hidden"] === true
            ? ""
            : n.type === AutoRuby || n.type === BrandText
            ? (n.props as { text: string }).text
            : n.type === BrandIcon
              ? (n.props as { symbol?: string }).symbol ?? ""
              : textOf((n.props as { children?: ReactNode }).children)
          : "",
    )
    .join(" ");
}
