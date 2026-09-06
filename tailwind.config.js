/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
    	extend: {
    		fontFamily: {
    			// "Mực xanh trên giấy trắng" — Be Vietnam Pro (đăng ký ở layout.tsx
    			// dưới biến CSS --font-sans), giữ Inter/system-ui làm fallback.
    			sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)',
    			// Bán kính bo góc riêng của hệ "Mực xanh trên giấy trắng" — đồng
    			// bộ 1-1 với R trong src/lib/vibe/theme.ts (sm=6/md=12/lg=16).
    			// Namespace riêng (rounded-ink-*) để không đè lên rounded-sm/md/lg
    			// mặc định mà các trang chưa migrate vẫn đang dùng.
    			'ink-sm': '6px',
    			'ink-md': '12px',
    			'ink-lg': '16px',
    		},
    		boxShadow: {
    			// Bóng đổ mềm, 2 lớp (contact shadow sát + ambient shadow xa),
    			// thay cho shadow-sm/shadow-md mặc định của Tailwind trên panel/
    			// card. Giá trị thật ở globals.css (--ink-shadow-sm/md), giữ
    			// đồng bộ 1-1 với T.shadowSm/T.shadowMd trong theme.ts.
    			'ink-sm': 'var(--ink-shadow-sm)',
    			'ink-md': 'var(--ink-shadow-md)',
    		},
    		colors: {
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			},
    			// "Mực xanh trên giấy trắng" — namespace riêng cho design system
    			// vibe-demo, tách khỏi theme shadcn ở trên để không đụng tên
    			// (accent/primary/border... đã có nghĩa khác trong theme cũ).
    			// NGUỒN GIÁ TRỊ THẬT là block :root { --ink-* } trong globals.css —
    			// ở đây và src/lib/vibe/theme.ts (object T) chỉ tham chiếu var(),
    			// không định nghĩa hex riêng nữa. Đổi màu → sửa globals.css,
    			// KHÔNG sửa file này. (Dark mode của hệ này KHÔNG phải theme toàn
    			// app — "phòng tối"/focus mode là trạng thái cục bộ từng trang,
    			// nên vẫn là hex đặc qua var(), không qua hsl() như shadcn.)
    			ink: {
    				page: 'var(--ink-page)',
    				pageDim: 'var(--ink-page-dim)',
    				room: 'var(--ink-room)',
    				panel: 'var(--ink-panel)',
    				screen: 'var(--ink-screen)',
    				text: 'var(--ink-text)',
    				textMid: 'var(--ink-text-mid)',
    				textMuted: 'var(--ink-text-muted)',
    				textDim: 'var(--ink-text-dim)',
    				border: 'var(--ink-border)',
    				borderHi: 'var(--ink-border-hi)',
    				accent: 'var(--ink-accent)',
    				accentA: 'var(--ink-accent-a)',
    				accentScreen: 'var(--ink-accent-screen)',
    				onAccent: 'var(--ink-on-accent)',
    				marginLn: 'var(--ink-margin-ln)',
    				correct: 'var(--ink-correct)',
    				correctA: 'var(--ink-correct-a)',
    				wrong: 'var(--ink-wrong)',
    				wrongA: 'var(--ink-wrong-a)',
    				// Ngữ nghĩa trạng thái CHUNG (badge/banner: active/archived,
    				// free/paid, cảnh báo giới hạn...) — khác correct/wrong ở trên
    				// (chỉ dành riêng cho bài chấm quiz).
    				success: 'var(--ink-success)',
    				successA: 'var(--ink-success-a)',
    				successBorder: 'var(--ink-success-border)',
    				warning: 'var(--ink-warning)',
    				warningA: 'var(--ink-warning-a)',
    				warningBorder: 'var(--ink-warning-border)',
    				// Bản warning trên nền tối — xem chú thích tại
    				// :root { --ink-warning-screen } ở globals.css.
    				warningScreen: 'var(--ink-warning-screen)',
    				pencil: 'var(--ink-pencil)',
    				codeBg: 'var(--ink-code-bg)',
    				// Chữ/viền trên nền đảo màu (ink.room hoặc khối nền tối cục bộ
    				// khác) — xem chú thích đầy đủ tại :root { --ink-screen-* } ở
    				// globals.css.
    				screenText: 'var(--ink-screen-text)',
    				screenTextMid: 'var(--ink-screen-text-mid)',
    				screenTextMuted: 'var(--ink-screen-text-muted)',
    				screenTextDim: 'var(--ink-screen-text-dim)',
    				screenBorder: 'var(--ink-screen-border)',
    			}
    		}
    	}
    },
    plugins: [require("tailwindcss-animate")],
}
