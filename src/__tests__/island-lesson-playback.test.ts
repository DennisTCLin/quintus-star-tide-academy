import { afterEach,beforeEach,describe,it,expect,vi } from 'vitest';
import { playLessonBeat } from '../island/lesson-playback';
const mock=vi.hoisted(()=>({end:()=>{},stop:vi.fn()}));
vi.mock('../island/speech',()=>({sayThen:vi.fn((_text,done)=>{mock.end=done;return mock.stop;})}));
beforeEach(()=>{vi.useFakeTimers();mock.stop.mockClear();});
afterEach(()=>vi.useRealTimers());
describe('lesson voice and motion timing',()=>{
  it('waits for narration even when the animation has finished',()=>{
    const done=vi.fn();playLessonBeat('一',true,done,()=>{});
    vi.advanceTimersByTime(3000);expect(done).not.toHaveBeenCalled();
    mock.end();expect(done).toHaveBeenCalledOnce();
  });
  it('holds a visible beat when a voice ends immediately',()=>{
    const done=vi.fn();playLessonBeat('一',true,done,()=>{});mock.end();
    vi.advanceTimersByTime(899);expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);expect(done).toHaveBeenCalledOnce();
  });
  it('does not advance or keep speaking after pause, replay or leaving the lesson',()=>{
    const done=vi.fn(),stop=playLessonBeat('一',true,done,()=>{});stop();mock.end();vi.runAllTimers();
    expect(done).not.toHaveBeenCalled();expect(mock.stop).toHaveBeenCalledOnce();
  });
  it('allows time to read the full caption when teaching audio is turned off',()=>{
    const text='一個一個數，看看全部有多少。',done=vi.fn();playLessonBeat(text,false,done,()=>{});mock.end();
    vi.advanceTimersByTime(1600);expect(done).not.toHaveBeenCalled();
    vi.runAllTimers();expect(done).toHaveBeenCalledOnce();
  });
});
