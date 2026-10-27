export type SpeechLanguage = "zh-TW" | "en-US";
export type SpeechPart = { text: string; lang: SpeechLanguage };

/** Keep bilingual prompts intelligible instead of reading English with a Chinese voice. */
export function speechParts(text: string, defaultLanguage: SpeechLanguage = "zh-TW"): SpeechPart[] {
  const parts: SpeechPart[] = [];
  for (const chunk of text.replace(/_{2,}/g, " blank ").split(/([\u3400-\u9fff\u3105-\u312f]+[，。！？、：；]*)/u)) {
    if (!chunk) continue;
    const lang = /[\u3400-\u9fff\u3105-\u312f]/u.test(chunk) ? "zh-TW"
      : /[a-z]/i.test(chunk) ? "en-US" : (parts.at(-1)?.lang ?? defaultLanguage);
    const previous = parts.at(-1);
    if (previous?.lang === lang) previous.text += chunk;
    else parts.push({ text: chunk, lang });
  }
  return parts.map(p => ({ ...p, text: p.text.trim().replace(/\s+/g, " ") }))
    .filter(p => /[\p{L}\p{N}]/u.test(p.text));
}

export function selectSpeechVoice<T extends { lang: string }>(voices: T[], lang: SpeechLanguage): T | undefined {
  const normalized = (voice: T) => voice.lang.replace(/_/g, "-").toLowerCase();
  if (lang === "zh-TW") return voices.find(v => /^(zh|cmn)-(hant-)?tw$/.test(normalized(v)));
  return voices.find(v => normalized(v) === "en-us") ?? voices.find(v => normalized(v).startsWith("en-"));
}

export function englishAnswerSpeech(text: string): string {
  return /^[a-z]$/i.test(text.trim()) ? `The letter ${text.trim().toUpperCase()}.` : text;
}

export function questionSpeech(question: { prompt: string; speechText?: string; course: string; grade?: number }): string {
  // Beginning readers need the Chinese task as well as the English practice cue.
  const text = question.course === "english" && question.grade === 1 && question.speechText
    ? `${question.prompt} ${question.speechText}` : (question.speechText ?? question.prompt);
  return text.replace(/×/g, "乘以").replace(/−/g, "減").replace(/\+/g, "加").replace(/=/g, "等於");
}
