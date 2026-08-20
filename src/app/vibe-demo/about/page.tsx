'use client';

import React, { useState } from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { Be_Vietnam_Pro } from 'next/font/google';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const T = {
  page:    '#FAFAF7',
  panel:   '#FFFFFF',
  ink:     '#212633',
  inkMid:  'rgba(33,38,51,0.72)',
  inkMuted:'rgba(33,38,51,0.50)',
  inkDim:  'rgba(33,38,51,0.28)',
  border:  'rgba(33,38,51,0.10)',
  borderHi:'rgba(33,38,51,0.20)',
  accent:  '#2E4A9E',
  accentA: 'rgba(46,74,158,0.08)',
  marginLn:'rgba(46,74,158,0.30)',
  onAccent:'#FFFFFF',
  shadowSm:'0 1px 2px rgba(33,38,51,0.04), 0 4px 12px -6px rgba(33,38,51,0.08)',
  shadowMd:'0 2px 4px rgba(33,38,51,0.04), 0 16px 40px -16px rgba(33,38,51,0.20)',
  sans:    `${beVietnam.style.fontFamily}, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  mono:    "'JetBrains Mono','Fira Code',monospace",
} as const;

const TOP_BAR_H = 56;
const R = { sm: 6, md: 12, lg: 16 };
const MARGIN_W = 56;

function useIsCompact(breakpointPx: number): boolean {
  const [isCompact, setIsCompact] = useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setIsCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpointPx]);
  return isCompact;
}

function TopNav({ active }: { active: 'home' | 'spaces' | 'about' }) {
  const items: { key: typeof active; label: string; href: string }[] = [
    { key: 'home',   label: 'Trang chủ',          href: '/vibe-demo/home' },
    { key: 'spaces', label: 'Không gian của tôi', href: '/vibe-demo/spaces' },
    { key: 'about',  label: 'Giới thiệu',          href: '/vibe-demo/about' },
  ];
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: TOP_BAR_H, zIndex: 50,
      background: T.panel, borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: 28,
    }}>
      <a href="/vibe-demo/home" style={{
        fontFamily: T.sans, fontSize: 17, fontWeight: 700, color: T.ink,
        letterSpacing: '-0.01em', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ color: T.accent }}>✒</span> Spaces
      </a>
      <nav style={{ display: 'flex', gap: 22 }}>
        {items.map(it => (
          <a key={it.key} href={it.href} className="vd-focusable" style={{
            fontFamily: T.sans, fontSize: 14, fontWeight: it.key === active ? 600 : 450,
            color: it.key === active ? T.ink : T.inkMuted,
            textDecoration: 'none', padding: '4px 0',
            borderBottom: `2px solid ${it.key === active ? T.accent : 'transparent'}`,
          }}>
            {it.label}
          </a>
        ))}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: T.accent, color: T.onAccent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.sans, fontSize: 12.5, fontWeight: 700,
        }}>
          TH
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function VibeAboutDemoPage() {
  const isCompact = useIsCompact(760);

  const P = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      <span style={{ width: MARGIN_W, flexShrink: 0 }} />
      <p style={{
        flex: 1, borderLeft: `1px solid ${T.marginLn}`,
        padding: '12px 8px 4px 22px', margin: 0,
        fontFamily: T.sans, fontSize: 16.5, color: T.inkMid, lineHeight: 1.8,
      }}>
        {children}
      </p>
    </div>
  );

  const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
    <div>
      <div style={{ display: 'flex', alignItems: 'stretch', paddingTop: 40 }}>
        <span style={{
          width: MARGIN_W, flexShrink: 0,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 4,
          fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.accent,
        }}>
          {n}
        </span>
        <h2 style={{
          flex: 1, borderLeft: `1px solid ${T.marginLn}`,
          padding: '0 8px 0 22px', margin: 0,
          fontFamily: T.sans, fontSize: 22, fontWeight: 700,
          letterSpacing: '-0.01em', color: T.ink, lineHeight: 1.4,
        }}>
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
    <>
      <style>{`
        .vd-focusable:focus-visible {
          outline: 2px solid ${T.accent};
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>

      <TopNav active="about" />

      <div style={{
        position: 'fixed', top: TOP_BAR_H, left: 0, right: 0, bottom: 0,
        background: T.page, overflowY: 'auto', display: 'flex', justifyContent: 'center',
      }} className="cs-scrollbar">
        <div style={{
          width: '100%', maxWidth: 760,
          padding: isCompact ? '32px 16px 64px' : '48px 32px 80px',
        }}>
          {/* ── Trang bìa bài luận ── */}
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <span style={{ width: MARGIN_W, flexShrink: 0 }} />
            <div style={{ flex: 1, borderLeft: `1px solid ${T.marginLn}`, padding: '0 8px 0 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.sans, fontSize: 13, fontWeight: 500, color: T.inkMuted, marginBottom: 12 }}>
                <span>Spaces</span>
                <ChevronRight size={11} style={{ color: T.inkDim }} />
                <span>Giới thiệu</span>
              </div>
              <h1 style={{
                fontFamily: T.sans, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700,
                letterSpacing: '-0.02em', color: T.ink, margin: 0, lineHeight: 1.2,
              }}>
                Một không gian học,<br />không phải một cái bảng tin.
              </h1>
              <p style={{ fontFamily: T.sans, fontSize: 17, color: T.inkMuted, marginTop: 18, lineHeight: 1.7, maxWidth: 520 }}>
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
            <div style={{ marginTop: 4 }}>
              {PILLARS.map(p => (
                <div key={p.n} style={{ display: 'flex', alignItems: 'stretch' }}>
                  <span style={{
                    width: MARGIN_W, flexShrink: 0,
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    paddingTop: 13,
                    fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.inkDim,
                  }}>
                    {p.n}
                  </span>
                  <div style={{ flex: 1, borderLeft: `1px solid ${T.marginLn}`, padding: '12px 8px 4px 22px' }}>
                    <div style={{ fontFamily: T.sans, fontSize: 16.5, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
                      {p.title}
                    </div>
                    <div style={{ fontFamily: T.sans, fontSize: 15, color: T.inkMid, lineHeight: 1.75 }}>
                      {p.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section n="§3" title="Bằng số, không bằng lời">
            <div style={{ marginTop: 4 }}>
              {NUMBERS.map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'stretch' }}>
                  <span style={{
                    width: MARGIN_W, flexShrink: 0,
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    paddingTop: 10,
                    fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: T.accent,
                  }}>
                    {row.n}
                  </span>
                  <div style={{
                    flex: 1, borderLeft: `1px solid ${T.marginLn}`,
                    padding: '13px 8px 9px 22px',
                    fontFamily: T.sans, fontSize: 15, color: T.inkMid, lineHeight: 1.65,
                  }}>
                    {row.label}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Lời kết — trích dẫn viền mực dày, đóng vai "hạ mực" của bài luận ── */}
          <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 44 }}>
            <span style={{ width: MARGIN_W, flexShrink: 0 }} />
            <div style={{
              flex: 1, borderLeft: `2px solid ${T.accent}`,
              padding: '4px 8px 4px 22px',
              fontFamily: T.sans, fontSize: 19, fontStyle: 'italic', fontWeight: 600,
              color: T.ink, lineHeight: 1.6,
            }}>
              &ldquo;Không gian tốt nhất là không gian bạn quên mất mình đang dùng một sản phẩm.&rdquo;
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 32 }}>
            <span style={{ width: MARGIN_W, flexShrink: 0 }} />
            <div style={{ flex: 1, borderLeft: `1px solid ${T.marginLn}`, padding: '0 8px 0 22px' }}>
              <a href="/vibe-demo/spaces" className="vd-focusable" style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                padding: '12px 24px',
                background: T.accent, color: T.onAccent,
                borderRadius: R.sm, textDecoration: 'none',
                fontFamily: T.sans, fontSize: 15, fontWeight: 600,
              }}>
                Tạo không gian đầu tiên của bạn <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
