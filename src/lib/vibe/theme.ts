// Nguồn token DUY NHẤT cho toàn bộ "Mực xanh trên giấy trắng" — trước đây
// mỗi trang /vibe-demo/* tự khai báo lại object T này (7 bản gần giống
// nhau), nên sửa 1 màu phải sửa 7 chỗ và dễ lệch dần. File này là nguồn
// chân lý; các trang import từ đây thay vì định nghĩa lại.
//
// Ý niệm gốc (giữ nguyên khi refactor): app là một KHÔNG GIAN HỌC TẬP thật,
// nên phải sạch và ngăn nắp như một bàn học vừa dọn — nền trắng sứ trung
// tính (không phải kem ngả vàng), mực xanh-đen làm chữ, và MỘT accent duy
// nhất: xanh mực bút máy học trò. Dark mode KHÔNG phải một theme — bóng tối
// là một TRẠNG THÁI cục bộ (focus mode / phòng thi), không phải theme toàn app.
'use client';

import { useEffect, useState } from 'react';
import { Be_Vietnam_Pro } from 'next/font/google';

// Một giọng chữ duy nhất — Be Vietnam Pro là grotesque thiết kế riêng cho
// tiếng Việt (dấu đặt chuẩn ở mọi weight). Chỉ load MỘT LẦN ở đây; các trang
// import `sans`/`beVietnam` từ module này thay vì tự gọi next/font/google
// riêng (trước đây bị lặp lại ở cả 7 file).
export const beVietnam = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

// Giá trị thật của mọi màu/bóng đổ nằm ở block :root { --ink-* } trong
// src/app/globals.css — object T này CHỈ tham chiếu var(), không giữ hex
// riêng nữa (trước đây bị chép tay 1-1 sang tailwind.config.js, dễ lệch khi
// sửa 1 trong 2 nơi mà quên nơi còn lại). Đổi màu → sửa globals.css.
export const T = {
  page:    'var(--ink-page)',      // giấy trắng sứ — trung tính, nhiều khí thở
  pageDim: 'var(--ink-page-dim)',  // đèn phòng dịu xuống khi video đang chạy
  room:    'var(--ink-room)',      // phòng tắt đèn — nền focus mode, KHÔNG phải dark theme
  panel:   'var(--ink-panel)',     // mặt giấy của panel — trắng tuyệt đối, "spotlight" nội dung
  screen:  'var(--ink-screen)',    // màn hình video — luôn tối như thiết bị thật
  ink:     'var(--ink-text)',      // mực xanh-đen (blue-black ink) — chữ chính
  inkMid:  'var(--ink-text-mid)',
  inkMuted:'var(--ink-text-muted)',
  inkDim:  'var(--ink-text-dim)',
  border:  'var(--ink-border)',
  borderHi:'var(--ink-border-hi)',
  accent:  'var(--ink-accent)',    // mực bút máy — accent duy nhất của cả trang
  accentA: 'var(--ink-accent-a)',
  marginLn:'var(--ink-margin-ln)', // đường kẻ lề vở — motif cấu trúc chung của playlist & notes
  onAccent:'var(--ink-on-accent)',
  // Mực xanh "dưới ánh màn hình" — bản sáng của accent, chỉ dùng cho các
  // element nằm TRÊN nền video/phòng thi tối (progress, trạng thái đã lưu).
  accentScreen: 'var(--ink-accent-screen)',
  // Ngữ nghĩa chấm điểm — CHỈ dùng trong quiz, CHỈ sau khi nộp bài. Mực xanh
  // là nét bút của học viên (khi làm bài); correct/wrong là bút chấm của
  // giáo viên (chỉ xuất hiện sau khi chấm), không bao giờ trộn với accent.
  correct:  'var(--ink-correct)',
  correctA: 'var(--ink-correct-a)',
  wrong:    'var(--ink-wrong)',
  wrongA:   'var(--ink-wrong-a)',
  // Ngữ nghĩa trạng thái CHUNG (badge/banner: active/archived, free/paid,
  // cảnh báo giới hạn...) — khác correct/wrong ở trên (chỉ dành riêng cho bài
  // chấm quiz, chỉ sau khi nộp bài). Giữ đồng bộ 1-1 với ink.success/warning
  // trong tailwind.config.js (cả hai cùng đọc từ globals.css).
  success:  'var(--ink-success)',
  successA: 'var(--ink-success-a)',
  successBorder: 'var(--ink-success-border)',
  warning:  'var(--ink-warning)',
  warningA: 'var(--ink-warning-a)',
  warningBorder: 'var(--ink-warning-border)',
  // Bản warning trên nền tối (thanh điều khiển video/phòng thi) — xem
  // chú thích tại :root{--ink-warning-screen} trong globals.css.
  warningScreen: 'var(--ink-warning-screen)',
  // "Chì/mực" — motif của edit-space: nét đứt (chì) = bản thảo/chưa đăng,
  // nét liền (marginLn/accent) = đã đăng. Không dùng ở trang tiêu thụ nội dung.
  pencilLn: 'var(--ink-pencil)',
  // Nền khối code — chỉ dùng trong article (motif "trang sách").
  codeBg:   'var(--ink-code-bg)',
  // Chữ/viền trên nền đảo màu (room hoặc khối nền tối cục bộ khác, vd panel
  // "Product Philosophy" ở /about) — xem chú thích tại :root{--ink-screen-*}
  // trong globals.css.
  screenText:      'var(--ink-screen-text)',
  screenTextMid:   'var(--ink-screen-text-mid)',
  screenTextMuted: 'var(--ink-screen-text-muted)',
  screenTextDim:   'var(--ink-screen-text-dim)',
  screenBorder:    'var(--ink-screen-border)',
  shadowSm:'var(--ink-shadow-sm)',
  shadowMd:'var(--ink-shadow-md)',
  sans:    `${beVietnam.style.fontFamily}, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  mono:    "'JetBrains Mono','Fira Code',monospace", // CHỈ cho timestamp/duration — 11px
} as const;

// Bán kính bo góc dùng chung — sm cho control nhỏ, md cho card, lg cho panel/modal.
export const R = { sm: 6, md: 12, lg: 16 };

// Chiều cao top bar CỦA TRANG LESSON (video/quiz/article/edit-space) — dùng
// cho breadcrumb bar tự vẽ trong từng trang đó.
// 2026-09-05 — đổi từ 52 → 56 (xem audit "Hệ Thống Header"): không có ngữ
// cảnh nào biện minh việc bar này thấp hơn APP_TOP_BAR_H 4px, chỉ là 2 người
// implement độc lập không đối chiếu. Giữ 2 hằng số TÁCH RỜI (không gộp làm
// một) vì lý do ban đầu vẫn đúng: đây là 2 ngữ cảnh điều hướng khác nhau,
// tình cờ cùng số không nên khoá cứng thành 1 con số.
export const TOP_BAR_H = 56;

// ── Công thức kích thước video LIÊN TỤC (dùng chung vibe-demo/page.tsx và
// spaces/[id]/learn) — video ăn toàn bộ chiều cao viewport trừ đi đúng phần
// bị chiếm thật (topbar + header) và một dải thở CỐ ĐỊNH. Nhờ vậy khoảng
// trống dưới video là hằng số ~BREATH px ở mọi cỡ màn, không phình theo màn
// to (nhược điểm của trần vh hằng số) và không nhảy bậc (nhược điểm của tier
// matchMedia). Chống bug "video tí hon khi zoom cao" (viewport CSS bị bóp
// lùn → phép trừ px ăn quá sâu) bằng SÀN VIDEO_FLOOR_VH: video không bao
// giờ thấp hơn nửa viewport.
export const HEADER_H = 64; // paddingTop 18 + h1 một dòng ~32 + paddingBottom 14
export const BREATH   = 96; // dải thở cố định dưới video
export const VIDEO_FLOOR_VH = 52;
// Compact: thay dải thở bằng "phần ló" của panel tab — video chỉ cần chừa
// đủ chỗ cho thanh tab + nửa dòng đầu hiện trên fold để user biết có gì
// bên dưới (cột này cuộn được). Sàn thấp hơn desktop vì màn nhỏ.
export const PANEL_PEEK = 110; // margin 16 + tab bar ~45 + nửa dòng playlist ~50
export const COMPACT_FLOOR_VH = 38;

// Chiều cao TopNav CỦA TRANG APP-LEVEL (home/about/spaces) — cố ý cao hơn
// breadcrumb 4px vì chứa cả logo + nav + avatar, không chỉ breadcrumb đơn
// dòng. Hai hằng số tách riêng để không vô tình đồng bộ hai ngữ cảnh điều
// hướng khác nhau khi chỉnh 1 trong 2.
export const APP_TOP_BAR_H = 56;

// Bề rộng "lề vở" — vùng metadata bên trái đường kẻ lề, dùng chung cho mọi
// layout có motif notebook-margin (playlist, notes, quiz sheet, article,
// about) để các panel thẳng hàng tuyệt đối.
export const MARGIN_W = 56;

// Zoom trình duyệt (Ctrl +/-) THU NHỎ viewport CSS hiệu dụng, không phóng to
// ảnh chụp trang — nên "chống zoom tốt" chính là "responsive theo chiều rộng
// viewport tốt". matchMedia phản ứng đúng với cả zoom lẫn resize cửa sổ thật.
export function useIsCompact(breakpointPx: number): boolean {
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setIsCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpointPx]);
  return isCompact;
}

// CSS dùng chung cho toàn bộ trang vibe-demo: focus-visible outline (a11y)
// + animation "hạ mực" (vd-ink-in) cho các trạng thái vừa xuất hiện (đã lưu,
// vừa chấm điểm...), có guard prefers-reduced-motion. Trước đây bị chép lại
// (và đôi khi thiếu keyframes) ở từng file riêng.
export const VIBE_GLOBAL_CSS = `
  .vd-focusable:focus-visible {
    outline: 2px solid ${T.accent};
    outline-offset: 2px;
    border-radius: 4px;
  }
  @keyframes vd-ink-in {
    from { opacity: 0; transform: translateY(-3px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .vd-ink-in { animation: vd-ink-in 400ms ease both; }
  @media (prefers-reduced-motion: reduce) {
    .vd-ink-in { animation: none; }
  }
`;
