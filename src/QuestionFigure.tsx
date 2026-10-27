import {useState} from 'react';
import type {LearningQuestion} from './learning';
import './question-figure.css';
export function useQuestionFigure(question?: Pick<LearningQuestion,'image'> | null){
 const [loaded,setLoaded]=useState<string|null>(null);
 const src=question?.image;
 return {ready:!src || loaded===src,onReady:(ok:boolean)=>setLoaded(ok?src??null:null)};
}
/** Original exam figure. Opening the asset keeps labels readable with browser zoom. */
export default function QuestionFigure({question,onReady}:{question:Pick<LearningQuestion,'image'|'imageAlt'>;onReady?:(ready:boolean)=>void}){
 if(!question.image)return null;
 return <Figure key={question.image} src={question.image} alt={question.imageAlt||'本題參考圖'} onReady={onReady} />;
}
function Figure({src,alt,onReady}:{src:string;alt:string;onReady?:(ready:boolean)=>void}){
 const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 return <figure className="question-figure">
  {!loaded&&!failed&&<p role="status">題圖載入中，請稍等再作答。</p>}
  {failed?<div role="alert"><p>題圖暫時沒有載入，請先重新載入圖片再作答。</p><button type="button" onClick={()=>{setFailed(false);setAttempt(n=>n+1);}}>重新載入題圖</button></div>:<img key={attempt} src={attempt?`${src}?retry=${attempt}`:src} alt={alt} onLoad={()=>{setLoaded(true);onReady?.(true);}} onError={()=>{setFailed(true);setLoaded(false);onReady?.(false);}} />}
  <figcaption><a href={src} target="_blank" rel="noopener noreferrer">放大看題圖（另開視窗）</a></figcaption>
 </figure>;
}
