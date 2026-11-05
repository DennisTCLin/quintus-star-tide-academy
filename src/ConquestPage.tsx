import type { ConquestDestination } from './ConquestHomeEntry';
import type { PlayerId } from './game-view';
import ConquestEnrollment from './ConquestEnrollment';
import ConquestGame from './ConquestGame';
import { conquestKey } from './conquest-store';
import type { SharedConquestController } from './conquest-cloud';

type Props = {controller:SharedConquestController;destination?:ConquestDestination;account:string;player:PlayerId;name:string;owned:Record<string,number>;growthXp:Record<string,number>;equipped:string;reduced:boolean;onLearn:()=>void;onLoadBack?:()=>void};
export default function ConquestPage({controller,destination,account,player,equipped,reduced,onLearn,onLoadBack}:Props) {
  const {snapshot,error,connected,busy,uncertain}=controller;
  const backup=()=>{const raw=localStorage.getItem(conquestKey(player,account));if(!raw)return;const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`星海群島-舊版-${player}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const connection=<div className="f-panel" role="status" data-testid="shared-conquest-status" data-revision={snapshot?.revision}><p>{connected?'共享戰場已連線 · 所有玩家共用 91 座島嶼 · 戰況每 5 秒更新':'正在連接共享戰場，連線恢復前不能出征。'}</p>{error&&<p>{error}</p>}{uncertain?<button disabled={busy} onClick={()=>void controller.retry().catch(()=>{})}>確認上次操作結果</button>:!connected&&<button onClick={()=>void controller.refresh()}>重新連線</button>}</div>;
  if(!snapshot)return <>{connection}<button onClick={onLoadBack}>返回港口</button></>;
  const state=snapshot.state;
  if(!state.enrollment)return <>{connection}<p className="f-panel">新的共享戰場從 50 能量、零領地啟航。原有卡冊與練等保留，舊版本機存檔不會被覆寫。</p><ConquestEnrollment error={busy?'正在儲存…':uncertain?'請先確認上次操作結果。':!connected?'請先連接共享戰場。':''} onBackup={backup} veteran={false} onJoin={async(alliance,hero)=>{await controller.act({type:'join',alliance,hero});}} /></>;
  const players=snapshot.players.map(p=>({id:p.id,name:p.name}));
  const sessions=Object.fromEntries([...players.map(p=>[p.id,state]),[snapshot.me,state]]);
  return <>{connection}<ConquestGame raidConnected={connected} onReadReports={controller.markReportsRead} serverNow={controller.now} destination={destination} player={snapshot.me} players={players} sessions={sessions} owned={snapshot.collection.owned} growthXp={snapshot.collection.growthXp} equipped={equipped} reduced={reduced} onLearn={onLearn} storageError={uncertain?'上次操作尚待確認。':!connected?'共享戰場已離線，請重新連線。':busy?'正在儲存戰果…':undefined} onAct={action=>controller.act(action)} /><details className="f-panel"><summary>舊版航海誌</summary><p>原本的本機 PvE 存檔仍保留，與共享戰場分開。</p><button onClick={backup}>下載舊版群島存檔</button></details></>;
}
