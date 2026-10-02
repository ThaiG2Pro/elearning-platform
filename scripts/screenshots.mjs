// Chụp 3 ảnh cho README (docs/screenshots/*.png) từ dev server local.
//   pnpm dev   (và agent CSKH ở :8000 nếu muốn ảnh chat là AI thật)
//   DEMO_EMAIL=... DEMO_PASSWORD=... SHARE_TOKEN=... node scripts/screenshots.mjs
// Cần `pnpm exec playwright install chromium` một lần.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@local.test';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo12345!';
const SHARE_TOKEN = process.env.SHARE_TOKEN; // share_token của 1 Space tuyển chọn
const OUT = 'docs/screenshots';
const HIDE_DEV_UI = 'nextjs-portal, [data-nextjs-dev-tools-button] { display:none !important }';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'vi-VN' });
const shot = async (name) => {
    await page.addStyleTag({ content: HIDE_DEV_UI });
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log(`${name}.png`);
};
const imagesLoaded = () =>
    page
        .waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 60000 })
        .catch(() => console.warn('một số ảnh thumbnail chưa tải xong'));

// 1. Trang chủ (khách) — đợi bong bóng chủ động của widget.
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 120000 });
await imagesLoaded();
await page.waitForSelector('.sag-proactive', { timeout: 20000 }).catch(() => {});
await shot('home');

// 2. Widget: gõ tự do → AI, cuộn tới câu hỏi để thấy cả hỏi lẫn đáp.
await page.click('.sag-trigger');
await page.waitForSelector('.sag-panel');
await page.fill('.sag-input', 'Clone space của người khác được không?');
await page.keyboard.press('Enter');
await page.waitForFunction(
    () => document.querySelectorAll('.sag-msg--agent').length >= 3 && !document.querySelector('.sag-typing'),
    null,
    { timeout: 90000 },
);
await page.evaluate(() => document.querySelector('.sag-msg--user')?.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(500);
await shot('support-chat');

// 3. Màn hình học: đăng nhập demo qua API (ô email ở /login là readOnly), sao chép Space, mở /learn.
if (SHARE_TOKEN) {
    const { spaceId } = await page.evaluate(async ({ email, password, token }) => {
        const login = await (await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })).json();
        localStorage.setItem('accessToken', login.accessToken);
        localStorage.setItem('userInfo', JSON.stringify(login.user));
        return (await fetch(`/api/v1/spaces/share/${token}/copy`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${login.accessToken}` },
        })).json();
    }, { email: DEMO_EMAIL, password: DEMO_PASSWORD, token: SHARE_TOKEN });
    await page.goto(`${BASE}/spaces/${spaceId}/learn`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(4000);
    await shot('learn');
} else {
    console.warn('bỏ qua learn.png: thiếu SHARE_TOKEN');
}
await browser.close();
