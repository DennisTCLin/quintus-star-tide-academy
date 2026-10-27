"""Real browser/audio checks; every API request uses disposable local fixtures.

Run after npm run build with a dev server at MUSIC_QA_URL (default :4198).
Set MUSIC_QA_HOME_TRACK when testing a release with a different homepage song.
Requires Python Playwright and Chrome. No accounts or cloud records are changed.
"""
import json
import os
from pathlib import Path
import subprocess

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs/battle-music"
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get("MUSIC_QA_URL", "http://localhost:4198")
HOME_TRACK = os.environ.get("MUSIC_QA_HOME_TRACK", "indie-air.mp3")
fixture = json.loads(subprocess.check_output([
    "node", "--input-type=module", "-e", """
    import * as g from './build/game.mjs';
    const family = g.newFamily();
    for (const p of Object.values(family.profiles))
      for (const c of g.ROSTER) p.owned[c.id] = 1;
    const questions = {};
    for(const player of ['quintus', 'feifei']) {
      g.startRun(family, player, 'math', `music-${player}`, 0);
      const run = family.profiles[player].run;
      questions[player] = {...g.questionById(run.questions[0]), audio:'/assets/indie-air.mp3', end:1};
    }
    console.log(JSON.stringify({family, questions, username: 'music-qa',
      playerId: 'quintus', displayName: 'quintus', csrf: 'disposable-ui-fixture',
      day: g.taipeiDay(), verified: {quintus:0,feifei:0,qingqing:0,doudou:0},
      legacy:false, canMigrate:false}));
    """
], cwd=ROOT))

checks, errors = [], []
instrument_audio = """(() => {
  const NativeAudio = window.Audio;
  window.__qaAudio = [];
  window.Audio = function(src) {
    const audio = new NativeAudio(src);
    window.__qaAudio.push(audio);
    return audio;
  };
  window.Audio.prototype = NativeAudio.prototype;
})();"""


def setup(browser, width=1280, player="quintus"):
    context = browser.new_context(viewport={"width": width, "height": 960}, reduced_motion="reduce")
    page = context.new_page()
    page.set_default_timeout(12000)
    page.on("pageerror", lambda error: errors.append(str(error)))
    state = dict(json.loads(json.dumps(fixture)), playerId=player, displayName=player)
    page.route("**/api/**", lambda route: route.fulfill(json=state))
    page.add_init_script(instrument_audio)
    page.goto(URL, wait_until="networkidle")
    return context, page, state


def nav(page, index):
    page.locator(".family-nav button").nth(index).click()


def playing(page, track=None):
    if track:
        page.wait_for_function("""track => {
          const active = window.__qaAudio.filter(a => a.loop && !a.paused);
          return active.length === 1 && active[0].src.includes(track) && active[0].currentTime > 0;
        }""", arg=track)
    else:
        page.wait_for_function("() => window.__qaAudio.every(a => !a.loop || a.paused)")


def voice(page, start):
    page.evaluate("""async start => {
      const voice = await import('/src/voice.ts');
      if(start) voice.playRecording('/assets/indie-air.mp3', undefined, () => {}, () => {});
      else voice.stopVoice();
    }""", start)


def visibility(page, hidden):
    page.evaluate("""hidden => {
      Object.defineProperty(document, 'hidden', {configurable:true, get:() => hidden});
      document.dispatchEvent(new Event('visibilitychange'));
    }""", hidden)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True,
        args=["--autoplay-policy=no-user-gesture-required"])
    try:
        context, page, state = setup(browser)
        playing(page, HOME_TRACK)
        nav(page, 1)
        playing(page, "beat-lab.mp3")
        info = page.evaluate("""() => {
          const a=window.__qaAudio.find(a=>a.loop&&!a.paused);
          window.__qaCompanion=a;
          return {duration:a.duration,volume:a.volume,loop:a.loop};
        }""")
        assert 144 < info["duration"] < 146 and info["volume"] == 0.3 and info["loop"], info
        checks.append(f"Homepage uses {HOME_TRACK}; collection decodes and plays full Beat Lab at 30% with loop")

        nav(page, 5)
        playing(page, "beat-lab.mp3")
        assert page.evaluate("() => window.__qaCompanion === window.__qaAudio.find(a=>a.loop&&!a.paused)")
        checks.append("Collection to team selection keeps the same playing audio without restart or overlap")

        page.locator("[data-music-control]").click()
        playing(page)
        nav(page, 1)
        page.get_by_role("textbox", name="搜尋夥伴").fill("潮")
        nav(page, 5)
        playing(page)
        assert page.locator("[data-music-control]").get_attribute("aria-pressed") == "false"
        checks.append("Manual pause persists through filters, typing and both companion pages")

        page.locator("[data-music-control]").click()
        playing(page, "beat-lab.mp3")
        voice(page, True)
        playing(page)
        page.wait_for_function("() => window.__qaAudio.some(a=>!a.loop&&!a.paused&&a.currentTime>0)")
        voice(page, False)
        playing(page, "beat-lab.mp3")
        visibility(page, True)
        playing(page)
        visibility(page, False)
        playing(page, "beat-lab.mp3")
        checks.append("Narration and hidden-tab events pause music, then restore it")

        page.locator("[data-music-control]").click()
        voice(page, True)
        voice(page, False)
        visibility(page, True)
        visibility(page, False)
        playing(page)
        nav(page, 0)
        playing(page)
        nav(page, 5)
        playing(page)
        checks.append("Explicit pause survives narration, visibility and homepage track changes")

        page.locator("[data-music-control]").click()
        playing(page, "beat-lab.mp3")
        page.locator(".pet-picker").first.locator("button").first.click()
        page.locator("main .f-primary").click()
        page.locator(".duel-stage").wait_for()
        playing(page, "battle-music.mp3")
        battle_info = page.evaluate("""() => {
          const a=window.__qaAudio.find(a=>a.loop&&!a.paused);
          return {duration:a.duration,volume:a.volume,loop:a.loop};
        }""")
        assert 79.9 < battle_info["duration"] < 80.1 and battle_info["volume"] == 0.3 and battle_info["loop"]
        page.locator("[data-music-control]").click()
        playing(page)
        page.locator(".battle-controls button").first.click()
        playing(page)
        page.locator("[data-music-control]").click()
        playing(page, "battle-music.mp3")
        voice(page, True)
        playing(page)
        voice(page, False)
        playing(page, "battle-music.mp3")
        page.get_by_role("button", name="⏹ 結束對戰", exact=True).click()
        page.locator("dialog").get_by_role("button", name="⏹ 結束", exact=True).click()
        playing(page, "beat-lab.mp3")
        checks.append("Arena switches to full 80-second Battle loop; manual pause and narration work; exit restores Beat Lab")

        page.locator("main .f-primary").click()
        playing(page, "battle-music.mp3")
        for _ in range(31):
            page.wait_for_function("""() => !!document.querySelector('.battle-controls button:not(:disabled)') ||
              [...document.querySelectorAll('button')].some(b=>b.textContent.includes('再來一場'))""")
            if page.get_by_role("button", name="↻ 再來一場", exact=True).count():
                break
            page.locator(".battle-controls button").first.click()
        page.get_by_role("button", name="↻ 再來一場", exact=True).wait_for()
        playing(page)
        assert page.locator("[data-music-control]").count() == 0
        checks.append("Arena music ends after the actual player/CPU battle and final animation")

        nav(page, 2)
        playing(page)
        nav(page, 0)
        playing(page, HOME_TRACK)
        page.locator(".family-hero-copy .f-primary").click()
        page.locator(".quiz-stage").wait_for()
        playing(page, "battle-music.mp3")
        page.get_by_role("button", name="播放題目聲音", exact=True).click()
        playing(page)
        playing(page, "battle-music.mp3")
        page.locator("[data-music-control]").click()
        page.get_by_role("button", name="播放題目聲音", exact=True).click()
        page.wait_for_function("() => window.__qaAudio.every(a=>a.paused)")
        assert page.locator("[data-music-control]").get_attribute("aria-pressed") == "false"
        page.locator("[data-music-control]").click()
        playing(page, "battle-music.mp3")
        visibility(page, True)
        playing(page)
        visibility(page, False)
        playing(page, "battle-music.mp3")
        page.evaluate("window.__qaBattle=window.__qaAudio.find(a=>a.loop&&!a.paused)")
        state["family"]["profiles"]["quintus"]["run"]["index"] = 1
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        page.wait_for_function("document.querySelector('.progress-dots .current')?.textContent==='2'")
        assert page.evaluate("window.__qaBattle===window.__qaAudio.find(a=>a.loop&&!a.paused)")
        checks.append("Quiz battle plays Battle; real question recording ducks/resumes it, preserves pause, and question change keeps the same track")

        run = state["family"]["profiles"]["quintus"]["run"]
        run.update(status="won", index=4, settled=True)
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        page.locator(".result-panel").wait_for()
        playing(page)
        run.update(status="active", index=0, settled=False)
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        playing(page, "battle-music.mp3")
        run.update(status="failed")
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        page.locator(".result-panel").wait_for()
        playing(page)
        checks.append("Quiz won and failed states stop battle music; restarting an active run restores it")
        context.close()

        for width in (320, 390):
            context, page, _ = setup(browser, width, "feifei")
            for index, name in ((1, "collection"), (5, "team")):
                nav(page, index)
                playing(page, "beat-lab.mp3")
                control = page.locator("[data-music-control]")
                box = control.bounding_box()
                assert box["width"] >= 44 and box["height"] >= 44, box
                assert box["x"] >= 0 and box["x"] + box["width"] <= width + 1, box
                if page.evaluate("document.documentElement.scrollWidth") > width + 1:
                    page.screenshot(path=str(OUT / f"overflow-{name}-{width}.png"), full_page=True)
                    raise AssertionError(page.evaluate("""() => [...document.querySelectorAll('body *')]
                      .map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right,
                        width:e.getBoundingClientRect().width,text:e.textContent.slice(0,60)}))
                      .filter(e=>e.right>innerWidth+1 && e.width>0).slice(0,15)"""))
                page.screenshot(path=str(OUT / f"{name}-{width}.png"))
            checks.append(f"Grade 2 / {width}px: controls fit, targets at least 44px, no page overflow")
            page.locator(".pet-picker").first.locator("button").first.click()
            page.locator("main .f-primary").click()
            playing(page, "battle-music.mp3")
            page.locator(".battle-controls button").first.click()
            box = page.locator("[data-music-control]").bounding_box()
            assert box["width"] >= 44 and box["height"] >= 44 and box["x"] + box["width"] <= width + 1
            assert box["y"] >= 0 and box["y"] + box["height"] <= 960, box
            page.screenshot(path=str(OUT / f"arena-{width}.png"))
            nav(page, 0)
            playing(page, HOME_TRACK)
            page.locator(".family-hero-copy .f-primary").click()
            playing(page, "battle-music.mp3")
            box = page.locator("[data-music-control]").bounding_box()
            assert box["width"] >= 44 and box["height"] >= 44 and box["x"] + box["width"] <= width + 1
            assert page.evaluate("document.documentElement.scrollWidth") <= width + 1
            page.screenshot(path=str(OUT / f"quiz-{width}.png"))
            answer = page.locator(".answer-grid [data-answer-option]").first
            answer.scroll_into_view_if_needed()
            assert answer.evaluate("e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}")
            if width == 390:
                page.set_viewport_size({"width":390,"height":568})
                page.wait_for_function("getComputedStyle(document.querySelector('.quiz-encounter')).position==='relative'")
            checks.append(f"Grade 2 / {width}px: arena and quiz music controls fit; quiz answers remain reachable")
            context.close()
    finally:
        browser.close()

    browser = playwright.chromium.launch(channel="chrome", headless=True)
    try:
        context, page, _ = setup(browser)
        playing(page)
        nav(page, 1)
        playing(page, "beat-lab.mp3")
        nav(page, 5)
        page.locator(".pet-picker").first.locator("button").first.click()
        page.locator("main .f-primary").click()
        playing(page, "battle-music.mp3")
        checks.append("Default autoplay policy: silent until interaction, then collection and arena tracks play correctly")
        context.close()
    finally:
        browser.close()

assert not errors, errors
result = {"checks": checks, "pageErrors": errors, "companionAudio": info, "battleAudio": battle_info}
(OUT / "verification.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(result, ensure_ascii=False, indent=2))
