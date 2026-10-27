import { useEffect, useRef, type ReactNode } from "react";
export default function SocialDialog({title,onClose,children,wide=false,scrollBody=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean;scrollBody?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close();},[]);
  return <dialog ref={ref} className={`social-dialog ${wide?"social-wide":""} ${scrollBody?"social-scroll-shell":""}`} aria-label={title} onCancel={event=>{event.preventDefault();onClose();}}>
    <div className="social-dialog-heading"><h2>{title}</h2><button autoFocus type="button" aria-label="關閉" onClick={onClose}>✕</button></div>
    {scrollBody ? <div className="social-scroll-body" tabIndex={0} role="region" aria-label={title}>{children}</div> : children}
  </dialog>;
}
