import React, { useRef, useEffect, useState } from 'react';

interface HLSPlayerProps {
  src: string | null;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  onError?: (msg: string) => void;
  onPlaying?: () => void;
}

/**
 * HLS video player using hls.js.
 * Falls back to native HLS (Safari) if hls.js is not supported.
 * Auto-retries on stream disconnect with exponential backoff.
 */
const HLSPlayer: React.FC<HLSPlayerProps> = ({
  src,
  autoPlay = true,
  muted = true,
  className = '',
  onError,
  onPlaying,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 8;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanup = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const retryWithBackoff = (initPlayer: () => void) => {
    const count = retryCountRef.current;
    if (count >= MAX_RETRIES) {
      setErrorMsg('Stream unavailable — camera may be offline');
      setIsLoading(false);
      onError?.('Max retries reached');
      return;
    }
    const delay = Math.min(1000 * 2 ** count, 30000); // max 30s
    retryCountRef.current = count + 1;
    console.log(`[HLSPlayer] Retry ${count + 1}/${MAX_RETRIES} in ${delay}ms`);
    retryTimerRef.current = setTimeout(() => {
      cleanup();
      initPlayer();
    }, delay);
  };

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    retryCountRef.current = 0;

    const video = videoRef.current;
    if (!video) return;

    const initPlayer = async () => {
      try {
        // Dynamically import hls.js to avoid bundle issues
        const Hls = (await import('hls.js' as any)).default;

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 30,
            maxBufferLength: 20,
            maxMaxBufferLength: 60,
          });
          hlsRef.current = hls;

          hls.loadSource(src);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            retryCountRef.current = 0;
            setIsLoading(false);
            setErrorMsg(null);
            if (autoPlay) {
              video.play().catch(() => {
                // Autoplay blocked — require user interaction (muted autoplay usually works)
              });
            }
          });

          hls.on(Hls.Events.ERROR, (_: any, data: any) => {
            if (data.fatal) {
              console.error('[HLSPlayer] Fatal error:', data);
              setErrorMsg('Stream error — reconnecting...');
              retryWithBackoff(initPlayer);
            }
          });

          video.addEventListener('playing', () => {
            setIsLoading(false);
            setErrorMsg(null);
            onPlaying?.();
          });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS (Safari / iOS)
          video.src = src;
          video.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            if (autoPlay) video.play().catch(() => {});
          });
          video.addEventListener('error', () => {
            setErrorMsg('Stream unavailable');
            retryWithBackoff(initPlayer);
          });
        } else {
          setErrorMsg('HLS not supported in this browser');
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('[HLSPlayer] Init error:', err);
        setErrorMsg('Player failed to initialize');
        retryWithBackoff(initPlayer);
      }
    };

    initPlayer();

    return () => {
      cleanup();
    };
  }, [src]);

  return (
    <div className={`cctv-player-container ${className}`} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        muted={muted}
        playsInline
        autoPlay={autoPlay}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', background: '#000' }}
      />
      {isLoading && !errorMsg && (
        <div className="cctv-stream-loading">
          <div className="cctv-stream-spinner" />
          <span style={{ fontSize: '0.72rem', color: 'var(--cctv-text-muted)' }}>Connecting to stream...</span>
        </div>
      )}
      {errorMsg && (
        <div className="cctv-offline-overlay">
          <svg className="cctv-offline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span className="cctv-offline-text">{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

export default HLSPlayer;
