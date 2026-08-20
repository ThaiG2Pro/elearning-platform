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
    			sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
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
    			// Giá trị hex tĩnh (không qua CSS var) vì dark mode của hệ này
    			// KHÔNG phải theme toàn app — "phòng tối"/"focus mode" là trạng
    			// thái cục bộ của từng trang, xem src/lib/vibe/theme.ts.
    			// Giữ đồng bộ 1-1 với object T trong file đó khi còn tồn tại
    			// song song hai hệ token.
    			ink: {
    				page: '#FAFAF7',
    				pageDim: '#E9E9E4',
    				room: '#1A1C22',
    				panel: '#FFFFFF',
    				screen: '#14161C',
    				text: '#212633',
    				textMid: 'rgba(33,38,51,0.72)',
    				textMuted: 'rgba(33,38,51,0.50)',
    				textDim: 'rgba(33,38,51,0.28)',
    				border: 'rgba(33,38,51,0.10)',
    				borderHi: 'rgba(33,38,51,0.20)',
    				accent: '#2E4A9E',
    				accentA: 'rgba(46,74,158,0.08)',
    				accentScreen: '#8FA6EE',
    				onAccent: '#FFFFFF',
    				marginLn: 'rgba(46,74,158,0.30)',
    				correct: '#217A4A',
    				correctA: 'rgba(33,122,74,0.08)',
    				wrong: '#A8362E',
    				wrongA: 'rgba(168,54,46,0.07)',
    				pencil: 'rgba(33,38,51,0.30)',
    				codeBg: 'rgba(33,38,51,0.045)',
    			}
    		}
    	}
    },
    plugins: [require("tailwindcss-animate")],
}
