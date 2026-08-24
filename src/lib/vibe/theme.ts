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

export const T = {
  page:    '#FAFAF7', // giấy trắng sứ — trung tính, nhiều khí thở
  pageDim: '#E9E9E4', // đèn phòng dịu xuống khi video đang chạy
  room:    '#1A1C22', // phòng tắt đèn — nền focus mode, KHÔNG phải dark theme
  panel:   '#FFFFFF', // mặt giấy của panel — trắng tuyệt đối, "spotlight" nội dung
  screen:  '#14161C', // màn hình video — luôn tối như thiết bị thật
  ink:     '#212633', // mực xanh-đen (blue-black ink) — chữ chính
  inkMid:  'rgba(33,38,51,0.72)',
  inkMuted:'rgba(33,38,51,0.50)',
  inkDim:  'rgba(33,38,51,0.28)',
  border:  'rgba(33,38,51,0.10)',
  borderHi:'rgba(33,38,51,0.20)',
  accent:  '#2E4A9E', // mực bút máy — accent duy nhất của cả trang
  accentA: 'rgba(46,74,158,0.08)',
  marginLn:'rgba(46,74,158,0.30)', // đường kẻ lề vở — motif cấu trúc chung của playlist & notes
  onAccent:'#FFFFFF',
  // Mực xanh "dưới ánh màn hình" — bản sáng của accent, chỉ dùng cho các
  // element nằm TRÊN nền video/phòng thi tối (progress, trạng thái đã lưu).
  accentScreen: '#8FA6EE',
  // Ngữ nghĩa chấm điểm — CHỈ dùng trong quiz, CHỈ sau khi nộp bài. Mực xanh
  // là nét bút của học viên (khi làm bài); correct/wrong là bút chấm của
  // giáo viên (chỉ xuất hiện sau khi chấm), không bao giờ trộn với accent.
  correct:  '#217A4A',
  correctA: 'rgba(33,122,74,0.08)',
  wrong:    '#A8362E',
  wrongA:   'rgba(168,54,46,0.07)',
  // "Chì/mực" — motif của edit-space: nét đứt (chì) = bản thảo/chưa đăng,
  // nét liền (marginLn/accent) = đã đăng. Không dùng ở trang tiêu thụ nội dung.
  pencilLn: 'rgba(33,38,51,0.30)',
  // Nền khối code — chỉ dùng trong article (motif "trang sách").
  codeBg:   'rgba(33,38,51,0.045)',
  shadowSm:'0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)',
  shadowMd:'0 2px 4px rgba(33,38,51,0.04), 0 16px 40px -16px rgba(33,38,51,0.20)',
  sans:    `${beVietnam.style.fontFamily}, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  mono:    "'JetBrains Mono','Fira Code',monospace", // CHỈ cho timestamp/duration — 11px
} as const;

// Bán kính bo góc dùng chung — sm cho control nhỏ, md cho card, lg cho panel/modal.
export const R = { sm: 6, md: 12, lg: 16 };

// Chiều cao top bar CỦA TRANG LESSON (video/quiz/article/edit-space) — dùng
// cho breadcrumb bar tự vẽ trong từng trang đó.
export const TOP_BAR_H = 52;

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
