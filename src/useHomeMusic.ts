import { useEffect, useRef, useState } from "react";
import { stopVoice, subscribeVoiceActivity } from "./voice";

export const HOME_MUSIC = "/assets/in-a-dreamworld.mp3?v=d43ca2a743ad";
export const COMPANION_MUSIC = "/assets/beat-lab.mp3?v=c6e7efaf70a7";
export const BATTLE_MUSIC = "/assets/battle-music.mp3?v=6dd6833cd7a3";

export default function useHomeMusic(active: boolean, source = HOME_MUSIC) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabled = useRef(true);
  const epoch = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    epoch.current++;
    const previous = audioRef.current;
    const audio = previous?.getAttribute("src") === source ? previous : new Audio(source);
    if (previous && previous !== audio) {
      previous.pause();
      previous.removeAttribute("src");
      previous.load();
    }
    audioRef.current = audio;
    setPlaying(false);
    setFailed(false);
    audio.loop = true;
    audio.volume = 0.3;
    audio.preload = "metadata";
    let disposed = false;
    let narrating = false;
    const onPlay = () => { setPlaying(true); setFailed(false); };
    const onPause = () => setPlaying(false);
    const onError = () => { setPlaying(false); setFailed(true); };
    const play = () => {
      if (disposed || narrating || !active || !enabled.current || document.hidden || !audio.paused) return;
      void audio.play().catch((error: unknown) => {
        if (disposed) return;
        if (error instanceof DOMException &&
          (error.name === "NotAllowedError" || error.name === "AbortError")) return;
        onError();
      });
    };
    const onGesture = (event: Event) => {
      // The music button manages its own gesture, including an explicit pause.
      if (event.target instanceof Element && event.target.closest("[data-music-control]")) return;
      if (event instanceof KeyboardEvent && (event.repeat || event.ctrlKey || event.metaKey || event.altKey)) return;
      play();
    };
    const onVisibility = () => {
      if (document.hidden) audio.pause();
      else play();
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    const unsubscribeVoice = subscribeVoiceActivity((speaking) => {
      narrating = speaking;
      if (speaking) audio.pause();
      else play();
    });
    if (!active || !enabled.current) audio.pause();
    window.addEventListener("pointerup", onGesture);
    window.addEventListener("keydown", onGesture);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      epoch.current++;
      unsubscribeVoice();
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      window.removeEventListener("pointerup", onGesture);
      window.removeEventListener("keydown", onGesture);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, source]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio || !active) return;
    if (!audio.paused) {
      enabled.current = false;
      audio.pause();
      setPlaying(false);
    } else {
      stopVoice();
      enabled.current = true;
      setFailed(false);
      if (audio.error) audio.load();
      const attempt = epoch.current;
      void audio.play().catch((error: unknown) => {
        if (attempt !== epoch.current) return;
        if (error instanceof DOMException && (error.name === "AbortError" || error.name === "NotAllowedError")) return;
        setFailed(true);
      });
    }
  }

  return { playing, failed, toggle };
}
