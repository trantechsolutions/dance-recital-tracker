import { useEffect, useRef, useState, useCallback } from 'react';
import { SoundSegmenter } from '../utils/soundSegmenter';

// Microphone → loudness + spectral flatness every 100 ms → SoundSegmenter.
// Audio is analysed in memory on this device; nothing is recorded or sent.
// Also holds a screen wake lock while listening so the phone doesn't sleep
// (a sleeping page stops hearing).
//
// Returns { status: 'off'|'starting'|'listening'|'error', error, level (0..1),
// kind ('music'|'noise'|'quiet'), reset() }. `onPropose` fires when new music
// starts after a dance has ended.
export function useListeningAssist({ enabled, onPropose }) {
  const [status, setStatus] = useState('off');
  const [error, setError] = useState(null);
  const [level, setLevel] = useState(0);
  const [kind, setKind] = useState('quiet');
  const segRef = useRef(new SoundSegmenter());
  const proposeRef = useRef(onPropose);
  useEffect(() => { proposeRef.current = onPropose; }, [onPropose]);

  const reset = useCallback(() => segRef.current.reset(performance.now()), []);

  useEffect(() => {
    if (!enabled) { setStatus('off'); return; }
    let stream, ctx, timer, wakeLock, cancelled = false;

    const lockScreen = async () => {
      try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* not supported / denied */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') lockScreen(); };

    (async () => {
      setStatus('starting');
      setError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser can’t use the microphone.');
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        if (cancelled) { stream.getTracks().forEach(tr => tr.stop()); return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        src.connect(analyser);

        const time = new Float32Array(analyser.fftSize);
        const freq = new Float32Array(analyser.frequencyBinCount);
        // Flatness over ~100 Hz – 8 kHz, where music and applause differ most.
        const hzPerBin = ctx.sampleRate / analyser.fftSize;
        const lo = Math.max(1, Math.floor(100 / hzPerBin));
        const hi = Math.min(freq.length - 1, Math.ceil(8000 / hzPerBin));

        segRef.current.reset(performance.now());
        await lockScreen();
        document.addEventListener('visibilitychange', onVisible);
        setStatus('listening');

        timer = setInterval(() => {
          analyser.getFloatTimeDomainData(time);
          let sum = 0;
          for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
          const rms = Math.sqrt(sum / time.length);

          analyser.getFloatFrequencyData(freq);
          let logSum = 0, linSum = 0, n = 0;
          for (let i = lo; i <= hi; i++) {
            const p = Math.max(1e-12, Math.pow(10, freq[i] / 10));
            logSum += Math.log(p); linSum += p; n++;
          }
          const flatness = n && linSum > 0 ? Math.exp(logSum / n) / (linSum / n) : 0;

          const seg = segRef.current;
          const event = seg.push({ t: performance.now(), rms, flatness });
          setLevel(Math.min(1, rms * 8));
          setKind(seg.kind);
          if (event === 'propose') proposeRef.current?.();
        }, 100);
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setError(e?.name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow it in your browser settings to use listening assist.'
          : (e?.message || 'The microphone could not be started.'));
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      stream?.getTracks().forEach(tr => tr.stop());
      ctx?.close().catch(() => {});
      wakeLock?.release?.().catch(() => {});
    };
  }, [enabled]);

  return { status, error, level, kind, reset };
}
