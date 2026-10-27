import type { Choice } from './learning';
import { AutoRuby } from './readability';
import { PhoneticText, ToneChoice, toneName } from './PhoneticText';
export default function ChoiceView({
  choice,
  grade,
  pictureOnly = false,
  hideReadingHints = false,
}: {
  choice: Choice;
  grade: number;
  pictureOnly?: boolean;
  hideReadingHints?: boolean;
}) {
  if (!pictureOnly && toneName(choice.text)) return <span className="choice-content" data-learning-content><ToneChoice mark={choice.text} /></span>;
  return (
    <span className="choice-content" data-learning-content lang={/^[A-Za-z]/.test(choice.text) ? "en" : undefined}>
      {choice.image && choice.position !== undefined ? (
        <span
          className="picture-tile"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${choice.image})`,
            backgroundPosition: `${(choice.position % 3) * 50}% ${Math.floor(choice.position / 3) * 50}%`,
          }}
        />
      ) : (
        choice.icon && (
          <span className="choice-icon" aria-hidden="true">
            {choice.icon}
          </span>
        )
      )}
      {!pictureOnly &&
        ((grade === 1 || hideReadingHints) && choice.zy ? (
          <span className="zhuyin-only">{choice.zy.trim().split(/\s+/).map((syllable, i) => <span className="zhuyin-syllable" key={i}><PhoneticText text={syllable} />{" "}</span>)}</span>
        ) : (
          <span>{choice.text}</span>
        ))}
    </span>
  );
}

export function Ruby({ text, zy }: { text: string; zy?: string }) {
  const parts = zy?.trim().split(/\s+/);
  return parts?.length === Array.from(text).length ? (
    <span className="ruby-line">
      {Array.from(text).map((char, i) => (
        <ruby key={i}>
          {char}
          <rt><PhoneticText text={parts[i]} /></rt>
        </ruby>
      ))}
    </span>
  ) : (
    <span>
      {zy ? text : <AutoRuby text={text} />}
      {zy && <small className="phonetic-line"><PhoneticText text={zy} /></small>}
    </span>
  );
}
