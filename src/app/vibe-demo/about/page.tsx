'use client';

import React from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { beVietnam, R, MARGIN_W, APP_TOP_BAR_H, useIsCompact, VIBE_GLOBAL_CSS } from '@/lib/vibe/theme';
import { TopNav } from '@/components/vibe/TopNav';

/*
 * PILOT chuyển sang Tailwind: dùng namespace `ink-*` (tailwind.config.js) thay
 * cho object `T` + style={{}} — xem docs/DESIGN_ROADMAP.md mục 1 "Inline
 * style vs Tailwind/Radix". Trang này không dùng Radix primitive nào (không
 * Dialog/Tabs/Progress) nên là ứng viên pilot rủi ro thấp nhất: chỉ đổi cách
 * tô màu/khoảng cách, không đổi hành vi tương tác.
 *
 * Vẫn giữ style={{}} cho 2 trường hợp Tailwind không xử lý tốt: (1) giá trị
 * PHỤ THUỘC RUNTIME (APP_TOP_BAR_H, MARGIN_W — hằng số JS dùng chung với các
 * trang khác qua theme.ts, không nên hardcode lại thành class); (2) font
 * family của next/font — dùng `beVietnam.className` trên root thay vì
 * fontFamily lặp lại ở từng element.
 */
export default function VibeAboutDemoPage() {
  const isCompact = useIsCompact(760);

  const P = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-stretch">
      <span style={{ width: MARGIN_W }} className="shrink-0" />
      <p
        className="flex-1 border-l border-ink-marginLn px-2 pt-3 pb-1 pl-[22px] m-0 text-[16.5px] text-ink-textMid leading-[1.8]"
      >
        {children}
      </p>
    </div>
  );

  const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
    <div>
      <div className="flex items-stretch pt-10">
        <span
          style={{ width: MARGIN_W }}
          className="shrink-0 flex items-start justify-center pt-1 font-mono text-xs font-semibold text-ink-accent"
        >
          {n}
        </span>
        <h2 className="flex-1 border-l border-ink-marginLn px-2 pl-[22px] m-0 text-[22px] font-bold tracking-[-0.01em] text-ink-text leading-[1.4]">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );

  const PILLARS = [
    { n: '01', title: 'Sạch sẽ trước, đẹp sau',
      body: 'Một không gian học chỉ hiện ra thứ đang cần — không banner, không huy hiệu nhấp nháy, không widget mượn ánh nhìn. Cái đẹp ở đây là thứ còn lại sau khi bỏ hết những gì không cần.' },
    { n: '02', title: 'Học ở đâu tiếp ở đó',
      body: 'Video, quiz, bài đọc — mỗi dạng bài đều nhớ đúng chỗ bạn dừng lại. Mở lại một không gian sau một tuần vắng, việc đầu tiên bạn thấy là chỗ mình đã bỏ lại, không phải trang chủ tổng quát.' },
    { n: '03', title: 'Riêng tư là mặc định',
      body: 'Chế độ tập trung tắt hết những gì không phải bài học — kể cả những gì hệ thống muốn cho bạn xem thêm. Sự tập trung không phải một tính năng bật thêm, nó là trạng thái nghỉ của cả không gian.' },
  ];

  const NUMBERS = [
    { n: '0', label: 'quảng cáo trong bất kỳ không gian học nào' },
    { n: '1', label: 'nơi duy nhất mà video, quiz và bài đọc dùng chung một ngôn ngữ thiết kế' },
    { n: '∞', label: 'lần quay lại một bài học mà không mất chỗ đang dừng' },
  ];

  return (
    <div className={beVietnam.className}>
      <style>{VIBE_GLOBAL_CSS}</style>

      <TopNav active="about" />

      <div
        style={{ top: APP_TOP_BAR_H }}
        className="fixed left-0 right-0 bottom-0 bg-ink-page overflow-y-auto flex justify-center cs-scrollbar"
      >
        <div
          className="w-full max-w-[760px]"
          style={{ padding: isCompact ? '32px 16px 64px' : '48px 32px 80px' }}
        >
          {/* ── Trang bìa bài luận ── */}
          <div className="flex items-stretch">
            <span style={{ width: MARGIN_W }} className="shrink-0" />
            <div className="flex-1 border-l border-ink-marginLn px-2 pl-[22px]">
              <div className="flex items-center gap-2 text-[13px] font-medium text-ink-textMuted mb-3">
                <span>Spaces</span>
                <ChevronRight size={11} className="text-ink-textDim" />
                <span>Giới thiệu</span>
              </div>
              <h1 className="text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.02em] text-ink-text m-0 leading-[1.2]">
                Một không gian học,<br />không phải một cái bảng tin.
              </h1>
              <p className="text-[17px] text-ink-textMuted mt-[18px] leading-[1.7] max-w-[520px]">
                Chúng tôi tin gọn gàng không phải là gu thẩm mỹ — nó là điều kiện để một người
                còn muốn quay lại học tiếp vào ngày mai.
              </p>
            </div>
          </div>

          <Section n="§1" title="Không gian trước, nội dung sau">
            <P>
              Hầu hết ứng dụng học tập tối ưu cho lượt xem đầu tiên: nhiều màu, nhiều huy hiệu,
              nhiều thứ để bấm vào. Nhưng thứ quyết định một người có quay lại vào ngày thứ hai,
              thứ ba, không phải sự rực rỡ — mà là cảm giác căn phòng này vẫn <em>gọn</em> như lúc
              họ rời đi.
            </P>
            <P>
              Vì vậy chúng tôi thiết kế ngược lại thói quen chung: bắt đầu từ việc bỏ đi, không
              phải thêm vào. Mỗi màu, mỗi đường viền còn lại trên trang đều phải trả lời được
              câu hỏi &quot;nó giúp học nhanh hơn hay chỉ giúp trang trông vui hơn?&quot;.
            </P>
          </Section>

          <Section n="§2" title="Ba trụ cột">
            <div className="mt-1">
              {PILLARS.map(p => (
                <div key={p.n} className="flex items-stretch">
                  <span
                    style={{ width: MARGIN_W }}
                    className="shrink-0 flex items-start justify-center pt-[13px] font-mono text-xs font-semibold text-ink-textDim"
                  >
                    {p.n}
                  </span>
                  <div className="flex-1 border-l border-ink-marginLn px-2 pt-3 pb-1 pl-[22px]">
                    <div className="text-[16.5px] font-bold text-ink-text mb-1.5">
                      {p.title}
                    </div>
                    <div className="text-[15px] text-ink-textMid leading-[1.75]">
                      {p.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section n="§3" title="Bằng số, không bằng lời">
            <div className="mt-1">
              {NUMBERS.map((row, i) => (
                <div key={i} className="flex items-stretch">
                  <span
                    style={{ width: MARGIN_W }}
                    className="shrink-0 flex items-start justify-center pt-2.5 font-mono text-lg font-bold text-ink-accent"
                  >
                    {row.n}
                  </span>
                  <div className="flex-1 border-l border-ink-marginLn pl-[22px] pr-2 pt-[13px] pb-[9px] text-[15px] text-ink-textMid leading-[1.65]">
                    {row.label}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Lời kết — trích dẫn viền mực dày, đóng vai "hạ mực" của bài luận ── */}
          <div className="flex items-stretch mt-11">
            <span style={{ width: MARGIN_W }} className="shrink-0" />
            <div className="flex-1 border-l-2 border-ink-accent pl-[22px] pr-2 py-1 text-[19px] italic font-semibold text-ink-text leading-[1.6]">
              &ldquo;Không gian tốt nhất là không gian bạn quên mất mình đang dùng một sản phẩm.&rdquo;
            </div>
          </div>

          <div className="flex items-stretch mt-8">
            <span style={{ width: MARGIN_W }} className="shrink-0" />
            <div className="flex-1 border-l border-ink-marginLn pl-[22px] pr-2">
              <a
                href="/vibe-demo/spaces"
                className="vd-focusable inline-flex items-center gap-[9px] px-6 py-3 bg-ink-accent text-ink-onAccent no-underline text-[15px] font-semibold"
                style={{ borderRadius: R.sm }}
              >
                Tạo không gian đầu tiên của bạn <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
