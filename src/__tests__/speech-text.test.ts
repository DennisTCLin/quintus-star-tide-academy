import { describe, expect, it } from 'vitest';
import { englishAnswerSpeech, questionSpeech, selectSpeechVoice, speechParts } from '../speech-text';

describe('bilingual narration', () => {
  it('reads explanations with a voice for each language', () => {
    expect(speechParts('cat 是貓，dog 是狗。')).toEqual([
      { text: 'cat', lang: 'en-US' }, { text: '是貓，', lang: 'zh-TW' },
      { text: 'dog', lang: 'en-US' }, { text: '是狗。', lang: 'zh-TW' },
    ]);
    expect(speechParts('5 加 3 等於多少？')).toEqual([{ text: '5 加 3 等於多少？', lang: 'zh-TW' }]);
  });
  it('keeps the target instruction available to first graders', () => {
    expect(questionSpeech({ prompt: '哪一個是書桌？', speechText: 'Choose the English word.', course: 'english', grade: 1 }))
      .toBe('哪一個是書桌？ Choose the English word.');
    expect(englishAnswerSpeech('a')).toBe('The letter A.');
    expect(englishAnswerSpeech('apple')).toBe('apple');
  });
  it('never substitutes Cantonese or mainland Mandarin for Taiwan narration', () => {
    expect(selectSpeechVoice([{ lang: 'zh-HK' }, { lang: 'zh-CN' }], 'zh-TW')).toBeUndefined();
    for (const lang of ['zh_TW', 'zh-Hant-TW', 'cmn-TW'])
      expect(selectSpeechVoice([{ lang }], 'zh-TW')).toEqual({ lang });
  });
});
