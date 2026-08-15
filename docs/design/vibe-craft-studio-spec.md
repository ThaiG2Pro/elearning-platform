# Thiết Kế Vibe & Soul Product Specification: "Craft Studio" (Modern Dark Onyx)

> **Quyết định thiết kế giao diện & Linh hồn sản phẩm (Design System & Product Vibe)**
> - **Tên định hình**: **Craft Studio** (Xưởng Chế tác Tri thức)
> - **Cảm hứng**: Linear.app, Obsidian, Raycast, VS Code Dark, Vercel
> - **Đối tượng mục tiêu**: Lập trình viên & Người tự học mảng Kỹ thuật/Tech (Self-taught Devs)
> - **Triết lý cốt lõi**: Tinh gọn, Sắc nét, Không xao nhãng, Chuẩn mực kỹ thuật cao (High-performance workspace).

---

## 1. LINH HỒN SẢN PHẨM (PRODUCT SOUL)

Khi bước vào **Craft Studio**, người học không có cảm giác đang ở trên một nền tảng giải trí (YouTube) hay một lớp học hành chính nặng nề (LMS truyền thống). 

Họ cảm thấy mình đang bước vào **một Xưởng làm việc chuyên nghiệp (Professional Workshop)** — nơi mọi công cụ đều sắc bén, môi trường tối giản hoàn toàn giúp tập trung 100% vào việc cày code, ghi chú và tích lũy kỹ năng.

### 3 Nguyên tắc Thiết kế Cốt lõi (Design Guiding Principles)

1. **Sub-pixel Precision & Low Noise (Độ chính xác cao & Khử nhiễu tuyệt đối)**:
   - Loại bỏ các đường viền dày hoặc đổ bóng rườm rà.
   - Sử dụng các đường viền siêu mỏng mờ (`border-white/10` hoặc `border-slate-800`), hiệu ứng kính mờ (glassmorphism backdrop blur) giúp giao diện có chiều sâu tinh tế.
2. **Focus-First Dark Palette (Tông tối bảo vệ mắt & Tăng sự tập trung)**:
   - Tông nền tối Obsidian (`#0B0F17` / `#0D1117`) giúp giảm mỏi mắt khi cày bài ban đêm.
   - Điểm nhấn bằng màu xanh Emerald điện toán (`#10B981`) cho các trạng thái tiến độ/hoàn thành và sắc cam Amber (`#F59E0B`) cho chuỗi học tập nhóm (Group Streak 🔥).
3. **Developer-Grade Typography (Font chữ chuẩn chỉnh cho Dev)**:
   - Kết hợp giữa font Sans-serif hiện đại (**Inter / Geist**) cho văn bản chính và **JetBrains Mono / Fira Code** cho mã nguồn, mốc thời gian (timestamp) và các thông số kỹ thuật.

---

## 2. BẢNG MÀU CHÍNH TỨC (DESIGN TOKENS & COLOR PALETTE)

| Thành phần UI | Tên token | Giá trị Hex / Tailwind | Ý nghĩa & Ứng dụng |
| :--- | :--- | :--- | :--- |
| **Nền chính (Background)** | `bg-main` | `#0B0F17` (`slate-950`) | Nền không gian tối Onyx sâu |
| **Khung chứa (Container / Card)** | `bg-surface` | `#161B26` / `rgba(22, 27, 38, 0.7)` | Mặt kính mờ Glassmorphism |
| **Đường viền (Micro Border)** | `border-subtle` | `rgba(255, 255, 255, 0.08)` | Viền mỏng phân tách sắc nét |
| **Chữ chính (Primary Text)** | `text-primary` | `#F9FAFB` (`slate-50`) | Độ tương phản cao, dễ đọc |
| **Chữ phụ (Muted Text)** | `text-muted` | `#9CA3AF` (`slate-400`) | Ghi chú, phụ đề, thời gian |
| **Nhấn Hoàn thành (Accent Emerald)** | `accent-emerald` | `#10B981` (`emerald-500`) | Đánh dấu bài xong, tiến độ |
| **Nhấn Chuỗi nhóm (Accent Amber)** | `accent-amber` | `#F59E0B` (`amber-500`) | Biểu tượng Group Streak 🔥 |
| **Tín hiệu AI (AI Pulse)** | `accent-indigo` | `#6366F1` (`indigo-500`) | Badge tóm tắt AI / Quiz |

---

## 3. THIẾT KẾ THÀNH PHẦN (COMPONENT DESIGN SPECIFICATIONS)

### 📹 1. Video Player Container (Khung phát bài học)
- **Tỷ lệ**: 16:9 sắc nét, nhúng trực tiếp không kèm quảng cáo hay gợi ý YouTube bên ngoài.
- **Bo góc**: `rounded-xl` (`12px`).
- **Viền**: `border border-white/10`.
- **Giao diện đi kèm**: Nút lưu bookmark timestamp 1-click ngay bên dưới video.

### 📊 2. Peer Activity Feed & Companions Widget (Thành phần Cùng học)
- **Vị trí**: Cột bên phải (Sidebar) hoặc bên dưới Player.
- **Phong cách**: Thẻ nhỏ dạng danh sách gọn nhẹ (`bg-slate-900/60 border border-slate-800`).
- **Avatar**: Avatar bo tròn kèm một chấm màu xanh lá mạ `emerald-500` thể hiện tín hiệu hoạt động gần đây.
- **Nút tương tác**: Nút `[Chọc rủ học]` dạng pill badge viền mờ `hover:bg-emerald-500/10 hover:border-emerald-500/40`.

### 🤖 3. AI Summary & Quiz Box (Thùng chứa Tóm tắt AI)
- **Phong cách**: Khung kính mờ có hiệu ứng dải sáng hổ phách mỏng ở viền trên (`border-t-2 border-t-amber-500/60`).
- **Typography**: Trình bày dạng Bullet points ngắn gọn, hỗ trợ markdown và fenced code blocks với cú pháp highlight chuẩn IDE.

---

## 4. LỘ TRÌNH CHUYỂN ĐỔI GIAO DIỆN (UI IMPLEMENTATION ROADMAP)

1. **Cập nhật Tailwind & CSS Tokens**: Thiết lập đúng các biến HSL / CSS variables trong `globals.css` và `tailwind.config.js` theo bảng màu Onyx & Emerald trên.
2. **Cải tiến Layout Không Gian Học (`/courses/[id]/learn`)**: Áp dụng giao diện tối ưu không xao nhãng cho Player, Note-taking panel và Sidebar "Cùng học".
3. **Polish Micro-interactions**: Thêm hiệu ứng hover mượt mà (`transition-all duration-200 ease-out`), glow nhẹ cho các nút hành động chính.
