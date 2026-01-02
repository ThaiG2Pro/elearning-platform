import React, { useRef, useEffect, useMemo } from 'react';
import YouTube from 'react-youtube';

interface Props {
    videoId: string;
    initialPos: number;
    onProgress: (time: number) => void;
    onDuration: (duration: number) => void;
    onFlush: (time: number) => void;
}

const YoutubePlayer = ({ videoId, initialPos, onProgress, onDuration, onFlush }: Props) => {
    const playerRef = useRef<any>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialSeekDone = useRef(false);

    // Quan trọng: Chỉ thực hiện Seek khi Clock thực sự chạy
    const processTracking = () => {
        const player = playerRef.current;
        if (!player || typeof player.getPlayerState !== 'function') return;

        const state = player.getPlayerState();
        const time = player.getCurrentTime();

        // Log này bây giờ sẽ phải thay đổi khi bạn Play/Pause
        console.log(`[Atomic Tick] State: ${state} | Time: ${time.toFixed(2)}`);

        if (state === 1) { // PLAYING
            if (time > 0) {
                // Seek lần đầu nếu cần
                if (!isInitialSeekDone.current) {
                    if (initialPos > 0) {
                        console.log(">>> [Atomic] Thực hiện Initial Seek:", initialPos);
                        player.seekTo(initialPos, true);
                    }
                    isInitialSeekDone.current = true;
                    return;
                }
                // Gửi tiến độ bài học
                onProgress(time);
            }
        }
        // Nếu bị kẹt ở CUED (5) khi đáng lẽ phải chạy, ta không can thiệp bằng code nữa
        // để tránh loop vô tận, mà đợi người dùng click.
    };

    const startEngine = (playerInstance: any) => {
        // Cập nhật instance mới nhất vào Ref
        playerRef.current = playerInstance;

        if (!intervalRef.current) {
            console.log(">>> [Atomic] Khởi động Engine");
            intervalRef.current = setInterval(processTracking, 1000);
        }
    };

    useEffect(() => {
        // Reset khi đổi videoId (chuyển bài)
        isInitialSeekDone.current = false;

        const handleBeforeUnload = () => {
            const p = playerRef.current;
            if (p && typeof p.getCurrentTime === 'function') {
                const lastTime = Math.floor(p.getCurrentTime());
                // Gọi callback để cha xử lý lưu lần cuối
                onFlush(lastTime);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                console.log(">>> [Atomic] Hủy Engine");
            }
        };
    }, [videoId, onFlush]);

    const opts = useMemo(() => ({
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1
        },
    }), []);

    return (
        <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg">
            <YouTube
                videoId={videoId}
                opts={opts}
                onReady={(e: any) => {
                    playerRef.current = e.target;
                    const duration = e.target.getDuration();
                    onDuration(Math.floor(duration));
                    startEngine(e.target);
                }}
                onStateChange={(e: any) => {
                    // Cập nhật lại instance mỗi khi có thay đổi trạng thái
                    playerRef.current = e.target;
                    startEngine(e.target);
                }}
            // react-youtube will render an iframe that fills the parent when width/height are 100%
            />
        </div>
    );
};

export default React.memo(YoutubePlayer); // Chống re-render thừa
