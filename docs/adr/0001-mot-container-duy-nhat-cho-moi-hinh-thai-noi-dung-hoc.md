# Một container duy nhất cho mọi hình thái nội dung học

Nội dung nguồn (chủ yếu YouTube) đến ở ba hình thái: video lẻ để nghiền ngẫm, playlist có trình tự sư phạm của chủ kênh, và playlist tạp tự gom. Chúng tôi quyết định **không** thêm loại container thứ hai (kiểu "bộ sưu tập"/"watch-later") — cả ba hình thái đều là một **Khóa học**: "không gian học cá nhân quanh nội dung nguồn muốn học" (xem CONTEXT.md), khác nhau ở cấu trúc (1 bài / phẳng / có chương) chứ không ở bản chất. Lý do: cả ba dùng chung trọn bộ tính năng (notes, quiz tự thêm, tiến độ, share/clone), còn container thứ hai sẽ nhân đôi mọi luồng đó với lợi ích chỉ là cái tên; ngữ nghĩa "hoàn thành" cũng giữ đồng nhất cho mọi hình thái.

## Considered Options

- Container thứ hai tách riêng cho bộ sưu tập tạp — bị loại vì nhân đôi progress/share/clone/notes.
- Đổi tên khái niệm toàn hệ thống (kiểu "Notebook" của NotebookLM) — bị loại trước mắt; giữ "khóa học" ở code/DB, nới nghĩa trong glossary; từ hiển thị trên UI là quyết định riêng còn mở.

## Consequences

- Tầng Chương trở thành tùy chọn về mặt khái niệm (cách nhóm bài); cài đặt cụ thể (chương mặc định ẩn vs. migration nullable) là quyết định riêng.
- Bảng `sources` phải ghi nhận được xuất xứ playlist của video, dù tự động hóa import playlist nằm ngoài phạm vi.
