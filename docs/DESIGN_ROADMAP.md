# Design Roadmap — "Mực xanh trên giấy trắng"

> Theo dõi các vấn đề cần giải quyết trước khi đưa design system từ
> `/vibe-demo/*` (7 trang demo tĩnh) vào áp dụng thật cho toàn app.
> Tạo ngày 2026-08-20, sau buổi review tổng thể 7 trang demo.

## Bối cảnh

7 trang demo hiện có, dùng chung 1 ngôn ngữ thiết kế (nền trắng
`#FAFAF7`, mực xanh-đen `#212633`, accent xanh mực `#2E4A9E`, motif
"lề vở"/"vệt mực đọc"/"gáy sách"/"lịch mực"...):

- `/vibe-demo/home` — dashboard sau đăng nhập
- `/vibe-demo/about` — trang giới thiệu
- `/vibe-demo/spaces` — danh sách không gian học (giá sách)
- `/vibe-demo/article` — bài học dạng đọc
- `/vibe-demo/edit-space` — trang biên soạn khóa học
- `/vibe-demo/quiz` — bài kiểm tra dạng thi có giờ
- `/vibe-demo` — trang lesson video gốc

Mỗi trang là 1 file self-contained, style inline, tự khai báo lại
token/font/sub-component riêng — **chưa từng chạm vào app thật**.
App thật hiện dùng **Tailwind + Radix UI + shadcn-style components**
(`tailwindcss`, `@radix-ui/react-*`, `clsx`, `tailwind-merge`) — đây
là khoảng cách lớn nhất cần giải quyết trước khi tích hợp.

---

## 1. Kỹ thuật — chưa sẵn sàng để tích hợp thật

- [x] **Không có nguồn token chung** (xử lý 2026-08-20): tạo
      `src/lib/vibe/theme.ts` làm nguồn chân lý duy nhất — export `T`
      (toàn bộ màu/shadow/font, hợp nhất từ 7 file cũ, kể cả các key
      chỉ dùng riêng ở 1 trang như `correct/wrong`, `pencilLn`,
      `codeBg`), `R`, `MARGIN_W`, `TOP_BAR_H` (52 — breadcrumb trang
      lesson), `APP_TOP_BAR_H` (56 — TopNav trang app-level, tách
      riêng có chủ đích, xem ghi chú trong file), hook `useIsCompact`,
      và `VIBE_GLOBAL_CSS` (focus-visible + `vd-ink-in` keyframes).
      Cả 7 trang `/vibe-demo/*` đã refactor để import từ đây thay vì
      tự khai báo lại. Đã verify: `tsc --noEmit` sạch, cả 7 route vẫn
      200 sau refactor.
- [x] **Chưa tách component dùng chung** (xử lý 2026-08-20, một phần):
      `TopNav` (dùng ở home/about/spaces) rút ra
      `src/components/vibe/TopNav.tsx`, 3 trang import chung thay vì
      định nghĩa lại 3 lần (trước đây home còn lệch 1 alias `T_` so
      với 2 file kia). `Section`/`P` ở about và article **CỐ Ý chưa
      gộp** — khác nhau về type prop (`n: string` vs `n: number`,
      article còn `ref`-attach vào `sectionRefs`) và padding/fontSize,
      gộp ép sẽ làm một trong hai bị sai lệch trực quan. Cần quyết
      định rõ ràng (tham số hóa hay giữ tách) trước khi gộp — xem
      "Đề xuất bước tiếp theo" bên dưới.
- [x] **Font load trùng lặp** (xử lý 2026-08-20): `Be_Vietnam_Pro` giờ
      chỉ gọi 1 lần trong `src/lib/vibe/theme.ts`, export `beVietnam`
      + `T.sans` sẵn — 7 trang không tự gọi `next/font/google` nữa.
- [x] **Đặt tên tránh đụng `colors.accent`** (quyết định 2026-08-20,
      người dùng chọn): dùng **namespace riêng `ink.*`** trong
      `tailwind.config.js`, KHÔNG đổi/xoá theme shadcn hiện có. Đã thêm
      `colors.ink` (page, pageDim, room, panel, screen, text, textMid,
      textMuted, textDim, border, borderHi, accent, accentA,
      accentScreen, onAccent, marginLn, correct/correctA,
      wrong/wrongA, pencil, codeBg) — giá trị hex/rgba tĩnh, đồng bộ
      1-1 với `T` trong `src/lib/vibe/theme.ts` (không qua CSS var, vì
      dark mode của hệ này là trạng thái cục bộ per-page, không phải
      theme toàn app). Verify: `tsc --noEmit` sạch (2 lỗi còn lại là
      tiền tồn tại, không liên quan). Hai hệ token (`ink.*` Tailwind và
      `T` trong `theme.ts`) sẽ tồn tại song song cho đến khi migrate
      xong toàn bộ 7 trang — cần giữ đồng bộ thủ công nếu sửa 1 bên.
- [x] **Migrate toàn bộ 7 trang sang Tailwind `ink.*`** (xử lý
      2026-08-20): pilot ở `about` trước, sau đó lan pattern ra 6 trang
      còn lại (`home`, `spaces`, `article`, `edit-space`, `quiz`,
      `page.tsx` gốc) qua 6 agent chạy song song. Tất cả `T.*` (object
      trong `theme.ts`) chuyển sang class Tailwind namespace `ink.*`
      (`bg-ink-page`, `text-ink-text`, `border-ink-marginLn`,
      `text-ink-accent`...); `T.sans` chuyển thành `beVietnam.className`
      áp 1 lần ở root thay vì lặp `fontFamily` từng element; `T.mono`
      dùng class `font-mono` (xấp xỉ, không phải chính xác
      JetBrains Mono/Fira Code — chấp nhận được, xem ghi chú bên dưới).
      Verify: `tsc --noEmit` sạch (2 lỗi còn lại tiền tồn tại), cả 7
      route đều 200 sau migrate, không đổi UI/hành vi.
  - **Vẫn cố ý giữ `style={{}}`** ở mọi trang cho: hằng số JS runtime
    dùng chung qua `theme.ts` (`MARGIN_W`, `TOP_BAR_H`/`APP_TOP_BAR_H`,
    `R.sm/md/lg` — không có entry Tailwind cho border-radius này),
    `T.shadowSm`/`T.shadowMd` (không có entry Tailwind cho box-shadow),
    giá trị phụ thuộc state/props (isCompact, focusMode, tab đang chọn,
    điểm số quiz...), công thức tính kích thước video bằng calc/clamp
    ở `page.tsx` gốc (HEADER_H/BREATH/VIDEO_FLOOR_VH...), và các đoạn
    JS mutate `element.style` trực tiếp qua `onMouseEnter`/`onMouseLeave`
    (không thể biểu diễn bằng class JSX).
  - **Phát hiện phụ khi migrate `edit-space`**: nút "Thêm bài học" có
    thứ tự set `borderLeft` → `border: 'none'` → `borderLeftStyle` gây
    border thực tế render ra khác ý định gốc (`medium dashed
    currentColor` thay vì `1.5px dashed pencilLn`). Agent đã CỐ Ý giữ
    nguyên hành vi (kể cả bug) thay vì tự sửa, để không lẫn 1 lần sửa
    bug vào 1 PR "chỉ đổi cách viết style" — cần 1 quyết định/PR riêng
    xem có sửa bug này không.
  - [ ] **Radix hoá chưa làm**: rà soát cho thấy KHÔNG có `<div>` tự
        chấm mô phỏng modal/dialog/tab-switcher đủ rõ ràng để đổi sang
        Radix `Dialog`/`Tabs` một cách an toàn ở bất kỳ trang nào trong
        7 trang hiện tại (kể cả `edit-space`/`quiz` — tương tác ở đó là
        cycle/toggle state trực tiếp, không phải overlay/tab thật). Khi
        nào có UI dạng modal/tab thật (ví dụ hộp thoại xác nhận xoá,
        tab chuyển view) mới có chỗ để áp Radix.
- [ ] **Toàn bộ dữ liệu hardcode**: `QUIZ`, `SPACES`, `LESSONS`... là
      mảng cứng. Đã rà soát 2026-08-20:
  - [x] Empty state — đã có pattern ở 2 nơi: notes rỗng
        ("Chưa có ghi chú nào...", `page.tsx`/`article/page.tsx`) và
        tab space rỗng ("Ngăn này chưa có không gian nào.",
        `spaces/page.tsx`). Mẫu tốt để tái dùng khi có data thật, đủ
        cho quiz/playlist khi tích hợp.
  - [ ] Loading state (skeleton khi fetch) — CHƯA có, và **chưa có ý
        nghĩa để làm ở dạng demo tĩnh** (không có fetch thật). Chỉ nên
        làm khi nối vào API thật ở bước tích hợp.
  - [ ] Error state (fetch fail, network lỗi) — tương tự, chờ tích hợp
        API thật mới có target cụ thể để thiết kế.
  - [ ] Pagination / virtualization khi list dài (spaces, playlist dài)
        — chưa test, xem mục 3 "Nội dung thật" bên dưới.

## 2. Responsive / đa thiết bị

- [x] Test thật trên iPhone SE (375px) do user tự làm, không phải
      code-review/screenshot ảo — tìm ra 1 HỌ LỖI lặp lại ở nhiều
      trang: **quá nhiều phần tử `shrink-0` nhồi trong 1 hàng ngang**,
      khi tổng chiều rộng không-co-được vượt quá viewport hẹp, phần
      cuối hàng bị đẩy khỏi màn hình — MẤT HẲN, không có scroll bù,
      không dấu hiệu còn nội dung. 2 biến thể của cùng lỗi:
  - **Wrap dọc**: span không có `whitespace-nowrap` bị flex ép co lại,
    chữ tự word-wrap xuống nhiều dòng, thanh có chiều cao cố định nên
    chỉ dòng giữa lọt vào khung nhìn (`article/page.tsx`,
    `quiz/page.tsx` breadcrumb; `TopNav.tsx` — ảnh hưởng CẢ 3 trang
    home/spaces/about vì dùng chung component, đây là lỗi nặng nhất
    tìm được vì không có xử lý mobile nào từ đầu).
  - **Tràn ngang vô hình**: các phần tử đã `shrink-0` đúng (không
    wrap chữ) nhưng tổng cộng vẫn vượt viewport → phần cuối (thường là
    nút hành động) bị đẩy ra ngoài, vô hình hoàn toàn
    (`edit-space/page.tsx`: top bar nút "Lưu bản thảo", header chương
    mất nút xuống/xóa, dòng bài học mất nút xóa).
  - Sửa theo 1 trong 2 cách tuỳ tình huống: (a) `whiteSpace: nowrap` +
    ẩn crumb/nhãn phụ khi `isCompact` (breadcrumb, TopNav), hoặc (b)
    gãy 1 hàng thành 2 dòng ở màn hẹp — dòng chính (tên/nội dung cần
    đọc/sửa) + dòng phụ (nút hành động canh phải) — khi các nút đều
    thiết yếu, không thể ẩn (header chương, dòng bài học ở
    `edit-space`, vì `GripVertical` chỉ trang trí, 2 nút lên/xuống là
    cách sắp xếp lại DUY NHẤT, không có drag thật).
  - Đã kiểm tra riêng panel "Thông tin không gian" (properties panel,
    `edit-space`) và margin-lề (`MARGIN_W`) trên article/about — cả 2
    AN TOÀN vì dùng `w-full`/`flex-1` chia đều nội dung, không có tổ
    hợp `shrink-0` cộng dồn kiểu trên. Đây có thể coi là 1 quy tắc nên
    áp dụng chung: ưu tiên `flex-1`/`w-full` hơn `shrink-0` hàng loạt
    khi thiết kế 1 hàng ngang có nhiều phần tử.
  - Verify từng fix: `tsc --noEmit` sạch (2 lỗi tiền tồn tại), route
    liên quan trả 200.
- [ ] Còn chưa test trực tiếp: grid câu hỏi quiz (question map) ở màn
      hẹp, và cuộn dài (50+ chương/bài) trên `edit-space` sau khi sửa.
      Cần user tiếp tục test tay các phần còn lại của 7 trang.

## 3. Nội dung thật, không phải nội dung mẫu

- [x] Rà + cứng hóa overflow/truncate + scale số lượng lớn trên cả 5
      trang có list/text từ data (`spaces`, `home`, `quiz`,
      `page.tsx` video chính, `edit-space`) — không đổi dữ liệu demo,
      chỉ làm rendering chịu được data thật (tên dài, số liệu nhiều
      chữ số, 50+ item). Không dùng agent/screenshot ảo — mỗi trang
      được review code trực tiếp bởi 1 agent riêng, có `tsc --noEmit`
      + curl route xác nhận, kết quả:
  - **spaces**: title đã `truncate`, desc đã `line-clamp-2`, cả hai
    kèm `title=` tooltip. Sửa 1 chỗ: badge `%` đổi `w-[30px]` →
    `min-w-[30px] shrink-0` để không vỡ nếu số có phần thập phân.
    Xác nhận list `filtered.map` là page-scroll (không có
    max-height/overflow clip) → chịu được 50+ space, có ghi chú
    trong code.
  - **home**: title/label không gian, breadcrumb, tên bài học đã có
    `truncate`/`line-clamp-2` + tooltip từ trước. Thêm: badge ribbon
    `%` cố tình GIỮ `w-[30px]` cố định (không đổi `min-w`) vì
    `clipPath` của ribbon phụ thuộc kích thước box — đã ghi chú lý
    do; dòng chào (tên người dùng thật có thể dài) đổi sang
    `min-w-0` + `shrink-0` cho ngày để ưu tiên xuống dòng thay vì
    ép dẹt ngày.
  - **quiz** (1041 dòng): review xong, KHÔNG cần sửa gì — câu
    hỏi/đáp án vẫn để wrap tự nhiên (không truncate nội dung phải
    đọc để trả lời), `renderQuestionMap` đã `flex flex-wrap` chịu
    được 50+ câu (đã có ghi chú kích thước nút vs 3 chữ số), rail
    playlist đã có scroll container thật, timer đã
    `tabular-nums`.
  - **page.tsx (video chính)**: rail playlist + notes đã xác nhận có
    scroll container thật ở mọi mode (desktop/focus/compact) — thêm
    ghi chú. Thêm `truncate` + tooltip cho tiêu đề bài học (H1) và
    tên chương ở top bar (trước đây không giới hạn độ rộng). Không
    đụng công thức tính cỡ video, không truncate nội dung note.
  - **edit-space**: fix 1 bug thật — nút mũi tên lên/xuống/xoá ở
    dòng chương thiếu `shrink-0` (dòng bài học đã có sẵn pattern
    này) → tên chương dài có thể ép các nút này hẹp lại; đã thêm
    `shrink-0` cho đồng bộ. Không đụng bug border "Thêm bài học"
    (giữ nguyên, đã ghi nhận ở mục khác). Input tiêu đề chương/bài
    dùng `<input>` nên tự xử lý overflow, không cần truncate.
  - Verify tổng: `tsc --noEmit` chỉ còn 2 lỗi pre-existing không
    liên quan (`globals.css`, `SalesAgentWidget.css`); cả 7 route
    `/vibe-demo/*` trả 200.

## 4. Trạng thái người dùng thật

- [x] **Auth** — thêm `src/components/vibe/StateScreens.tsx`: 1 component
      `StateScreen` dùng chung (icon + eyebrow + tiêu đề + message + list
      action, "tờ giấy" giữa trang trắng, full-viewport, KHÔNG có TopNav vì
      nav "Không gian của tôi" vô nghĩa khi chưa có quyền/chưa đăng nhập) +
      3 màn cụ thể dựng trên nó: `NotLoggedInScreen` (đăng nhập, giữ
      `continueUrl`), `SessionExpiredScreen` (đăng nhập lại, nhắc quiz vẫn
      còn lưu tại máy), `NoAccessScreen` (không thuộc quyền của mình, quay
      về `/vibe-demo/spaces`). Trang demo không có backend auth thật nên
      không tự nhiên rơi vào 2 trạng thái đầu — `spaces/page.tsx` có 1 dòng
      "Xem trước trạng thái" (rõ ràng chỉ để duyệt thiết kế, không phải UI
      thật) gọi trực tiếp 2 màn đó. `NoAccessScreen` demo bằng 1 space thật
      trong list (`s7`, đánh dấu `locked: 'no_access'`, badge "Chưa có
      quyền", bấm vào mở overlay có nút đóng).
- [x] **Quiz** — sửa trực tiếp trong `quiz/page.tsx`, không tạo trang riêng
      vì cả 4 case đều là biến thể của MỘT máy trạng thái (`SavedQuizState`
      lưu localStorage theo `lessonId`, `submitted: false/true` phân biệt
      "đang làm dở" vs "đã nộp"):
  - [x] **Thoát giữa chừng / mất mạng giữa lúc làm bài**: autosave
        `{picked, secondsLeft, qIdx}` vào localStorage mỗi lần đổi câu/đáp
        án trong lúc `phase === 'taking'` — không có khái niệm "mất dữ liệu"
        vì không phụ thuộc 1 lần submit cuối. Thêm banner offline (lắng
        nghe `online`/`offline` event) trong lúc thi: "Mất kết nối — câu
        trả lời vẫn được lưu tại máy".
  - [x] **Nộp bài trễ do đóng tab/đóng trình duyệt**: thêm `beforeunload`
        guard trong lúc `taking` (cảnh báo trước khi đóng/tải lại) + vì đã
        autosave, đóng tab giữa chừng không còn nghĩa là "trễ" — bài chờ
        đúng chỗ đã dừng ở lần quay lại sau (xem case resume dưới).
  - [x] **Đã làm quiz rồi — retake vs xem lại kết quả cũ**: màn intro đọc
        bản lưu khi vào lại (chỉ đọc lúc `phase === 'intro'`, không đè lên
        bài đang làm): còn dở → banner "Tiếp tục làm bài" (khôi phục đúng
        câu/đáp án/giờ còn lại) kèm nút phụ "Bắt đầu lại từ đầu"; đã nộp →
        banner điểm số cũ + 2 nút "Xem kết quả lần trước" / "Bắt đầu lại từ
        đầu". Nút "Làm lại" ở màn kết quả (retake trong cùng phiên) vẫn xoá
        bản lưu như trước — đây là ý định retake rõ ràng, không cần hỏi lại.
  - [x] Verify: `tsc --noEmit` sạch (còn đúng 2 lỗi `.css` side-effect
        import pre-existing, không liên quan), route `/vibe-demo/quiz` và
        `/vibe-demo/spaces` đều 200.
- [x] **Billing/paywall** — `PaywalledSpaceScreen` (trong `StateScreens.tsx`)
      dùng đúng ngôn ngữ "Mực xanh trên giấy trắng" (không mượn màu
      correct/wrong của quiz — theme.ts đã ghi rõ 2 màu đó CHỈ dùng cho
      chấm điểm), trỏ sang `/billing` (trang Stripe checkout đã có sẵn) để
      mua thêm credit. Demo bằng 1 space thật (`s8`, `locked: 'paywall'`,
      badge đỏ "Hết credit") trong `spaces/page.tsx`, bấm vào mở overlay
      full-screen giống `NoAccessScreen`, có nút đóng quay lại danh sách.

## 5. Accessibility — mới ở mức tối thiểu

Đã có: `.vd-focusable:focus-visible` outline, `prefers-reduced-motion`
guard cho animation `vd-ink-in`.

- [x] Kiểm tra contrast ratio thật của các màu nhạt (`wrongA`,
      `correctA` — nền xanh/đỏ rất nhạt trên nền trắng). Tính theo công
      thức WCAG (relative luminance): chữ `correct` (#217A4A) trên nền
      trắng đạt **5.3:1**, chữ `wrong` (#A8362E) đạt **6.5:1** — cả hai
      vượt AA cho chữ thường (4.5:1). Riêng `correctA`/`wrongA` (nền
      wash 7-8% alpha) tự thân chỉ ~1.02:1 so với trắng — KHÔNG đạt
      3:1 (non-text contrast) nếu dùng làm ranh giới UI độc lập, nhưng
      không phải lỗi: rà lại mọi nơi dùng 2 màu này (badge chấm điểm,
      background câu trả lời, thẻ "Chưa có quyền"/"Hết credit") thì
      luôn đi kèm icon (CheckCircle2/XCircle/ShieldOff/Lock) + label
      chữ + border đậm màu — nền nhạt chỉ là "wash" trang trí, không
      phải kênh truyền đạt ý nghĩa duy nhất. Không cần đổi màu.
- [x] `aria-live` cho timer/countdown trong quiz — thêm vùng
      `role="status" aria-live="polite" className="sr-only"` cạnh đồng
      hồ hiển thị (`quiz/page.tsx`), cập nhật theo mốc chứ không phải
      mỗi giây (30s/lần khi còn nhiều giờ, 10s/lần trong phút cuối,
      từng giây trong 5s cuối) — đọc to mỗi giây sẽ spam và không kịp
      nghe.
- [x] Test keyboard-only toàn bộ luồng quiz (chọn đáp án, next/prev,
      nộp bài) — rà lại từng phần tử tương tác: 4 lựa chọn câu hỏi đổi
      từ `role="button"` rời rạc sang `role="radiogroup"`/`role="radio"
      aria-checked` (đúng ngữ nghĩa "chọn 1-trong-N", không phải 4 nút
      độc lập) và vẫn giữ `tabIndex`/`onKeyDown` (Enter/Space) đã có từ
      mục 4; nút next/prev/nộp bài/xem đáp án/làm lại đều là `<button>`
      thật (focusable, Enter/Space hoạt động mặc định); ô lưới câu hỏi
      (`renderQuestionMap`) thêm `aria-label` báo cả trạng thái (đã
      chọn/chưa chọn, hoặc đúng/sai khi đã chấm) — trước đó chỉ đọc số
      thứ tự câu, người dùng screen reader không biết câu nào đã làm.

## 6. Vận hành / kỹ thuật khác

- [x] SEO/meta cho các trang public (home, about) — `home/page.tsx` và
      `about/page.tsx` đều là `'use client'`, mà Next.js không cho export
      `metadata` từ file có `'use client'` — nên thêm
      `home/layout.tsx`/`about/layout.tsx` (server component riêng,
      đứng ngoài client boundary của page) để đặt `export const
      metadata: Metadata` (title + description tiếng Việt cho từng
      trang), theo đúng field `Metadata` type có sẵn ở
      `src/app/layout.tsx` (root). Verify: `tsc --noEmit` sạch, curl cả
      hai route thấy `<title>`/`<meta name="description">` đúng nội
      dung đã đặt.
- [x] Quyết định dark mode: KHÔNG theo dark mode hệ điều hành ở mức
      toàn app. Giữ nguyên ý niệm gốc trong `theme.ts` — "phòng tắt đèn"
      (`T.room`, focus mode video/quiz) là một TRẠNG THÁI CỤC BỘ của
      từng bài học/quiz (người học tự bật khi muốn tập trung), không
      phải theme toàn cục do OS quyết định. Lý do: cả hệ thống chỉ có 1
      accent (mực xanh) + 1 nền giấy trắng làm nền tảng nhận diện
      ("không gian học tập sạch, ngăn nắp"); một dark theme toàn app
      theo `prefers-color-scheme` sẽ cần thiết kế lại toàn bộ bảng màu
      ink.\* (không chỉ invert) để giữ được cùng cảm giác "mực trên
      giấy", việc đó nằm ngoài phạm vi vibe-demo hiện tại. Không cần
      code thêm cho mục này — quyết định được ghi lại để không còn là
      câu hỏi mở khi tích hợp app thật.

---

## 7. `vibe-demo/home` vs `/` thật — lệch cấu trúc thông tin, chưa quyết định hướng

So trực tiếp `src/app/vibe-demo/home/page.tsx` (245 dòng) với
`src/app/page.tsx` (394 dòng, trang "/" thật đang chạy) phát hiện: đây
**không phải 1 trang được style lại**, mà là 2 khái niệm "home" khác
nhau —

- **`/` thật** = trang **khám phá/marketplace**, phục vụ cả khách chưa
  đăng nhập: tìm kiếm Space, dán link YouTube tạo Space mới, lướt
  Space nổi bật/phổ biến.
- **`vibe-demo/home`** = **dashboard cá nhân của người đã có dữ liệu**
  — giả định luôn đăng nhập, luôn có ít nhất 1 Space đang học, không
  có khái niệm "khách" hay "tạo Space mới" nào cả.

### Có ở `/` nhưng THIẾU hoàn toàn ở demo

- `SearchBar` — tìm Space theo tên (`page.tsx:166-176`).
- **Paste-link box** — dán link YouTube → tự tạo Space
  (`page.tsx:179-210`) — đây là luồng **tạo Space cốt lõi** của sản
  phẩm, không tồn tại ở bất kỳ trang nào trong 7 trang vibe-demo.
- Card lựa chọn sau khi tạo: "Học ngay / Thêm quiz / Dán link khác"
  (`page.tsx:213-234`).
- Khám phá công khai 2 tầng: "Space Tuyển Chọn" + "Space Phổ biến
  nhất" (`page.tsx:301-358`) — chưa có trang vibe-demo nào đóng vai
  trò này.
- Nhánh khách chưa đăng nhập (`!user`) — demo hardcode
  "Chào buổi tối, Thái" + 1 Space 38%, không có nhánh rỗng/khách nào.
- Loading skeleton, error + nút "Thử lại" khi gọi API thật thất bại
  (`page.tsx:243-248, 361-376`).
- `SalesAgentWidget` theo context (khách mới / user chưa có course,
  `page.tsx:385-391`).

### Có ở demo nhưng `/` CHƯA có (ý tưởng mới, chưa lên production)

- Lời chào theo giờ trong ngày + ngày tháng (`home/page.tsx:48-55`).
- Lịch mực 7 ngày "Tuần này" — thay cho biểu tượng streak-lửa thường
  gặp (`home/page.tsx:189-211`).
- "Mục tiêu tuần" (VD: 3/5 bài + progress, `home/page.tsx:213-236`).
- Thẻ "Đang học" dạng bookmark-ribbon nổi bật, thay cho lưới card đơn
  giản hiện tại (`home/page.tsx:67-134` vs `page.tsx:250-272`) — nhưng
  chỉ hiển thị **1 Space** đang học, mất khả năng hiển thị khi user
  học song song nhiều Space (bản `/` thật hiển thị dạng lưới nhiều
  card).

### Rủi ro nếu tích hợp thật theo đúng demo hiện tại

Nếu thay `/` bằng đúng thiết kế `home/page.tsx`, sản phẩm sẽ **mất
luồng tạo Space** (paste-link — có thể là growth loop quan trọng
nhất) và **mất toàn bộ trải nghiệm khách chưa đăng nhập**. Đây là lỗ
hổng nghiêm trọng hơn các bug hiển thị đã sửa ở Mục 2 — không phải bug
render, mà là **thiếu tính năng** khi chuyển đổi thật.

- [x] **Đã chốt hướng (c)**: `vibe-demo/home` chỉ là bản phác cho
      **1 phần** của "/" — khối "Tiếp tục học" cá nhân hoá (bookmark-
      ribbon + lời chào). Phần khám phá công khai (search, paste-link
      tạo Space, showcase/phổ biến, trạng thái khách/loading/error,
      SalesAgentWidget) **giữ nguyên thiết kế cũ**, không đụng vào —
      lý do: những khối đó đã hoạt động tốt ở "/" thật, và gộp cả 2
      việc (marketplace + dashboard cá nhân) vào 1 lần redesign là quá
      nhiều rủi ro so với lợi ích. Không chọn (a) vì sẽ phải thiết kế
      lại paste-link + khám phá công khai (tốn công, rủi ro mất tính
      năng) chỉ để đổi giao diện 1 khối; không chọn (b) mở "/dashboard"
      riêng vì tạo thêm 1 "nhà" gây nhầm điều hướng và trùng dữ liệu.
- [x] **Đã code mẫu trong `vibe-demo/home/page.tsx`** để sau này áp
      lại đúng logic khi ghép vào "/": đổi thẻ "Đang học" từ 1 object
      cố định (giả định chỉ 1 Space đang học — đúng lỗ hổng đã ghi ở
      trên) sang mảng `CONTINUE_LEARNING`, `.map()` xếp DỌC nhiều thẻ
      bookmark-ribbon (không xếp lưới ngang — mỗi thẻ đã đủ rộng cho
      layout ảnh+chữ ngang, 2 thẻ cạnh nhau sẽ bóp ảnh quá hẹp). Khi
      áp vào "/" thật: thay khối "Tiếp tục học" hiện tại
      (`page.tsx:236-279`, dạng lưới card đơn giản) bằng
      `.map(continueCourses)` theo đúng mẫu này; nhánh rỗng/khách vẫn
      giữ logic `user`/`continueState` hiện có ở "/" (không cần vẽ lại
      — `StateScreens.tsx` ở Mục 4 chỉ dự phòng cho auth/paywall, "/"
      tự xử lý nhánh khách tốt rồi). "Lịch mực tuần"/"Mục tiêu tuần" để
      SAU — cần dữ liệu backend (streak, weekly goal) chưa chắc đã có,
      ngoài phạm vi "chỉ đổi giao diện". Verify: `tsc --noEmit` sạch (2
      lỗi tiền tồn tại), curl `/vibe-demo/home` xác nhận cả 2 thẻ mẫu
      (Nền tảng React 18 — 38%, Tư duy hệ thống & Kiến trúc — 71%) đều
      render đúng, xếp dọc.
- [x] **Đã áp vào trang "/" thật — phạm vi TOÀN TRANG** (người dùng
      chọn mở rộng phạm vi hơn hướng (c) ban đầu, không chỉ khối "Tiếp
      tục học"): đổi toàn bộ class Tailwind slate-*/blue-*/emerald-*
      sang namespace `ink.*` (đã có sẵn, đồng bộ 1-1 với `T` trong
      `src/lib/vibe/theme.ts`) ở `Header.tsx`, `SearchBar.tsx`,
      `CourseCard.tsx`, `CourseList.tsx`, và `page.tsx` (hero/search,
      paste-link box, card sau khi tạo, khám phá 2 tầng, error state).
      Khối "Tiếp tục học" (`page.tsx:236-...`) được vẽ lại theo đúng
      thẻ bookmark-ribbon của mẫu — vì `MyLearningCourse` (dữ liệu
      thật) không có `lessonTitle`/chapter meta như mock, phần đó được
      thay bằng field thật sẵn có (`title`, `lessonCount`); logic 3
      trạng thái loading/loaded/rỗng và điều hướng `router.push` giữ
      nguyên 100%, không đổi. Cố ý **không đổi**:
      - `logout` (đỏ) và error state (đỏ) — ink system không định nghĩa
        token "destructive"/"error" chung, và comment trong
        `theme.ts` nói rõ `correct`/`wrong` CHỈ dùng trong quiz sau khi
        chấm điểm, không tái dùng cho ngữ nghĩa khác.
      - Font chữ (Inter, khai báo ở `layout.tsx`) — vibe-demo dùng
        riêng Be Vietnam Pro qua `next/font`; đổi font toàn app là thay
        đổi tách biệt, rủi ro cao hơn (ảnh hưởng mọi trang, không chỉ
        "/"), không nằm trong yêu cầu "áp style".
      - Nhãn 2 badge tầng khám phá đổi sang chip trung tính (ink-border/
        ink-textMid) thay vì giữ 2 màu blue/emerald khác nhau — đúng
        nguyên tắc "MỘT accent duy nhất" của hệ thống này.
      Verify: `tsc --noEmit` sạch (2 lỗi tiền tồn tại, không liên
      quan); dev server + `curl /` trả 200, HTML chứa class `ink-*` mới
      (xác nhận build/SSR không lỗi). Branch riêng
      `feature/homepage-ink-theme`, chưa commit/merge.

---

## Đề xuất thứ tự xử lý (khi bắt đầu tích hợp thật)

1. Tách 1 nguồn token duy nhất (mở rộng `tailwind.config.js` hoặc
   `src/styles/inkTheme.ts`) thay cho token lặp lại ở 7 file.
2. Rút các sub-component lặp lại thành `src/components/vibe/`
   (`TopNav`, `Section`, câu hỏi quiz, thẻ space...).
3. Thay từng route thật một (bắt đầu từ route đơn giản nhất), mỗi
   route đều test: mobile/responsive, trạng thái rỗng/lỗi/loading,
   a11y keyboard, dữ liệu thật (không hardcode).
4. Xử lý case biên: auth, billing/paywall, số lượng dữ liệu lớn.

## Nhật ký cập nhật

- **2026-08-20**: Tạo file, ghi lại toàn bộ vấn đề phát hiện sau khi
  review tổng thể 7 trang `/vibe-demo/*` đã hoàn thành.
- **2026-08-20**: Xử lý nhóm "Kỹ thuật" (mục 1) — phần rút token/font/
  hook/TopNav dùng chung. Tạo `src/lib/vibe/theme.ts` (nguồn token
  duy nhất) và `src/components/vibe/TopNav.tsx`; refactor cả 7 trang
  `/vibe-demo/*` để import thay vì tự khai báo lại. Không đổi UI/hành
  vi — chỉ dọn trùng lặp. Verify: `tsc --noEmit` sạch (2 lỗi còn lại
  là CSS side-effect import có sẵn từ trước, không liên quan), cả 7
  route + `/vibe-demo` vẫn 200. Còn treo trong mục 1: viết lại bằng
  Tailwind/Radix (cần quyết định đặt tên do đụng `colors.accent` của
  theme shadcn có sẵn) và các trạng thái loading/empty/error cho dữ
  liệu hardcode — xem chi tiết trong mục 1 ở trên.
- **2026-08-20**: Chốt quyết định đặt tên cho việc đụng `colors.accent`
  — chọn namespace riêng `ink.*` trong `tailwind.config.js` thay vì
  đổi/xoá theme shadcn hiện có. Đã thêm token `colors.ink` đồng bộ với
  `T` trong `src/lib/vibe/theme.ts`. `tsc --noEmit` vẫn sạch (trừ 2 lỗi
  tiền tồn tại). Việc viết lại UI bằng Tailwind/Radix (thay `style={{}}`)
  vẫn CHƯA làm — đây là bước kế tiếp, đề xuất pilot ở trang `about`.
- **2026-08-20**: Pilot `about/page.tsx` sang Tailwind `ink.*`, verify
  `tsc --noEmit` sạch + route 200. Sau đó lan pattern ra 6 trang còn
  lại (`home`, `spaces`, `article`, `edit-space`, `quiz`, `page.tsx`
  gốc) — chạy 6 agent song song, mỗi agent 1 trang. Kết quả: `tsc
  --noEmit` sạch (2 lỗi tiền tồn tại), cả 7 route đều 200, không đổi
  UI/hành vi. Rà soát Radix hoá: không có UI modal/tab thật nào đủ rõ
  trong 7 trang hiện tại để đổi sang Radix an toàn — mục này để mở cho
  tương lai khi có UI dạng đó (hộp thoại xác nhận, tab chuyển view...).
  Phát hiện 1 bug nhỏ có sẵn từ trước ở `edit-space` (border nút "Thêm
  bài học" render sai ý định do thứ tự set style) — CỐ Ý giữ nguyên,
  chưa sửa, cần quyết định/PR riêng. Mục "Inline style vs Tailwind/
  Radix" trong Mục 1 Kỹ thuật coi như xong phần style→class; phần
  Radix hoá vẫn còn treo, chờ có UI phù hợp.
- **2026-08-20**: Xử lý Mục 3 (nội dung thật — overflow/truncate,
  scale số lượng lớn) trên cả 5 trang có list/text từ data, chạy 5
  agent song song (1 agent/trang, không đổi dữ liệu demo). Kết quả:
  `spaces` sửa badge `%` cho co dãn được; `home` xác nhận truncate/
  line-clamp có sẵn, thêm xử lý tên người dùng dài ở dòng chào; `quiz`
  không cần sửa (đã robust từ trước, không truncate nội dung câu hỏi/
  đáp án); `page.tsx` video chính thêm truncate cho tiêu đề bài học/
  tên chương ở top bar, xác nhận rail playlist + notes đã scroll đúng
  ở mọi mode; `edit-space` sửa 1 bug thật (nút mũi tên lên/xuống/xoá ở
  dòng chương thiếu `shrink-0`, không đồng bộ với dòng bài học) —
  không đụng bug border "Thêm bài học" đã ghi nhận trước. Verify tổng:
  `tsc --noEmit` chỉ còn 2 lỗi tiền tồn tại không liên quan, cả 7
  route `/vibe-demo/*` trả 200. Mục 3 coi như xong.
- **2026-08-21**: Xử lý Mục 4 (trạng thái người dùng thật) — auth +
  quiz edge case + billing/paywall, theo yêu cầu ưu tiên mục này trước
  mục 2 (responsive, người dùng tự test song song). Auth/billing:
  thêm `src/components/vibe/StateScreens.tsx` (1 component nền
  `StateScreen` + 4 màn cụ thể: `NotLoggedInScreen`, `SessionExpiredScreen`,
  `NoAccessScreen`, `PaywalledSpaceScreen`), demo qua `spaces/page.tsx`
  (dòng "Xem trước trạng thái" cho 2 màn auth không gắn 1 space cụ thể,
  2 space demo `s7`/`s8` cho no_access/paywall). Quiz: nâng
  `quiz/page.tsx` từ state hoàn toàn ephemeral sang có autosave
  localStorage theo lesson (`SavedQuizState`), giải quyết đồng thời cả
  4 case con (thoát giữa chừng, mất mạng, đóng tab, retake-vs-xem-lại)
  bằng cùng 1 cơ chế lưu/đọc — không cần 4 giải pháp rời. Verify:
  `tsc --noEmit` sạch (2 lỗi tiền tồn tại), route `/vibe-demo/quiz` và
  `/vibe-demo/spaces` đều 200. Mục 4 coi như xong.
- **2026-08-21**: Xử lý Mục 5 (accessibility). Contrast ratio: tính tay
  theo WCAG cho `correct`/`wrong` (chữ trên nền trắng, đạt AA) và
  `correctA`/`wrongA` (nền wash — thấp nếu đứng độc lập, nhưng luôn đi
  kèm icon + label + border nên không phải kênh truyền đạt ý nghĩa duy
  nhất, không cần đổi màu). Timer quiz: thêm vùng
  `role="status" aria-live="polite"` ẩn hình (sr-only), cập nhật theo
  mốc 30s/10s/1s tuỳ thời gian còn lại, không đọc mỗi giây. Keyboard/
  screen reader cho luồng làm quiz: đổi 4 lựa chọn câu hỏi từ
  `role="button"` rời rạc sang `radiogroup`/`radio` + `aria-checked`
  đúng ngữ nghĩa; ô lưới câu hỏi thêm `aria-label` báo trạng thái đã
  chọn/đúng/sai thay vì chỉ số thứ tự. Verify: `tsc --noEmit` sạch (2
  lỗi tiền tồn tại), route `/vibe-demo/quiz` 200. Mục 5 coi như xong.
- **2026-08-21**: Xử lý Mục 6 (vận hành/kỹ thuật khác). SEO/meta: thêm
  `home/layout.tsx` và `about/layout.tsx` (server component đặt
  `export const metadata`, vì 2 page.tsx tương ứng là `'use client'`
  nên không tự export metadata được) — title + description tiếng Việt
  riêng cho mỗi trang. Dark mode: quyết định KHÔNG theo hệ điều hành ở
  mức toàn app — "phòng tắt đèn" giữ là trạng thái cục bộ của bài
  học/quiz (focus mode), không phải theme toàn cục, vì bảng màu ink.*
  hiện chỉ thiết kế cho 1 chế độ sáng và invert đơn giản sẽ phá vỡ cảm
  giác "mực trên giấy" — việc thiết kế lại bảng màu cho dark theme
  toàn app nằm ngoài phạm vi vibe-demo, không code thêm, chỉ ghi nhận
  quyết định. Verify: `tsc --noEmit` sạch (2 lỗi tiền tồn tại), curl
  `/vibe-demo/home` và `/vibe-demo/about` đều 200 và trả đúng
  `<title>`/`<meta name="description">` mới. Mục 6 coi như xong — cả 6
  mục của roadmap đã xử lý.
- **2026-08-21**: User tự test Mục 2 thật trên iPhone SE (375px), tìm
  ra 1 họ lỗi lặp lại (quá nhiều `shrink-0` nhồi 1 hàng ngang → phần
  cuối bị đẩy khỏi viewport, mất hẳn) qua 4 lượt báo lỗi liên tiếp:
  breadcrumb `article`/`quiz` wrap dọc phình top bar, `TopNav.tsx` wrap
  dọc (ảnh hưởng cả home/spaces/about — lỗi nặng nhất vì chưa từng có
  xử lý mobile), `edit-space` mất nút "Lưu bản thảo" + mất nút xuống/
  xóa ở header chương + mất nút xóa ở dòng bài học (tràn ngang vô
  hình, không wrap). Sửa từng chỗ theo 2 mẫu: `whiteSpace:nowrap` + ẩn
  crumb/nhãn phụ khi hẹp (breadcrumb, TopNav), hoặc gãy 1 hàng thành 2
  dòng khi các nút đều thiết yếu không thể ẩn (edit-space). Kiểm tra
  riêng panel "Thông tin không gian" và margin-lề article/about — an
  toàn, không cần sửa (đã dùng đúng `flex-1`/`w-full` từ đầu). Verify
  mỗi fix: `tsc --noEmit` sạch (2 lỗi tiền tồn tại), route liên quan
  200. Còn lại: grid quiz và cuộn dài edit-space chưa test tay.
- **2026-08-21**: So cấu trúc `vibe-demo/home` với trang "/" thật theo
  yêu cầu — phát hiện đây là 2 khái niệm "home" khác nhau (marketplace/
  khám phá có tìm kiếm + tạo Space từ link + duyệt công khai, so với
  dashboard cá nhân giả định luôn có Space đang học), không phải cùng
  1 trang style lại. Ghi chi tiết vào Mục 7 mới: danh sách khối thiếu
  ở demo so với `/` (search, paste-link tạo Space, khám phá 2 tầng,
  nhánh khách, loading/error, SalesAgentWidget) và khối demo có mà `/`
  chưa có (lời chào, lịch mực tuần, mục tiêu tuần). Chưa quyết định
  hướng tích hợp (thay thế "/" hoàn toàn / trang riêng "/dashboard" /
  chỉ 1 phần của "/") — theo đúng yêu cầu, chỉ ghi nhận, chờ chỉ đạo.
- **2026-08-21**: Chốt hướng cho Mục 7 — hướng (c): demo chỉ thay khối
  "Tiếp tục học" của "/", phần khám phá/tạo Space giữ nguyên. Code mẫu
  ngay trong `vibe-demo/home/page.tsx`: đổi thẻ "Đang học" từ 1 object
  cố định sang mảng `CONTINUE_LEARNING`, `.map()` xếp dọc nhiều thẻ
  bookmark-ribbon — sửa đúng lỗ hổng "chỉ hiển thị 1 Space đang học"
  đã ghi nhận, để sau này áp thẳng logic này vào "/" (thay
  `page.tsx:236-279`) khi tới lượt tích hợp thật. Lịch mực tuần/mục
  tiêu tuần để sau (cần dữ liệu backend chưa chắc có). Verify:
  `tsc --noEmit` sạch (2 lỗi tiền tồn tại), curl `/vibe-demo/home` xác
  nhận cả 2 thẻ mẫu render đúng, xếp dọc.
- **2026-08-21**: Áp style vào trang "/" thật — người dùng chọn mở
  rộng phạm vi ra TOÀN TRANG (không chỉ khối "Tiếp tục học" như hướng
  (c) ban đầu). Đổi `Header.tsx`, `SearchBar.tsx`, `CourseCard.tsx`,
  `CourseList.tsx`, `page.tsx` từ class Tailwind slate-*/blue-*/
  emerald-* sang namespace `ink.*`; vẽ lại khối "Tiếp tục học" theo
  đúng thẻ bookmark-ribbon của mẫu (dùng field thật `title`/
  `lessonCount` thay cho `lessonTitle`/chapter meta không tồn tại ở
  `MyLearningCourse`), giữ nguyên 100% logic/luồng dữ liệu. Cố ý không
  đổi: màu đỏ của logout/error state (ink system không có token
  destructive, và `correct`/`wrong` chỉ dành cho quiz theo comment gốc
  trong `theme.ts`), font chữ toàn app (đổi riêng, rủi ro cao hơn phạm
  vi yêu cầu). 2 badge tầng khám phá đổi sang chip trung tính theo
  nguyên tắc "một accent duy nhất". Verify: `tsc --noEmit` sạch (2 lỗi
  tiền tồn tại), dev server + curl `/` trả 200 với class `ink-*` trong
  HTML. Làm trên branch riêng `feature/homepage-ink-theme`, chưa
  commit.
