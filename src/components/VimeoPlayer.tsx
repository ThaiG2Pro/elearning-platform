import React, { useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { VideoPlayerHandle } from './YoutubePlayer';

interface Props {
    videoId: string;
    initialPos: number;
    onProgress: (time: number) => void;
    onDuration: (duration: number) => void;
    onFlush: (time: number) => void;
    onEnded?: () => void;
    // Porting logic từ vibe-demo/page.tsx: nền phòng dịu (bg-ink-pageDim) khi
    // video đang chạy — cha (learn/page.tsx) cần biết trạng thái play/pause.
    onPlay?: () => void;
    onPause?: () => void;
    // Cùng hợp đồng với YoutubePlayer: khi nằm trong stage 16:9 của
    // learn/page.tsx, player lấp phần còn lại (flex-1) thay vì tự giữ
    // aspect-video — xem chú thích ở YoutubePlayer.
    fill?: boolean;
}

/**
 * WP1.5.3: Vimeo URLs already had thumbnail support (VideoThumbnailUtil) but
 * no playback adapter — they fell into the plain `<video>` tag, which can't
 * play an oEmbed page URL, so it silently didn't play. This talks to the
 * Vimeo player iframe via its postMessage protocol (no extra dependency —
 * every Vimeo embed responds to this without needing the player.js SDK).
 */
const VimeoPlayer = forwardRef<VideoPlayerHandle, Props>(({ videoId, initialPos, onProgress, onDuration, onFlush, onEnded, onPlay, onPause, fill }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const readyRef = useRef(false);
    const lastKnownTimeRef = useRef(0);
    const durationRef = useRef(0);
    const seekedInitialRef = useRef(false);

    const post = (method: string, value?: unknown) => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ method, value }), '*');
    };

    useImperativeHandle(ref, () => ({
        seekTo: (seconds: number) => post('setCurrentTime', seconds),
        getCurrentTime: () => lastKnownTimeRef.current,
    }), []);

    useEffect(() => {
        readyRef.current = false;
        seekedInitialRef.current = false;

        const handleMessage = (event: MessageEvent) => {
            if (typeof event.data !== 'string') return;
            let data: any;
            try {
                data = JSON.parse(event.data);
            } catch {
                return;
            }

            if (data.event === 'ready') {
                readyRef.current = true;
                post('addEventListener', 'timeupdate');
                post('addEventListener', 'finish');
                post('addEventListener', 'play');
                post('addEventListener', 'pause');
                post('getDuration');
            } else if (data.event === 'timeupdate' && data.data) {
                lastKnownTimeRef.current = data.data.seconds;
                if (!seekedInitialRef.current) {
                    seekedInitialRef.current = true;
                    if (initialPos > 0) post('setCurrentTime', initialPos);
                    return;
                }
                onProgress(data.data.seconds);
            } else if (data.event === 'finish') {
                onEnded?.();
            } else if (data.event === 'play') {
                onPlay?.();
            } else if (data.event === 'pause') {
                onPause?.();
            } else if (data.method === 'getDuration' && typeof data.value === 'number') {
                durationRef.current = data.value;
                onDuration(Math.floor(data.value));
            }
        };

        window.addEventListener('message', handleMessage);

        const handleBeforeUnload = () => onFlush(Math.floor(lastKnownTimeRef.current));
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId]);

    const embedUrl = useMemo(
        () => `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`,
        [videoId]
    );

    return (
        // Không còn viền/bo góc/shadow riêng — khung "màn hình rạp" ở learn/page.tsx
        // (bg-ink-screen, border-ink-borderHi) giờ là viền duy nhất bọc quanh player.
        <div className={`vimeo-player-wrapper w-full overflow-hidden ${fill ? 'flex-1 min-h-0' : 'aspect-video'}`}>
            <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Vimeo video player"
            />
        </div>
    );
});

VimeoPlayer.displayName = 'VimeoPlayer';

export default React.memo(VimeoPlayer);
