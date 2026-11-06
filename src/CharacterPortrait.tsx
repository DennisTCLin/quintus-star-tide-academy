import { useLayoutEffect, useRef, type CSSProperties, type ImgHTMLAttributes } from 'react';
import { portraitMotion, portraitPhase, type PortraitPose } from './character-motion';
import './character-portrait.css';
import { observePortrait, refreshPortraitVisibility } from './portrait-visibility';


type Props = ImgHTMLAttributes<HTMLImageElement> & {
  characterId: string;
  motion?: string;
  pose?: PortraitPose;
  paused?: boolean;
};

/** Keeps the existing image, alt text, event handlers and CSS layout intact. */
export default function CharacterPortrait({ characterId, motion, pose = 'idle', paused = false, className = '', style, onLoad, onError, ...props }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => ref.current ? observePortrait(ref.current) : undefined, [props.src, props.srcSet]);
  return <img {...props} ref={ref} onLoad={event => { refreshPortraitVisibility(); onLoad?.(event); }} onError={event => { refreshPortraitVisibility(); onError?.(event); }} className={`character-portrait ${className}`}
    data-character-id={characterId} data-character-motion={portraitMotion(characterId, motion)}
    data-character-pose={pose} data-character-paused={paused || pose === 'locked' || pose === 'defeated'}
    style={{ '--portrait-phase': `${portraitPhase(characterId)}s`, ...style } as CSSProperties} />;
}
