'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, MessageCircle } from 'lucide-react';
import Header from '@/components/Header';
import SalesAgentWidget from '@/components/ai/SalesAgentWidget';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';
import { FAQ_TOPICS, ALL_QUESTIONS } from '@/content/faq';

// Trang /faq v2 (2026-09-15) — cùng ngôn ngữ với /pricing v3: một cột đọc,
// mọi câu trả lời hiện sẵn dạng bảng định nghĩa (câu hỏi trái, trả lời
// phải) thay cho accordion phải bấm từng câu. Mỗi câu có anchor `#<id>`
// nên /pricing hay chat có thể dẫn thẳng tới đúng câu. Điểm nhấn duy nhất
// của trang là câu hay được hỏi nhất, trích lớn ngay đầu.
const HIGHLIGHT_QUESTION_ID = 'co-mat-phi-khong';

const SUPPORT_CHAT_URL = process.env.NEXT_PUBLIC_SUPPORT_CHAT_URL;
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const SUPPORT_URL = SUPPORT_CHAT_URL || (SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : undefined);
const SUPPORT_LABEL = SUPPORT_CHAT_URL ? 'Nhắn hỗ trợ' : SUPPORT_EMAIL;

// Nhãn topic trong src/content/faq.ts có emoji đầu dòng cho menu chat; trang
// tĩnh dùng chữ thuần, bỏ emoji để tiêu đề đọc như mục sách.
const stripEmoji = (label: string) => label.replace(/^[^\p{L}\p{N}]+/u, '').trim();

// Nội dung câu trả lời viết kiểu markdown tối giản: **đậm**, xuống dòng,
// gạch đầu dòng "• ". Render giữ nguyên dòng, không dùng thư viện.
function formatAnswer(text: string) {
    const lines = text.split('\n');
    return lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
            <span key={i}>
                {parts.map((part, j) => (j % 2 === 1 ? <strong key={j} className="font-semibold text-ink-text">{part}</strong> : part))}
                {i < lines.length - 1 && <br />}
            </span>
        );
    });
}

export default function FaqContent() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        setUser(AuthUtils.getCurrentUser());
    }, []);

    const handleLogout = async () => {
        try {
            await apiLogout();
        } finally {
            setUser(null);
        }
    };

    const topics = FAQ_TOPICS.filter((t) => !t.directEscalate);
    const highlight = ALL_QUESTIONS[HIGHLIGHT_QUESTION_ID];
    const questionCount = topics.reduce((n, t) => n + t.questions.length, 0);

    return (
        <div className="min-h-screen bg-ink-page flex flex-col">
            <Header user={user} onLogout={handleLogout} onJoin={() => router.push('/join')} />

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 md:pt-12 pb-16">
                <div className="max-w-[60ch]">
                    <h1 className="text-[clamp(26px,3.2vw,36px)] font-bold tracking-[-0.02em] leading-[1.15] text-ink-text">
                        Hỏi đáp
                    </h1>
                    <p className="mt-3 text-[15px] text-ink-textMid leading-relaxed">
                        {questionCount} câu trả lời đúng với cách nền tảng hoạt động thật, hiện sẵn, không cần bấm mở.
                    </p>
                </div>

                {/* Hàng nhảy nhanh tới từng chủ đề. Chỉ là link chữ, không tab. */}
                <nav aria-label="Chủ đề" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    {topics.map((t) => (
                        <a
                            key={t.id}
                            href={`#${t.id}`}
                            className="vd-focusable inline-flex items-center gap-1 font-medium text-ink-accent hover:underline"
                        >
                            {stripEmoji(t.label)}
                            <ChevronRight size={14} className="rotate-90" />
                        </a>
                    ))}
                </nav>

                {/* Điểm nhấn duy nhất: câu hay được hỏi nhất, trích lớn. */}
                {highlight && (
                    <blockquote className="mt-10 border-l-2 border-ink-accent pl-5 sm:pl-6 py-1 max-w-[62ch]">
                        <p className="text-[13px] text-ink-textMuted">Câu hay được hỏi nhất</p>
                        <p className="mt-1 text-[15px] font-semibold text-ink-text">{highlight.label}</p>
                        <p className="mt-2 text-[clamp(17px,2vw,21px)] font-semibold leading-snug tracking-[-0.01em] text-ink-text">
                            {formatAnswer(highlight.answer)}
                        </p>
                    </blockquote>
                )}

                {topics.map((topic) => {
                    const questions = topic.questions.filter((q) => q.id !== HIGHLIGHT_QUESTION_ID);
                    if (questions.length === 0) return null;
                    return (
                        <section key={topic.id} id={topic.id} className="mt-12 scroll-mt-20">
                            <h2 className="text-[19px] font-bold tracking-[-0.01em] text-ink-text">{stripEmoji(topic.label)}</h2>
                            <dl className="mt-4 border-t border-ink-border">
                                {questions.map((q) => (
                                    <div
                                        key={q.id}
                                        id={q.id}
                                        className="group grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-8 gap-y-1.5 py-5 border-b border-ink-border scroll-mt-20 target:bg-ink-accentA target:-mx-3 target:px-3 rounded-ink-sm"
                                    >
                                        <dt className="text-[15px] font-semibold text-ink-text leading-snug">
                                            <a href={`#${q.id}`} className="vd-focusable hover:text-ink-accent">{q.label}</a>
                                        </dt>
                                        <dd className="text-[14.5px] text-ink-textMid leading-relaxed">
                                            {formatAnswer(q.answer)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    );
                })}

                {/* Lối thoát cho việc cần người thật. Cùng bảng màu giấy, không khối tối. */}
                <section className="mt-12 rounded-ink-lg border border-ink-border bg-ink-panel shadow-ink-sm p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-4 items-center">
                    <div>
                        <p className="text-[15px] font-semibold text-ink-text">Không có câu trả lời cho việc của bạn?</p>
                        <p className="mt-1 text-[14px] text-ink-textMid leading-relaxed">
                            Thanh toán bị trừ sai, khiếu nại tài khoản hay lỗi lạ cần người thật xem trực tiếp. Bot không tự xử lý những việc này.
                        </p>
                    </div>
                    {SUPPORT_URL ? (
                        <a
                            href={SUPPORT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vd-focusable inline-flex items-center justify-center gap-2 rounded-ink-md bg-ink-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-accent/90 whitespace-nowrap"
                        >
                            <MessageCircle size={16} />
                            {SUPPORT_LABEL ?? 'Liên hệ hỗ trợ'}
                        </a>
                    ) : (
                        <p className="text-[13px] text-ink-textMuted sm:text-right">
                            Nhắn qua khung chat ở góc dưới bên phải.
                        </p>
                    )}
                </section>
            </main>

            <footer className="bg-ink-panel border-t border-ink-border py-6 text-center text-xs sm:text-sm text-ink-textMuted">
                <p>© {new Date().getFullYear()} E-Learning Platform.</p>
            </footer>

            <SalesAgentWidget context="faq" userName={user?.fullName} />
        </div>
    );
}
