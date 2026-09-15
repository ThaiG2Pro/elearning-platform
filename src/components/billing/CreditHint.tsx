import Link from 'next/link';
import type { CreditSummary } from '@/lib/billing';

interface CreditHintProps {
    summary: CreditSummary | null;
    className?: string;
}

/**
 * 2026-09-15 — dòng "còn bao nhiêu, lượt này trừ bao nhiêu" đặt ngay cạnh nút
 * trả phí. Trước đây người dùng bấm "Trả phí để nền tảng tạo giúp" mà không
 * biết mình còn gì và sẽ mất gì. Dùng chung cho composer và trang edit.
 */
export default function CreditHint({ summary, className = '' }: CreditHintProps) {
    if (!summary) return null;
    const { creditBalance, creditCostPerGeneration } = summary;
    const short = creditBalance < creditCostPerGeneration;
    return (
        <p className={`text-[11px] leading-relaxed ${short ? 'text-ink-warning' : 'text-ink-textMid'} ${className}`}>
            <span className="font-mono tabular-nums">{creditBalance}</span> credit trong tài khoản, lượt này trừ{' '}
            <span className="font-mono tabular-nums">{creditCostPerGeneration}</span>.
            {short && (
                <>
                    {' '}Không đủ.{' '}
                    <Link href="/billing" className="font-medium underline underline-offset-2">
                        Mua thêm
                    </Link>
                </>
            )}
        </p>
    );
}
