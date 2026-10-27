import {Children,cloneElement,isValidElement,type ReactNode,type ReactElement} from 'react';
import {syllables,annotateTree} from './readability';
import {renderBrandText} from './BrandIcon';
import {PhoneticText} from './PhoneticText';
// Annotate key actions rather than expanding every supporting sentence into a wall of ruby.
const actions=new Set(['慢慢想','限時','出發！','下一題','聽玩法']);
export function readyReading(node:ReactNode,grade:number):ReactNode {
 if(grade!==2)return annotateTree(node,grade);
 return Children.map(node,child=>{
  if(typeof child==='string')return actions.has(child)?renderBrandText(child,text=>syllables(text).map((x,i)=>x.zy?<ruby className="ready-ruby" key={i}>{x.text}<rt><PhoneticText text={x.zy}/></rt></ruby>:x.text)):renderBrandText(child);
  if(!isValidElement(child))return child;
  const el=child as ReactElement<{children?:ReactNode}>;
  return el.props.children?cloneElement(el,{},readyReading(el.props.children,grade)):el;
 });
}
