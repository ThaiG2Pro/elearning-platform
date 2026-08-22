'use client';

import './SalesAgentWidget.css';
import { useState, useEffect, useRef, useCallback } from 'react';

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

interface Message {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
    quickReplies?: string[];
}

// ─── Config per context ──────────────────────────────────────────────────────

const CONTEXT_CONFIG: Record<AgentContext, {
    greeting: string;
    subtitle: string;
    proactiveDelay: number;
    proactiveBubble: string;
    quickStarters: string[];
}> = {
    homepage_guest: {
        greeting: 'Xin chào! 👋',
        subtitle: 'Tôi có thể giúp bạn tìm Space phù hợp.',
        proactiveDelay: 8000,
        proactiveBubble: 'Bạn muốn tìm hiểu về nền tảng học trực tuyến này?',
        quickStarters: [
            'Nền tảng này có gì đặc biệt?',
            'Cách bắt đầu học như thế nào?',
            'Có gói dùng thử miễn phí không?',
        ],
    },
    homepage_no_spaces: {
        greeting: 'Chào mừng trở lại! 🎯',
        subtitle: 'Hãy để tôi giúp bạn chọn gói học phù hợp.',
        proactiveDelay: 10000,
        proactiveBubble: 'Bạn muốn tôi gợi ý gói học phù hợp với mục tiêu của bạn không?',
        quickStarters: [
            'Gói nào phù hợp cho người mới?',
            'So sánh các gói đăng ký',
            'Chính sách hoàn tiền thế nào?',
        ],
    },
    join: {
        greeting: 'Tôi sẵn sàng hỗ trợ! 🚀',
        subtitle: 'Có thắc mắc trước khi đăng ký không?',
        proactiveDelay: 4000,
        proactiveBubble: 'Bạn có câu hỏi gì trước khi bắt đầu không?',
        quickStarters: [
            'Đăng ký có mất phí không?',
            'Học thử trước khi mua được không?',
            'Thanh toán bằng phương thức nào?',
        ],
    },
    pricing: {
        greeting: 'Tư vấn gói học! 💡',
        subtitle: 'Tôi giúp bạn chọn gói phù hợp nhất.',
        proactiveDelay: 3000,
        proactiveBubble: 'Bạn đang phân vân giữa các gói? Kể cho tôi nghe mục tiêu học của bạn nhé!',
        quickStarters: [
            'Gói VIP có gì hơn gói thường?',
            'Có thể nâng cấp gói sau không?',
            'Thanh toán theo tháng hay năm tiết kiệm hơn?',
        ],
    },
};

// ─── Mock agent response (replace with real API call to ai-agent-sale-v2) ───

async function fetchAgentResponse(
    message: string,
    _context: AgentContext,
    _userName?: string,
): Promise<{ content: string; quickReplies?: string[] }> {
    // TODO: Replace with real API call
    // const response = await fetch(`${process.env.NEXT_PUBLIC_AGENT_API_URL}/chat`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message, context, customer_id: _userName }),
    // });
    // return response.json();

    await new Promise((r) => setTimeout(r, 900 + Math.random() * 500));

    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('miễn phí') || lowerMsg.includes('dùng thử') || lowerMsg.includes('mất phí')) {
        return {
            content: 'Bạn có thể đăng ký tài khoản **miễn phí** và học thử ngay! Sau đó nếu muốn truy cập toàn bộ nội dung và tính năng nâng cao, bạn có thể nâng cấp lên gói Premium. 🎓',
            quickReplies: ['Gói Premium có gì?', 'Xem bảng giá', 'Đăng ký ngay'],
        };
    }
    if (lowerMsg.includes('gói') || lowerMsg.includes('premium') || lowerMsg.includes('vip') || lowerMsg.includes('subscription')) {
        return {
            content: 'Hiện tại chúng tôi có 2 gói chính:\n\n• **Gói Cơ bản** (Miễn phí): Truy cập Space công khai, tạo tối đa 3 Space cá nhân.\n• **Gói Premium**: Không giới hạn Space, AI quiz nâng cao, ưu tiên hỗ trợ.\n\nBạn muốn biết thêm về gói nào?',
            quickReplies: ['Gói Premium giá bao nhiêu?', 'Tôi cần gói nào?', 'Thử gói miễn phí trước'],
        };
    }
    if (lowerMsg.includes('hoàn tiền') || lowerMsg.includes('chính sách')) {
        return {
            content: 'Chúng tôi có chính sách **hoàn tiền 7 ngày** không điều kiện. Nếu bạn không hài lòng sau khi dùng thử gói Premium, chỉ cần liên hệ support và chúng tôi sẽ hoàn tiền đầy đủ. 💯',
            quickReplies: ['Điều kiện hoàn tiền cụ thể?', 'Liên hệ support', 'Xem thêm chính sách'],
        };
    }
    if (lowerMsg.includes('bắt đầu') || lowerMsg.includes('mới') || lowerMsg.includes('đặc biệt') || lowerMsg.includes('tính năng')) {
        return {
            content: 'Nền tảng giúp bạn **tạo không gian học cá nhân** từ bất kỳ video nào, với AI tự động tạo quiz, tóm tắt, và theo dõi tiến độ học.\n\nChỉ cần dán link YouTube là bắt đầu ngay! 🚀',
            quickReplies: ['Thử ngay', 'Có gói dùng thử không?', 'Hỏi thêm về tính năng'],
        };
    }

    return {
        content: `Cảm ơn câu hỏi của bạn! Hệ thống tư vấn AI đang được kết nối. Trong thời gian này, bạn có thể liên hệ support để được hỗ trợ nhanh nhất. 😊`,
        quickReplies: ['Liên hệ support', 'Câu hỏi khác'],
    };
}

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
            setMessages([{
                id: 'welcome',
                role: 'agent',
                content: `${config.greeting}\n\n${userName ? `Xin chào **${userName}**! ` : ''}${config.subtitle}`,
                timestamp: new Date(),
                quickReplies: config.quickStarters,
            }]);
        }
    }, [messages.length, config, userName]);

    const handleClose = () => setIsOpen(false);

    const handleDismissProactive = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowProactiveBubble(false);
        setProactiveDismissed(true);
    };

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isTyping) return;

        setMessages((prev) => [...prev, {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
            timestamp: new Date(),
        }]);
        setInputValue('');
        setIsTyping(true);

        try {
            const { content, quickReplies } = await fetchAgentResponse(trimmed, context, userName);
            setMessages((prev) => [...prev, {
                id: `agent-${Date.now()}`,
                role: 'agent',
                content,
                timestamp: new Date(),
                quickReplies,
            }]);
        } catch {
            setMessages((prev) => [...prev, {
                id: `error-${Date.now()}`,
                role: 'agent',
                content: 'Xin lỗi, có sự cố kết nối. Vui lòng thử lại sau.',
                timestamp: new Date(),
            }]);
        } finally {
            setIsTyping(false);
        }
    }, [isTyping, context, userName]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
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
                <div className="sag-panel" role="dialog" aria-modal="true" aria-label="Tư vấn AI">
                    <div className="sag-panel__header">
                        <div className="sag-panel__avatar" aria-hidden="true">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <div className="sag-panel__header-text">
                            <span className="sag-panel__name">Trợ lý tư vấn</span>
                            <span className="sag-panel__status">
                                <span className="sag-panel__status-dot" />
                                Trực tuyến
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
                                    <div className="sag-msg__avatar" aria-hidden="true">AI</div>
                                )}
                                <div className="sag-msg__bubble">
                                    <div className="sag-msg__content">
                                        <FormattedContent text={msg.content} />
                                    </div>
                                    {msg.quickReplies && msg.quickReplies.length > 0 && (
                                        <div className="sag-msg__quick-replies" role="group" aria-label="Gợi ý câu trả lời">
                                            {msg.quickReplies.map((reply) => (
                                                <button
                                                    key={reply}
                                                    className="sag-msg__quick-reply"
                                                    onClick={() => sendMessage(reply)}
                                                    disabled={isTyping}
                                                >
                                                    {reply}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="sag-msg sag-msg--agent">
                                <div className="sag-msg__avatar" aria-hidden="true">AI</div>
                                <div className="sag-msg__bubble">
                                    <div className="sag-typing" aria-label="Đang soạn tin">
                                        <span /><span /><span />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className="sag-panel__footer">
                        <textarea
                            ref={inputRef}
                            className="sag-input"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập câu hỏi của bạn…"
                            rows={1}
                            disabled={isTyping}
                            aria-label="Nhập tin nhắn"
                        />
                        <button
                            className="sag-send"
                            onClick={() => sendMessage(inputValue)}
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
                    aria-label="Mở cửa sổ tư vấn AI"
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
