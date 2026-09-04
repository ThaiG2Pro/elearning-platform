/**
 * 2026-09-04 — nội dung AI (tóm tắt/quiz) đôi lúc chèn markdown nhẹ (đoạn
 * văn có thể có `**đậm**`, `# tiêu đề`, gạch đầu dòng khi thật sự là danh
 * sách) — trước đây UI hiển thị bằng <p className="whitespace-pre-line">
 * nên ký tự markdown hiện thô (`**text**`, `- item`...) thay vì được render.
 * Đây là renderer TỐI GIẢN, không phải parser CommonMark đầy đủ — chỉ đủ cho
 * hình dạng output AI thật sự tạo ra (đoạn văn, heading, bold/italic, list,
 * xuống dòng đơn) để tránh kéo thêm dependency nặng (react-markdown +
 * remark) cho 1 khối text ngắn. Nếu sau này cần hỗ trợ thêm cú pháp (bảng,
 * code block, link) thì cân nhắc đổi sang thư viện thật thay vì vá thêm.
 */

import type { ReactNode } from 'react';

interface MarkdownTextProps {
    text: string;
    className?: string;
}

/** Bóc `**bold**` / `*italic*` / `` `code` `` trong 1 dòng, giữ nguyên thứ tự. */
function renderInline(line: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    // Thứ tự alternation quan trọng: bold (**) phải thử trước italic (*)
    // để không bóc nhầm 2 dấu * liền nhau của bold thành italic rỗng.
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = pattern.exec(line)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(line.slice(lastIndex, match.index));
        }
        const token = match[0];
        if (token.startsWith('**')) {
            nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
        } else if (token.startsWith('`')) {
            nodes.push(<code key={key++} className="px-1 py-0.5 rounded bg-ink-pageDim text-[0.9em]">{token.slice(1, -1)}</code>);
        } else {
            nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
        }
        lastIndex = pattern.lastIndex;
    }
    if (lastIndex < line.length) {
        nodes.push(line.slice(lastIndex));
    }
    return nodes.length > 0 ? nodes : [line];
}

/**
 * Gom các dòng liên tiếp cùng loại (đoạn văn / list item) thành 1 khối —
 * tách khối bằng dòng trống hoặc đổi loại dòng (vd đoạn văn → heading).
 */
export default function MarkdownText({ text, className }: MarkdownTextProps) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const blocks: ReactNode[] = [];
    let listBuffer: string[] = [];
    let paragraphBuffer: string[] = [];
    let blockKey = 0;

    const flushList = () => {
        if (listBuffer.length === 0) return;
        blocks.push(
            <ul key={blockKey++} className="list-disc pl-5 space-y-1 my-1.5">
                {listBuffer.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
            </ul>
        );
        listBuffer = [];
    };
    const flushParagraph = () => {
        if (paragraphBuffer.length === 0) return;
        blocks.push(
            <p key={blockKey++} className="my-1.5 leading-relaxed">
                {paragraphBuffer.map((l, i) => (
                    <span key={i}>{i > 0 && <br />}{renderInline(l)}</span>
                ))}
            </p>
        );
        paragraphBuffer = [];
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
        const listMatch = /^[-*]\s+(.*)$/.exec(line);

        if (line.trim() === '') {
            flushParagraph();
            flushList();
            continue;
        }
        if (headingMatch) {
            flushParagraph();
            flushList();
            const level = headingMatch[1].length;
            const sizeClass = level <= 2 ? 'text-sm font-bold' : 'text-xs font-bold';
            blocks.push(
                <p key={blockKey++} className={`${sizeClass} text-ink-text mt-2.5 mb-1`}>
                    {renderInline(headingMatch[2])}
                </p>
            );
            continue;
        }
        if (listMatch) {
            flushParagraph();
            listBuffer.push(listMatch[1]);
            continue;
        }
        flushList();
        paragraphBuffer.push(line);
    }
    flushParagraph();
    flushList();

    return <div className={className}>{blocks}</div>;
}
