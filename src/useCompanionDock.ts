import { useLayoutEffect, useState } from 'react';

/** Keep the corner launcher out of the way while a text field is being edited. */
export default function useCompanionDock(active: boolean) {
  const [editing, setEditing] = useState(false);
  useLayoutEffect(() => {
    if (!active) { setEditing(false); return; }
    const focus = () => setEditing(document.activeElement?.matches('input:not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable=true]') ?? false);
    focus();
    document.addEventListener('focusin', focus); document.addEventListener('focusout', focus);
    return () => {
      document.removeEventListener('focusin', focus); document.removeEventListener('focusout', focus);
    };
  }, [active]);
  return editing;
}
