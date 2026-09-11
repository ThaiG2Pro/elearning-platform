'use client';

import './SalesAgentWidget.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    FAQ_TOPICS,
    ALL_QUESTIONS,
    findQuestionByFreeText,
    type TopicId,
    type FaqTopic,
    type FaqQuestion,
} from '@/content/faq';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgentContext =
    | 'homepage_guest'
    | 'homepage_no_spaces'
    | 'join'
    | 'pricing';

interface SalesAgentWidgetProps {
    context: AgentContext;
    userName?: string;
}

interface QuickOption {
    id: string;
    label: string;
}

interface Message {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
    options?: QuickOption[];
}

// ─── FAQ knowledge base ───────────────────────────────────────────────────────
// Không có AI thật đứng sau widget này (chưa đủ ngân sách host AI) — đây là
// trợ lý FAQ có hướng dẫn (guided), trả lời cố định. Nội dung (FAQ_TOPICS/
// ALL_QUESTIONS/findQuestionByFreeText) nằm ở src/content/faq.ts — dùng
// chung với trang tĩnh /faq, tránh 2 nơi lệch nội dung. Đã đối chiếu với
// code thật (AIGenerationPolicy, CreditLedger, auth, space clone/share),
// lọc bớt chi tiết nội bộ (ngưỡng chính xác, cơ chế routing...) — xem trao
// đổi trong phiên làm việc về "policy audit cho chatbot". KHÔNG cố "giải
// quyết" khiếu nại bằng câu trả lời cứng — luôn trỏ sang kênh người thật
// (mục ho-tro) để tránh bot tự ý xử lý sai.

// ─── Kênh liên hệ người thật ──────────────────────────────────────────────────
// Ưu tiên link chat (Zalo/Messenger) nếu có cấu hình, fallback sang email.
// Chưa cấu hình gì thì vẫn xử lý mềm (không đưa link chết).
const SUPPORT_CHAT_URL = process.env.NEXT_PUBLIC_SUPPORT_CHAT_URL;
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const SUPPORT_URL = SUPPORT_CHAT_URL || (SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : undefined);
const SUPPORT_LABEL = SUPPORT_CHAT_URL ? 'Nhắn hỗ trợ' : SUPPORT_EMAIL ? SUPPORT_EMAIL : null;

// ─── Config per context ──────────────────────────────────────────────────────

const CONTEXT_CONFIG: Record<AgentContext, {
    greeting: string;
    subtitle: string;
    proactiveDelay: number;
    proactiveBubble: string;
    /** Thứ tự ưu tiên topic hiện ở menu chính — không đổi nội dung, chỉ đổi thứ tự phù hợp ngữ cảnh trang. */
    topicOrder: TopicId[];
}> = {
    homepage_guest: {
        greeting: 'Xin chào! 👋',
        subtitle: 'Mình là trợ lý hỗ trợ tự động — hỏi mình về nền tảng nhé.',
        proactiveDelay: 8000,
        proactiveBubble: 'Bạn muốn tìm hiểu về nền tảng học trực tuyến này?',
        topicOrder: ['tinh-nang', 'gia-credit', 'tai-khoan', 'ho-tro'],
    },
    homepage_no_spaces: {
        greeting: 'Chào mừng trở lại! 🎯',
        subtitle: 'Mình là trợ lý hỗ trợ tự động — cần gì cứ hỏi nhé.',
        proactiveDelay: 10000,
        proactiveBubble: 'Bạn muốn biết cách dùng AI miễn phí hay cần thêm credit?',
        topicOrder: ['gia-credit', 'tinh-nang', 'tai-khoan', 'ho-tro'],
    },
    join: {
        greeting: 'Tôi sẵn sàng hỗ trợ! 🚀',
        subtitle: 'Có thắc mắc gì trước khi đăng ký không?',
        proactiveDelay: 4000,
        proactiveBubble: 'Bạn có câu hỏi gì trước khi bắt đầu không?',
        topicOrder: ['gia-credit', 'tinh-nang', 'tai-khoan', 'ho-tro'],
    },
    pricing: {
        greeting: 'Tư vấn giá & credit! 💡',
        subtitle: 'Mình giúp bạn hiểu rõ trước khi mua.',
        proactiveDelay: 3000,
        proactiveBubble: 'Bạn đang phân vân về giá hay credit? Hỏi mình nhé!',
        topicOrder: ['gia-credit', 'tinh-nang', 'tai-khoan', 'ho-tro'],
    },
};

// ─── Simple bold formatter ────────────────────────────────────────────────────

function FormattedContent({ text }: { text: string }) {
    const lines = text.split('\n');
    return (
        <>
            {lines.map((line, lineIdx) => {
                const parts = line.split(/\*\*(.*?)\*\*/g);
                return (
                    <span key={lineIdx}>
                        {parts.map((part, partIdx) =>
                            partIdx % 2 === 1
                                ? <strong key={partIdx}>{part}</strong>
                                : <span key={partIdx}>{part}</span>
                        )}
                        {lineIdx < lines.length - 1 && <br />}
                    </span>
                );
            })}
        </>
    );
}

// ─── Message builders (menu tree) ─────────────────────────────────────────────

function buildTopicMenuMessage(topicOrder: TopicId[], greetingPrefix?: string): Message {
    const topics = topicOrder.map((id) => FAQ_TOPICS.find((t) => t.id === id)!).filter(Boolean);
    return {
        id: `menu-${Date.now()}`,
        role: 'agent',
        content: greetingPrefix ?? 'Bạn cần hỗ trợ về vấn đề gì?',
        timestamp: new Date(),
        options: topics.map((t) => ({ id: `topic:${t.id}`, label: t.label })),
    };
}

function buildEscalateMessage(): Message {
    return {
        id: `escalate-${Date.now()}`,
        role: 'agent',
        content: 'Mình rất tiếc bạn gặp vấn đề 🙏 Đây là câu hỏi cần người thật xem xét trực tiếp để xử lý đúng — mình không tự ý "giải quyết" bằng câu trả lời có sẵn đâu.',
        timestamp: new Date(),
        options: [
            { id: 'action:human', label: '🙋 Liên hệ hỗ trợ ngay' },
            { id: 'action:menu', label: '🔙 Menu chính' },
        ],
    };
}

function buildQuestionMenuMessage(topic: FaqTopic): Message {
    return {
        id: `submenu-${Date.now()}`,
        role: 'agent',
        content: `${topic.label} — chọn câu hỏi:`,
        timestamp: new Date(),
        options: [
            ...topic.questions.map((q) => ({ id: `q:${q.id}`, label: q.label })),
            { id: 'action:menu', label: '🔙 Menu chính' },
        ],
    };
}

function buildAnswerMessage(q: FaqQuestion & { topicId: TopicId }): Message {
    const relatedOptions = (q.related ?? [])
        .slice(0, 2)
        .map((rid) => ALL_QUESTIONS[rid])
        .filter(Boolean)
        .map((r) => ({ id: `q:${r.id}`, label: r.label }));
    return {
        id: `answer-${Date.now()}`,
        role: 'agent',
        content: q.answer,
        timestamp: new Date(),
        options: [...relatedOptions, { id: 'action:menu', label: '🔙 Menu chính' }],
    };
}

function buildFallbackMessage(missCount: number): Message {
    return {
        id: `fallback-${Date.now()}`,
        role: 'agent',
        content:
            missCount >= 2
                ? 'Mình chưa tìm thấy câu trả lời phù hợp cho câu hỏi này. Để không mất thời gian của bạn, hãy liên hệ trực tiếp đội hỗ trợ nhé.'
                : 'Câu này mình chưa có sẵn câu trả lời chính xác. Bạn thử chọn từ menu bên dưới, hoặc mô tả lại theo cách khác nhé.',
        timestamp: new Date(),
        options:
            missCount >= 2
                ? [{ id: 'action:human', label: '🙋 Liên hệ người thật' }, { id: 'action:menu', label: '🔙 Menu chính' }]
                : [{ id: 'action:menu', label: '🔙 Menu chính' }, { id: 'action:human', label: '🙋 Liên hệ người thật' }],
    };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesAgentWidget({ context, userName }: SalesAgentWidgetProps) {
    const config = CONTEXT_CONFIG[context];

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showProactiveBubble, setShowProactiveBubble] = useState(false);
    const [proactiveDismissed, setProactiveDismissed] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [missCount, setMissCount] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, isOpen]);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    }, [isOpen]);

    useEffect(() => {
        if (proactiveDismissed || hasInteracted) return;
        const timer = setTimeout(() => setShowProactiveBubble(true), config.proactiveDelay);
        return () => clearTimeout(timer);
    }, [config.proactiveDelay, proactiveDismissed, hasInteracted]);

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        setHasInteracted(true);
        setShowProactiveBubble(false);

        if (messages.length === 0) {
            const welcome: Message = {
                id: 'welcome',
                role: 'agent',
                content: `${config.greeting}\n\n${userName ? `Xin chào **${userName}**! ` : ''}${config.subtitle}`,
                timestamp: new Date(),
            };
            setMessages([welcome, buildTopicMenuMessage(config.topicOrder)]);
        }
    }, [messages.length, config, userName]);

    const handleClose = () => setIsOpen(false);

    const handleDismissProactive = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowProactiveBubble(false);
        setProactiveDismissed(true);
    };

    const pushAgentMessageWithDelay = useCallback((build: () => Message, userLabel?: string) => {
        if (userLabel) {
            setMessages((prev) => [...prev, {
                id: `user-${Date.now()}`,
                role: 'user',
                content: userLabel,
                timestamp: new Date(),
            }]);
        }
        setIsTyping(true);
        setTimeout(() => {
            setMessages((prev) => [...prev, build()]);
            setIsTyping(false);
        }, 350 + Math.random() * 250);
    }, []);

    const openSupportChannel = useCallback(() => {
        if (SUPPORT_URL) {
            window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer');
        }
        setMessages((prev) => [...prev, {
            id: `support-${Date.now()}`,
            role: 'agent',
            content: SUPPORT_LABEL
                ? `Mình đã mở kênh liên hệ cho bạn (${SUPPORT_LABEL}). Nếu cửa sổ không tự mở, bạn liên hệ trực tiếp qua đó nhé.`
                : 'Kênh liên hệ trực tiếp đang được cập nhật. Bạn có thể để lại câu hỏi/email ở đây, đội ngũ sẽ phản hồi sớm nhất có thể.',
            timestamp: new Date(),
            options: [{ id: 'action:menu', label: '🔙 Menu chính' }],
        }]);
    }, []);

    const handleSelectOption = useCallback((option: QuickOption) => {
        if (isTyping) return;

        if (option.id === 'action:menu') {
            pushAgentMessageWithDelay(() => buildTopicMenuMessage(config.topicOrder), option.label);
            return;
        }
        if (option.id === 'action:human') {
            setMessages((prev) => [...prev, {
                id: `user-${Date.now()}`,
                role: 'user',
                content: option.label,
                timestamp: new Date(),
            }]);
            openSupportChannel();
            return;
        }
        if (option.id.startsWith('topic:')) {
            const topicId = option.id.slice('topic:'.length) as TopicId;
            const topic = FAQ_TOPICS.find((t) => t.id === topicId);
            if (!topic) return;
            if (topic.directEscalate) {
                pushAgentMessageWithDelay(buildEscalateMessage, option.label);
            } else {
                pushAgentMessageWithDelay(() => buildQuestionMenuMessage(topic), option.label);
            }
            return;
        }
        if (option.id.startsWith('q:')) {
            const qId = option.id.slice('q:'.length);
            const q = ALL_QUESTIONS[qId];
            if (!q) return;
            setMissCount(0);
            pushAgentMessageWithDelay(() => buildAnswerMessage(q), option.label);
        }
    }, [isTyping, config.topicOrder, pushAgentMessageWithDelay, openSupportChannel]);

    const sendFreeText = useCallback((text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isTyping) return;

        setInputValue('');
        const match = findQuestionByFreeText(trimmed);
        if (match) {
            setMissCount(0);
            pushAgentMessageWithDelay(() => buildAnswerMessage(match), trimmed);
        } else {
            const nextMiss = missCount + 1;
            setMissCount(nextMiss);
            pushAgentMessageWithDelay(() => buildFallbackMessage(nextMiss), trimmed);
        }
    }, [isTyping, missCount, pushAgentMessageWithDelay]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendFreeText(inputValue);
        }
    };

    return (
        <>
            {/* ── Proactive Bubble ── */}
            {showProactiveBubble && !isOpen && (
                <div className="sag-proactive" role="status" aria-live="polite">
                    <button
                        className="sag-proactive__dismiss"
                        onClick={handleDismissProactive}
                        aria-label="Đóng thông báo"
                    >
                        ×
                    </button>
                    <p className="sag-proactive__text">{config.proactiveBubble}</p>
                    <button
                        className="sag-proactive__cta"
                        onClick={handleOpen}
                    >
                        Trả lời ngay →
                    </button>
                </div>
            )}

            {/* ── Chat Panel ── */}
            {isOpen && (
                <div className="sag-panel" role="dialog" aria-modal="true" aria-label="Trợ lý hỗ trợ">
                    <div className="sag-panel__header">
                        <div className="sag-panel__avatar" aria-hidden="true">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <div className="sag-panel__header-text">
                            <span className="sag-panel__name">Trợ lý hỗ trợ nhanh</span>
                            <span className="sag-panel__status">
                                <span className="sag-panel__status-dot" />
                                Trả lời tự động
                            </span>
                        </div>
                        <button
                            className="sag-panel__close"
                            onClick={handleClose}
                            aria-label="Đóng cửa sổ chat"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    <div className="sag-panel__messages" role="log" aria-live="polite">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`sag-msg sag-msg--${msg.role}`}>
                                {msg.role === 'agent' && (
                                    <div className="sag-msg__avatar" aria-hidden="true">🤖</div>
                                )}
                                <div className="sag-msg__bubble">
                                    <div className="sag-msg__content">
                                        <FormattedContent text={msg.content} />
                                    </div>
                                    {msg.options && msg.options.length > 0 && (
                                        <div className="sag-msg__quick-replies" role="group" aria-label="Lựa chọn">
                                            {msg.options.map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    className="sag-msg__quick-reply"
                                                    onClick={() => handleSelectOption(opt)}
                                                    disabled={isTyping}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="sag-msg sag-msg--agent">
                                <div className="sag-msg__avatar" aria-hidden="true">🤖</div>
                                <div className="sag-msg__bubble">
                                    <div className="sag-typing" aria-label="Đang soạn tin">
                                        <span /><span /><span />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Lối thoát cố định sang người thật — luôn hiện, không chỉ khi bot bí. */}
                    <div className="sag-panel__contact-bar">
                        <span>Cần người thật hỗ trợ?</span>
                        <button className="sag-panel__contact-link" onClick={openSupportChannel}>
                            {SUPPORT_LABEL ? `Liên hệ ngay — ${SUPPORT_LABEL}` : 'Liên hệ ngay'}
                        </button>
                    </div>

                    <div className="sag-panel__footer">
                        <textarea
                            ref={inputRef}
                            className="sag-input"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Gõ câu hỏi khác…"
                            rows={1}
                            disabled={isTyping}
                            aria-label="Nhập tin nhắn"
                        />
                        <button
                            className="sag-send"
                            onClick={() => sendFreeText(inputValue)}
                            disabled={!inputValue.trim() || isTyping}
                            aria-label="Gửi tin nhắn"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ── Trigger Button ── */}
            {!isOpen && (
                <button
                    className="sag-trigger"
                    onClick={handleOpen}
                    aria-label="Mở trợ lý hỗ trợ"
                    aria-expanded="false"
                >
                    <svg
                        className="sag-trigger__icon"
                        width="22" height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        <circle cx="9" cy="10" r="0.5" fill="currentColor" />
                        <circle cx="12" cy="10" r="0.5" fill="currentColor" />
                        <circle cx="15" cy="10" r="0.5" fill="currentColor" />
                    </svg>
                    {showProactiveBubble && (
                        <span className="sag-trigger__badge" aria-hidden="true">1</span>
                    )}
                </button>
            )}
        </>
    );
}
