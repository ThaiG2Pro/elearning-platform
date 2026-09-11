'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { User } from '@/types/auth.types';
import { logout as apiLogout, AuthUtils } from '@/lib/auth';
import { FAQ_TOPICS, ALL_QUESTIONS } from '@/content/faq';

// Câu hay được hỏi nhất trả lời thẳng ngay đầu trang (dạng trích dẫn), thay
// vì chôn ngang hàng với mọi câu khác trong accordion — đây là điểm "một
// khối đáng nhớ" duy nhất của trang, phần còn lại vẫn là danh sách phẳng.
const HIGHLIGHT_QUESTION_ID = 'co-mat-phi-khong';

const SUPPORT_CHAT_URL = process.env.NEXT_PUBLIC_SUPPORT_CHAT_URL;
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const SUPPORT_URL = SUPPORT_CHAT_URL || (SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : undefined);
const SUPPORT_LABEL = SUPPORT_CHAT_URL ? 'Nhắn hỗ trợ' : SUPPORT_EMAIL;

// Cùng nội dung với menu chat (SalesAgentWidget) — đọc từ src/content/faq.ts,
// hiển thị dạng trang tĩnh (crawl được, không cần bấm mở chat) bằng
// <details>/<summary> gốc: gõ phím/đọc màn hình dùng được ngay, không cần
// tự dựng accordion + icon chevron.
function formatAnswer(text: string) {
    return text.split('\n').map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
            <span key={i}>
                {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
                {i < text.split('\n').length - 1 && <br />}
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

    return (
        <div className="min-h-screen bg-ink-page flex flex-col">
            <Header user={user} onLogout={handleLogout} onJoin={() => router.push('/join')} />

            <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-7 md:py-10 w-full">
                <div className="mb-8">
                    <h1 className="text-[clamp(24px,3vw,30px)] font-bold tracking-[-0.015em] text-ink-text leading-tight">
                        Hỏi đáp
                    </h1>
                    <p className="mt-3 text-[15px] text-ink-textMid leading-relaxed">
                        Trả lời đúng với cách nền tảng hoạt động thật. Không thấy câu bạn cần thì nhắn ở góc dưới bên phải, hoặc liên hệ trực tiếp.
                    </p>
                </div>

                {highlight && (
                    <div className="flex items-stretch mb-10">
                        <div className="border-l-2 border-ink-accent pl-4 pr-2 py-0.5">
                            <p className="text-xs text-ink-textMuted mb-1.5">Câu hay được hỏi nhất — {highlight.label}</p>
                            <p className="text-lg font-semibold text-ink-text leading-snug">
                                {formatAnswer(highlight.answer)}
                            </p>
                        </div>
                    </div>
                )}

                {topics.map((topic) => (
                    <section key={topic.id} className="mb-8">
                        <h2 className="text-sm font-bold text-ink-text mb-3">{topic.label}</h2>
                        <div className="bg-ink-panel border border-ink-border rounded-ink-md shadow-ink-sm overflow-hidden">
                            {topic.questions.filter((q) => q.id !== HIGHLIGHT_QUESTION_ID).map((q, i, arr) => (
                                <details
                                    key={q.id}
                                    className={`group ${i < arr.length - 1 ? 'border-b border-ink-border' : ''}`}
                                >
                                    <summary className="vd-focusable list-none cursor-pointer select-none px-5 py-3.5 flex items-center justify-between gap-3 text-sm font-medium text-ink-text hover:bg-ink-page transition-colors">
                                        {q.label}
                                        <span className="shrink-0 text-ink-textDim transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                                    </summary>
                                    <p className="px-5 pb-4 text-sm text-ink-textMid leading-relaxed">
                                        {formatAnswer(q.answer)}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </section>
                ))}

                <section className="bg-ink-room rounded-ink-md p-6 sm:p-7">
                    <p className="text-sm text-ink-screenText font-semibold mb-1">Không có câu trả lời sẵn cho việc của bạn?</p>
                    <p className="text-sm text-ink-screenTextMid leading-relaxed">
                        Một số việc (thanh toán bị trừ sai, khiếu nại tài khoản...) cần người thật xem trực tiếp — bot không tự ý xử lý những trường hợp này.
                    </p>
                    {SUPPORT_URL ? (
                        <a
                            href={SUPPORT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vd-focusable inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-ink-accentScreen hover:underline"
                        >
                            {SUPPORT_LABEL ? `Liên hệ hỗ trợ — ${SUPPORT_LABEL}` : 'Liên hệ hỗ trợ'}
                        </a>
                    ) : (
                        <p className="mt-4 text-xs text-ink-screenTextMuted">Kênh liên hệ trực tiếp đang được cập nhật.</p>
                    )}
                </section>
            </main>

            <footer className="bg-ink-panel border-t border-ink-border py-6 mt-4 text-center text-xs sm:text-sm text-ink-textMuted">
                <p>© {new Date().getFullYear()} E-Learning Platform.</p>
            </footer>
        </div>
    );
}
