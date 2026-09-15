/**
 * 2026-09-15 — cảnh báo vận hành cho những việc PHẢI có người nhìn: job đối
 * soát tìm thấy credit nợ, sổ cái lệch số dư, Stripe hoàn tiền / chargeback.
 *
 * Gửi POST JSON tới `OPS_ALERT_WEBHOOK_URL` nếu có (payload có cả `content`
 * và `text` nên dán thẳng webhook Discord hoặc Slack đều hiện). Luôn ghi
 * console.error để log server vẫn có dấu vết dù chưa cấu hình webhook.
 * KHÔNG BAO GIỜ throw — cảnh báo lỗi không được làm hỏng luồng nghiệp vụ
 * đang gọi nó (webhook Stripe phải vẫn trả 200).
 */
export async function sendOpsAlert(title: string, details: Record<string, unknown> = {}): Promise<void> {
    const lines = Object.entries(details).map(([k, v]) => `${k}: ${typeof v === 'bigint' ? v.toString() : JSON.stringify(v)}`);
    const text = [`[ops] ${title}`, ...lines].join('\n');
    console.error(text);

    const url = process.env.OPS_ALERT_WEBHOOK_URL;
    if (!url) return;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ content: text, text }),
            signal: AbortSignal.timeout(5_000),
        });
        if (!res.ok) console.error(`[ops] alert webhook responded ${res.status}`);
    } catch (error) {
        console.error('[ops] alert webhook failed:', error instanceof Error ? error.message : String(error));
    }
}
