import { Link2, ListVideo, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/SearchBar';

interface GuestHeroProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onJoin: () => void;
    onGuide: () => void;
}

// Hero cho khách (2026-09-14). Trước đây chỉ có "Khám phá Space" + ô tìm
// kiếm — không nói sản phẩm làm gì, không có lối vào ngoài nút góc header.
// Giờ: 1 câu nói việc sản phẩm làm, 2 nút, và 3 bước dạng "trang sổ" ở
// bên phải (lấy motif lề mực + dải bookmark của hệ ink, không phải card kit).
export default function GuestHero({ searchQuery, onSearchChange, onJoin, onGuide }: GuestHeroProps) {
    const steps = [
        { icon: Link2, text: 'Dán link YouTube' },
        { icon: ListVideo, text: 'Hệ thống tạo ngay Space với bài học đầu tiên' },
        { icon: CheckSquare, text: 'Học, làm quiz, theo dõi tiến độ' },
    ];

    return (
        <section className="mb-12 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 items-center">
            <div className="min-w-0">
                <h1 className="text-[clamp(28px,3.6vw,44px)] font-bold tracking-[-0.02em] leading-[1.12] text-ink-text">
                    Biến video YouTube thành khoá học của riêng bạn
                </h1>
                <p className="mt-4 text-[15.5px] leading-[1.65] text-ink-textMid max-w-[52ch]">
                    Dán một link, bạn có ngay một Space với bài học được sắp thứ tự, quiz kiểm tra và tiến độ được lưu lại. Miễn phí.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Button size="lg" className="vd-focusable bg-ink-accent hover:bg-ink-accent/90 text-white" onClick={onJoin}>
                        Tạo Space đầu tiên
                    </Button>
                    <Button size="lg" variant="ghost" className="vd-focusable text-ink-textMid hover:text-ink-text" onClick={onGuide}>
                        Xem cách hoạt động
                    </Button>
                </div>
                <div className="mt-7 max-w-md">
                    <SearchBar value={searchQuery} onChange={onSearchChange} placeholder="Hoặc tìm một Space có sẵn…" />
                </div>
            </div>

            {/* "Trang sổ": panel giấy có lề mực bên trái và dải bookmark góc
                trên phải — cùng motif với thẻ "Tiếp tục học" và vibe-demo. */}
            <div className="relative bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-md overflow-hidden">
                <div className="absolute inset-y-0 left-[44px] w-px bg-ink-marginLn" aria-hidden />
                <div
                    className="absolute top-0 right-6 w-[30px] h-11 bg-ink-accent z-[2]"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}
                    aria-hidden
                />
                <ol className="relative pl-[64px] pr-6 py-7 space-y-5">
                    {steps.map((step, i) => {
                        const Icon = step.icon;
                        return (
                            <li key={step.text} className="relative flex items-start gap-3">
                                <span className="absolute -left-[64px] top-0 w-[44px] text-center font-mono text-[12px] text-ink-textDim leading-6">
                                    {i + 1}
                                </span>
                                <span className="mt-0.5 w-7 h-7 rounded-md bg-ink-accentA text-ink-accent flex items-center justify-center shrink-0">
                                    <Icon size={15} />
                                </span>
                                <span className="text-[14.5px] leading-6 text-ink-text">{step.text}</span>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}
