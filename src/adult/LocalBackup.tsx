import{useState}from'react';
import{ADULT_KEY}from'./engine';
/** Download only the original device-local namespace. Never import client XP into an account. */
export default function LocalBackup(){
 const[notice,setNotice]=useState('');
 function download(){
  try{const raw=localStorage.getItem(ADULT_KEY);if(raw===null){setNotice('這台裝置沒有舊版本機英文紀錄；帳號中的雲端成果會繼續保留。');return;}
   const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='star-tide-adult-english-device-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('已下載原始本機備份；未上傳或覆寫雲端進度。');
  }catch{setNotice('這台裝置暫時無法讀取本機備份，原有資料未更動。');}
 }
 return <div className="adult-local-backup"><button type="button" onClick={download}>下載這台裝置的舊版英文備份</button><small>舊版本機紀錄保留在原裝置，不會自動匯入帳號。</small>{notice&&<p role="status">{notice}</p>}</div>;
}
