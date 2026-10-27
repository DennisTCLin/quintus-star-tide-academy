import ReadAloud, { allowsReadAloud } from './ReadAloud';
import { useState } from 'react';
import { annotateTree } from './readability';
import type { useCompanionConversation } from './useCompanionConversation';
type Props={characterName?:string;voice:ReturnType<typeof useCompanionConversation>;grade:number;online:boolean;onHelp:()=>void};
export default function CompanionVoiceChat({voice,grade,online,onHelp,characterName = '潮光獸'}:Props){
  const [draft,setDraft]=useState(''),[confirmReset,setConfirmReset]=useState(false);
  const {status,state}=voice,last=state.history[state.history.length - 1];
  const busy=['permission','recording','thinking','loading-audio'].includes(status);
  const statusText=status==='permission'?'請允許麥克風，準備好了就能說話。':status==='recording'?'我在聽！說完按送出。':status==='thinking'?'我聽到了，正在想怎麼回答你…':status==='loading-audio'?'正在準備聲音…':status==='speaking'?`${characterName}正在說話`:last?'輪到你囉！可以接著剛剛的話說。':'你好！按麥克風，和我分享今天的事吧。';
  return annotateTree(<section className="tide-voice-chat" aria-label={`和${characterName}說話`}>
    <div className="tide-voice-status" role="status"><span aria-hidden="true">{status==='recording'?'🎙️':status==='thinking'?'💭':status==='speaking'?'🔊':'💬'}</span><span>{statusText}</span></div>
    <div className="tide-mic-controls">
      {status==='recording'?<button className="tide-mic recording" onClick={voice.finish}><span className="tide-mic-icon" aria-hidden="true">⏹</span><span>說完了，送出</span><small>{Math.min(25,voice.seconds)} / 25 秒</small></button>:<button className="tide-mic" disabled={busy||!voice.loaded||!state.available||!online} onClick={voice.start}><span className="tide-mic-icon" aria-hidden="true">🎙️</span><span>{status==='speaking'?'換我說話':'點一下，說話'}</span></button>}
      {(status==='recording'||status==='permission')&&<button className="tide-cancel-recording" onClick={voice.stop}>✕ 取消這次錄音</button>}
    </div>
    <ReadAloud grade={grade}><button data-read-aloud className="tide-voice-help" disabled={busy} onClick={onHelp} aria-label={`聽怎麼和${characterName}說話`}>🔊 聽怎麼玩</button></ReadAloud>
    {last&&<div className="tide-voice-turn"><p className="tide-heard">你剛剛說：{last.user}</p><div className="tide-bubble"><p>{last.reply}</p>{(allowsReadAloud(grade) || status === 'speaking') && <button disabled={busy} onClick={()=>status==='speaking'?voice.stop():void voice.play(last)}><span aria-hidden="true">{status==='speaking'?'⏸':'🔊'}</span> {status==='speaking'?'停止播放':'聽回覆'}</button>}</div></div>}
    {voice.error&&<div className="tide-error" role="status"><p>{voice.error}</p>{voice.playbackFailed&&last?<button disabled={busy||!online} onClick={()=>void voice.play(last)}>再聽一次</button>:<button disabled={busy||!online} onClick={voice.retry}>{voice.hasPending?'重試送出':'重新連線'}</button>}</div>}
    {voice.loaded&&!state.available&&<p className="tide-error">語音學伴還沒連線，可以先用下面的圖卡聊天。</p>}
    {!voice.loaded&&!voice.error&&<p className="tide-care-note">正在找回我們的對話…</p>}
    <p className="tide-care-note">我會記得最近聊過的事。說完一小句，再輪到我。</p>
    <details className="tide-voice-details"><summary>💬 剛剛聊了什麼</summary><ol>{state.history.map(turn=><li key={turn.id}><p>你：{turn.user}</p><p>{characterName}：{turn.reply}</p></li>)}</ol>{!state.history.length&&<p>還沒有對話，一起打聲招呼吧！</p>}
      {confirmReset?<div className="tide-reset-confirm"><p>清除這裡的對話，重新聊嗎？</p><button disabled={busy} onClick={()=>{setConfirmReset(false);void voice.reset();}}>清除對話</button><button onClick={()=>setConfirmReset(false)}>保留</button></div>:<button disabled={busy||!voice.loaded||!online} onClick={()=>setConfirmReset(true)}>重新聊</button>}
    </details>
    <details className="tide-voice-details"><summary>⌨️ 也可以打字</summary><form onSubmit={event=>{event.preventDefault();voice.type(draft);setDraft('');}}><label htmlFor="tide-typed-message">想告訴{characterName}的話</label><textarea id="tide-typed-message" value={draft} maxLength={400} rows={2} onChange={event=>setDraft(event.target.value)}/><button disabled={busy||status==='speaking'||!draft.trim()||!voice.loaded||!state.available||!online}>送出</button></form></details>
    <details className="tide-voice-details"><summary>👨‍👩‍👧 家長：語音與記憶</summary><p>按麥克風後才會收音，最多 25 秒；取消、關閉視窗或切到背景就會停止收音。請在瀏覽器允許此網站使用麥克風。</p><p>錄音和對話會送到 OpenAI 產生回覆。網站不保存原始錄音；每位孩子各自保存最近 12 輪文字對話，最多 7 天，可用「重新聊」清除。已送出的訊息在關閉畫面後仍可能完成處理。</p><p>即時對話暫用 OpenAI 聲線，{characterName === '潮光獸' ? '固定歡迎與互動語句使用 Kiki。' : '互動語句使用 Kiki 或裝置朗讀。'}這些聲音由 AI 產生，回答可能有誤。請避免說出姓名、地址、電話或學校。{allowsReadAloud(grade) ? '聲音未播放時，請按「聽回覆」，並確認裝置音量。' : '回覆文字會顯示在對話中。'}</p></details>
  </section>,grade);
}
