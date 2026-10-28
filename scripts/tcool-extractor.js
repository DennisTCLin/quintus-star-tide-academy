// ============================================================
// Tcool Exam Extractor — paste into Chrome DevTools console
// on a tcool.cc/mock/{id}/ page, then call: extractAll()
// ============================================================
//
// Usage:
//   1. Open Chrome, go to tcool.cc, log in
//   2. Search for an exam (e.g. grade 6, math, 上學期, 期中考, 康軒)
//   3. Click "刷段考" on an exam to open /mock/{id}/
//   4. Open DevTools (F12) → Console
//   5. Paste this entire script and press Enter
//   6. Type: extractAll()   and press Enter
//   7. Wait — it will auto-click through all questions
//   8. A JSON file downloads automatically when done
//
// The script selects "全刷" (all questions) and starts the exam,
// then for each question: reads text + options, clicks option 1
// to reveal the answer, records the correct answer, and proceeds.

(function () {
  'use strict';

  const DELAY = 800; // ms between actions

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function parseExamHeader() {
    const header = document.querySelector('.mock-info, [class*="info"]');
    const text = header?.textContent?.trim() || document.querySelector('body')?.textContent?.match(/[一-鿿]+國小.+康軒|[一-鿿]+國小.+翰林|[一-鿿]+國小.+南一|[一-鿿]+國小.+何嘉仁/)?.[0] || '';

    // Parse from the subtitle text like "內湖國小 114上 數學 6年級 上學期 期中1 康軒"
    const subtitle = document.body.innerText.match(/(.+?國小)\s+(\d+上|\d+下)\s+(數學|國語|英語|自然|社會)\s+(\d+)年級\s+(上學期|下學期)\s+(期中\d|期末\d?|第.次段考.+?)\s+(康軒|翰林|南一|何嘉仁)/);

    const examId = location.pathname.match(/\/mock\/(\d+)\/?/)?.[1] || 'unknown';

    if (subtitle) {
      return {
        examId,
        school: subtitle[1],
        year: subtitle[2],
        subject: subtitle[3],
        grade: parseInt(subtitle[4]),
        semester: subtitle[5],
        examPeriod: subtitle[6],
        publisher: subtitle[7],
      };
    }

    // Fallback: try to get from any visible text
    const bodyText = document.body.innerText;
    const gradeMatch = bodyText.match(/(\d+)年級/);
    const subjectMatch = bodyText.match(/(數學|國語|英語|自然|社會)/);
    const publisherMatch = bodyText.match(/(康軒|翰林|南一|何嘉仁)/);

    return {
      examId,
      school: bodyText.match(/(.{2,6}國小)/)?.[1] || 'unknown',
      year: bodyText.match(/(\d{2,3}[上下])/)?.[1] || '',
      subject: subjectMatch?.[1] || 'unknown',
      grade: gradeMatch ? parseInt(gradeMatch[1]) : 0,
      semester: bodyText.match(/(上學期|下學期)/)?.[1] || '',
      examPeriod: bodyText.match(/(期中\d|期末\d?)/)?.[1] || '',
      publisher: publisherMatch?.[1] || '',
    };
  }

  function getQuestionText() {
    // The question text is typically in a specific container
    const containers = document.querySelectorAll('.question-body, .mock-body, [class*="question"]');
    for (const el of containers) {
      const text = el.textContent?.trim();
      if (text && text.includes('？') || text && text.includes('?')) return text;
    }

    // Fallback: look for text between the header and options
    const allText = document.body.innerText;
    const match = allText.match(/剩餘\d+題\s*\n\s*(.+?)\n\s*\(1\)/s);
    if (match) return match[1].trim();

    // Another fallback: find text followed by (1)
    const lines = allText.split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i + 1]?.startsWith('(1)')) return lines[i];
    }
    return '';
  }

  function getOptions() {
    const allText = document.body.innerText;
    const options = [];
    for (let n = 1; n <= 4; n++) {
      const regex = new RegExp(`\\(${n}\\)\\s*(.+?)(?=\\(${n + 1}\\)|收藏|回報|跳過|$)`, 's');
      const m = allText.match(regex);
      if (m) options.push(m[1].trim());
    }
    return options;
  }

  function getQuestionId() {
    const el = document.querySelector('input[name="skip_id"]');
    return el?.value || '';
  }

  function hasImage() {
    return !!document.querySelector('img[alt*="題目"], img[class*="question"], .question-image img');
  }

  async function clickOption1() {
    // Click the first option (1) to reveal the answer
    const optionEls = document.querySelectorAll('[class*="option"], [class*="choice"]');
    for (const el of optionEls) {
      if (el.textContent?.trim()?.startsWith('(1)')) {
        el.click();
        return true;
      }
    }

    // Fallback: find by text pattern and click
    const allEls = document.querySelectorAll('div, button, label, span');
    for (const el of allEls) {
      const text = el.textContent?.trim();
      if (text?.startsWith('(1)') && text.length < 300 && el.offsetParent !== null) {
        el.click();
        return true;
      }
    }
    return false;
  }

  function getCorrectAnswer() {
    const allText = document.body.innerText;
    // Look for "正確答案是 (N)" pattern
    const match = allText.match(/正確答案是\s*\((\d)\)/);
    if (match) return parseInt(match[1]) - 1; // convert to 0-indexed

    // Also check for "答對了！" which means option 1 was correct
    if (allText.includes('答對了')) return 0;

    return -1;
  }

  async function clickNext() {
    // Click "下一題" button
    const buttons = document.querySelectorAll('button, [type="submit"]');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === '下一題') {
        btn.click();
        return true;
      }
    }
    return false;
  }

  async function selectAllAndStart() {
    // Click "全刷" to select all questions
    const radios = document.querySelectorAll('[type="button"], button');
    for (const r of radios) {
      if (r.textContent?.trim() === '全刷') {
        r.click();
        await sleep(DELAY);
        break;
      }
    }

    // Click "開始測驗"
    const buttons = document.querySelectorAll('button, [type="submit"]');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === '開始測驗') {
        btn.click();
        await sleep(DELAY * 2);
        return true;
      }
    }
    return false;
  }

  async function dismissPopup() {
    // Dismiss the login reward popup if present
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
      const text = btn.textContent?.trim();
      if (text === '收下' || text === '關閉' || text === '關閉通知') {
        btn.click();
        await sleep(300);
        return true;
      }
    }
    // Try Escape key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await sleep(300);
    return false;
  }

  window.extractAll = async function extractAll() {
    console.log('🚀 Starting tcool extraction...');

    // Parse exam header info
    const examInfo = parseExamHeader();
    console.log('📋 Exam info:', examInfo);

    // Dismiss any popup
    await dismissPopup();
    await sleep(500);

    // Check if we're on the setup page (has 開始測驗 button)
    const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '開始測驗');
    if (startBtn) {
      console.log('📝 Starting exam (selecting all questions)...');
      await selectAllAndStart();
      await dismissPopup();
      await sleep(1000);
    }

    const questions = [];
    let questionNum = 0;
    let maxQuestions = 200; // safety limit

    while (questionNum < maxQuestions) {
      await dismissPopup();
      await sleep(DELAY);

      // Check if exam is complete
      const bodyText = document.body.innerText;
      if (bodyText.includes('測驗結束') || bodyText.includes('完成測驗') || bodyText.includes('你的成績')) {
        console.log('✅ Exam complete!');
        break;
      }

      // Check remaining count
      const remaining = bodyText.match(/剩餘(\d+)題/);
      if (remaining) {
        console.log(`📖 Question ${questionNum + 1} (${remaining[1]} remaining)...`);
      }

      // Get question data
      const tcoolId = getQuestionId();
      const prompt = getQuestionText();
      const options = getOptions();
      const hasImg = hasImage();

      if (!prompt && !options.length) {
        console.warn('⚠️ Could not read question, retrying...');
        await sleep(DELAY * 2);
        continue;
      }

      // Click option (1) to reveal the answer
      const clicked = await clickOption1();
      if (!clicked) {
        console.warn('⚠️ Could not click option, skipping...');
        // Try to skip
        const skipBtns = document.querySelectorAll('button');
        for (const b of skipBtns) {
          if (b.textContent?.trim() === '跳過') { b.click(); break; }
        }
        await sleep(DELAY);
        questionNum++;
        continue;
      }

      await sleep(DELAY);

      // Get the correct answer
      const correctAnswer = getCorrectAnswer();

      const q = {
        tcoolId,
        prompt,
        options,
        answer: correctAnswer,
        hasImage: hasImg,
        questionNum: questionNum + 1,
      };
      questions.push(q);
      console.log(`  ✓ Q${questionNum + 1}: "${prompt.substring(0, 40)}..." → answer: (${correctAnswer + 1})`);

      // Click next
      await sleep(DELAY);
      const nextClicked = await clickNext();
      if (!nextClicked) {
        console.log('🏁 No next button — exam may be complete');
        break;
      }

      await sleep(DELAY);
      questionNum++;
    }

    // Build output
    const output = {
      extractedAt: new Date().toISOString(),
      examInfo,
      totalQuestions: questions.length,
      questions,
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tcool-${examInfo.examId}-${examInfo.subject}-g${examInfo.grade}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`\n🎉 Done! Extracted ${questions.length} questions.`);
    console.log(`📁 File downloaded: tcool-${examInfo.examId}-${examInfo.subject}-g${examInfo.grade}.json`);
    console.log('\n💡 Next: run  node scripts/process-tcool-export.mjs <downloaded-file.json>');

    return output;
  };

  console.log('✅ Tcool extractor loaded! Type extractAll() to start.');
  console.log('   Make sure you are on a tcool.cc/mock/{id}/ page.');
})();
