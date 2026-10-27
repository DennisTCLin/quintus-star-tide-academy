import { useEffect, useRef, useState } from "react";

// Visibility only controls cosmetic work. It must never advance a battle turn.
export function observeStageVisibility(target: Element, onChange: (visible: boolean) => void) {
  const doc = target.ownerDocument;
  const Observer = doc.defaultView?.IntersectionObserver;
  let onScreen = typeof Observer !== "function";
  let disposed = false;
  let last: boolean | undefined;
  const publish = () => {
    const visible = onScreen && !doc.hidden;
    if (!disposed && visible !== last) { last = visible; onChange(visible); }
  };
  doc.addEventListener("visibilitychange", publish);
  const observer = typeof Observer === "function" ? new Observer(entries => {
    if (disposed) return;
    // A delivery may include more than one crossing for this stage.
    for (const entry of entries) if (entry.target === target) onScreen = entry.isIntersecting;
    publish();
  }) : undefined;
  publish();
  observer?.observe(target);
  return () => {
    disposed = true;
    doc.removeEventListener("visibilitychange", publish);
    observer?.disconnect();
  };
}

export function useStageVisibility() {
  const stageRef = useRef<HTMLDivElement>(null);
  // Render still artwork until the observer establishes actual stage visibility.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (stageRef.current) return observeStageVisibility(stageRef.current, setVisible);
  }, []);
  return { stageRef, visible };
}
