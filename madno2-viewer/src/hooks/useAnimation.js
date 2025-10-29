import { useState, useEffect, useRef } from 'react';
import { ANIM_MS } from '../config/constants';

export function useAnimation(frames) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  // Reproducción
  useEffect(() => {
    if (!playing) return;
    if (timerRef.current) return; // ya hay un timer

    timerRef.current = setInterval(() => {
      setFrameIdx((idx) => {
        if (frames.length === 0) return 0;
        const next = idx + 1;
        return next >= frames.length ? 0 : next; // loop
      });
    }, ANIM_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, frames]);

  const handlePlay = () => setPlaying(true);
  const handlePause = () => setPlaying(false);
  const handleStop = () => {
    setPlaying(false);
    setFrameIdx(0);
  };

  return {
    frameIdx,
    setFrameIdx,
    playing,
    handlePlay,
    handlePause,
    handleStop,
  };
}
