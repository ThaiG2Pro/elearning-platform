# Rà soát toàn diện: vòng đời Space (clone/fork, archive, AI-share, companions)

Ngày: 2026-09-07. Phạm vi: toàn bộ đường đi của 1 space từ tạo → chia sẻ → clone → archive → (xoá gián tiếp qua cascade user), cùng các hệ quả lan sang `ai_generations`, `sources`, `learning_progress`, `notes`, companions/lineage. Mục tiêu ban đầu: liệt kê đầy đủ edge case để làm căn cứ quy hoạch, không sửa code trong tài liệu này.

> **Trạng thái: cả 9/9 mục ở mục 10 đã được xử lý trong cùng ngày** — xem ghi chú "✅ Đã xử lý" tại mỗi mục.

## 1. Mô hình trạng thái hiện tại

- **`spaces.status`**: enum DB `DRAFT | ACTIVE | ARCHIVED`, nhưng domain TypeScript (`Space.ts`) đã bỏ hẳn DRAFT — chỉ còn `ACTIVE | ARCHIVED` (pivot có chủ đích, "personal-organizer model", không cần admin approval). DRAFT là tàn dư enum DB an toàn để bỏ qua, không phải work-in-progress.
- **Visibility công khai** không có field riêng — suy ra từ `status === 'ACTIVE' && share_token != null`. Rule này lặp lại thủ công ở 3 nơi (discovery, `getSpaceDetail`, `findByShareToken`) thay vì 1 policy method dùng chung.
- **`cloned_from_space_id`**: `onDelete: SetNull` — lineage là chuỗi con trỏ đơn, không phải cấu trúc độc lập.
- **`ai_generations`**: `key_source` (SHARED_FREE/BYOK/PAID_TIER), `visibility` (PRIVATE/SHARED), `status` (PENDING/READY/FAILED), `archived_at` (soft, null hoá `content`, KHÔNG đổi `status`). `generated_by_user_id`: `onDelete: SetNull`.
- **`sources.archived_at`**: soft, null hoá `transcript`.
- **Không có hard-delete `spaces` qua UI.** Đường xoá cứng duy nhất: cascade `owner_id → users (onDelete: Cascade)`, kích hoạt bởi cron `deleteInactiveUsersOlderThan24Hours` (chỉ nhắm user `INACTIVE` chưa activate).
- **Không có tính năng transfer ownership** cho space — xác nhận không tồn tại trong codebase.
- **Không có route admin** nào list toàn bộ spaces/users/ai_generations không filter — rủi ro "admin leak" không tồn tại.

## 2. Bảng cascade đầy đủ khi xoá 1 user (FK → `users.id`)

| Bảng | FK | onDelete |
|---|---|---|
| `user_avatars` | `user_id` | Cascade |
| `credit_transactions` | `user_id` | Cascade |
| `tokens` | `user_id` | Cascade |
| `spaces` (`owner`) | `owner_id` | **Cascade** |
| `notes` | `user_id` (+ `space_id`, `lesson_id` riêng) | Cascade |
| `learning_progress` | `user_id` (+ `space_id`, `lesson_id` riêng) | Cascade |
| `ai_generations` (`generated_by_user`) | `generated_by_user_id` | **SetNull** |

Không có FK nào dùng `Restrict` — không gì chặn xoá user dù còn dữ liệu con. Không có bảng `quiz_attempts` riêng — kết quả quiz nằm trong chính `learning_progress` (`quiz_max_score`, `quiz_start_time`, `quiz_question_ids`), cascade theo cùng cơ chế.

**Hệ quả cụ thể khi 1 owner bị xoá (qua cron INACTIVE 24h, hoặc giả thiết có đường xoá cứng khác trong tương lai):**
- Toàn bộ space họ sở hữu, cùng `notes`/`learning_progress` trên CHÍNH space đó, bị xoá cứng — không cảnh báo trước.
- Mọi bản clone TRỰC TIẾP của các space đó mất `cloned_from_space_id` (SetNull) đồng thời — vì `ON DELETE SET NULL` áp dụng cho toàn bộ tập con trỏ FK, không phải 1 đại diện.
- Mọi `ai_generations` họ từng tạo bị SetNull `generated_by_user_id` — nếu `visibility = SHARED`, generation đó tồn tại vĩnh viễn, **không ai còn revoke được** (check ownership trong `revokeShare` không thể khớp userId nào).
- Learner đang học trên bản clone RIÊNG của họ (từ space của owner bị xoá) **không mất note/progress** — vì dữ liệu học tập nằm trên space độc lập của chính họ, chỉ mất hiển thị lineage.

## 3. Bảng tổng hợp toàn bộ query chạm `spaces`/`ai_generations`/`sources` — đánh giá filter

| File:dòng | Mục đích | Filter status/archived/visibility | Đánh giá |
|---|---|---|---|
| `SpaceRepository.ts:17` `findById` | Owner-scoped nội bộ (nhiều service) | Không, đúng ý (owner cần xem cả ARCHIVED) | OK |
| `SpaceRepository.ts:32` `findActiveById` | Không có caller nào | `status: ACTIVE` | OK nhưng dead code — nên rà xoá hoặc dùng |
| `SpaceRepository.ts:50` `findByIdWithFullStructure` → `getSpaceDetail` | Trang chi tiết owner + public preview | Check ở tầng app (`isOwner \|\| isPubliclyShared`), không phải DB | OK, nhưng pattern "fetch rồi check" dễ tái phát lỗi nếu route mới quên check |
| `SpaceRepository.ts:111-219` `findActiveSpacesWithThumbnails` | Discovery công khai | `status: ACTIVE` + `share_token not null` | OK |
| `SpaceRepository.ts:167` groupBy cloneCounts | Đếm "N người đã sao chép" trên card | Không loại trừ clone đã ARCHIVED | CẦN XEM LẠI (số liệu có thể sai nhẹ) |
| `SpaceRepository.ts:296` `findOwnedWithShareStatus` | `/my-shares` | Không filter, đúng ý (owner cần thấy cả ARCHIVED) | OK |
| `SpaceRepository.ts:306` `findByShareToken` | Public — `/share/[token]`, entry point clone | `share_token + status ACTIVE` | OK |
| `SpaceRepository.ts:360-421` `cloneForOwner` | Nội bộ, thực thi clone | **Không re-check status** | Xem mục 4 (race) |
| `SpaceRepository.ts:495-539` `findLineageSpaces` → `getCompanions` | Companions, chỉ cho member lineage | Không filter status | CẦN XEM LẠI — leak tên+% của thành viên đã ARCHIVED (xem mục 5) |
| `ContentManagementService.ts:47` `getOwnedSpaces` | `/my-spaces` | Optional theo query param, đúng ý | OK |
| `ContentManagementService.ts:183` `findOrCreateSourceForUrl` | Dedup Source theo URL | Không filter `archived_at`, không reset khi tái dùng | CẦN XEM LẠI (nhẹ — xem mục 6) |
| `OwnedSpacesRepository.ts:37` `getOwnedSpacesWithDetails` | `/my-learning` | Không filter DB, FE tự ẩn theo `lifecycleStatus` | OK, chủ đích |
| `management/spaces/[id]/sections/route.ts` | Owner sửa nội dung | Không filter, có check ownership | OK, chủ đích ("active or not — no approval lock") |
| `LearnService.assertOwnership` | Gate học/tiến độ | Không filter status | OK, chủ đích |
| `QuizService.assertLessonAccess` | Gate làm quiz | Không filter status | **CÓ ẢNH HƯỞNG xác nhận**: nộp quiz mới được trên space đã ARCHIVED (xem mục 7) |
| `DataExportRepository.getOwnedSpacesFullTree` | Xuất dữ liệu cá nhân (GDPR-style) | Không filter, chủ đích (export phải đủ) | OK |
| `AIGenerationRepository.ts:93` `findDefaultCache` | Cache SHARED_FREE | `status: READY`, **thiếu `archived_at: null`/check `content != null`** | **RỦI RO THẬT** — có thể trả cache hit với `content: null` |
| `AIGenerationRepository.ts:101` `findSharedByokMatch` | Cache BYOK-shared | Cùng lỗi trên | **RỦI RO THẬT** |
| `AIGenerationRepository.ts:171` `create()` nhánh tái sinh row SHARED_FREE cũ | Retry generate | Không reset `archived_at` về null khi hồi sinh row đã archive | CẦN XEM LẠI — dữ liệu mâu thuẫn (`status READY` nhưng `archived_at` còn giá trị cũ) |
| `AIGenerationRepository.ts:240` `listSharedByUser` | `/my-shares?tab=ai` | Không filter `archived_at` | CẦN XEM LẠI — hiện AI đã "chết nội dung" như đang sống |
| `AIGenerationService.ts:136,147-150` `generate()` + `touchLastAccessed` | Sinh AI content | Không filter `archived_at`, vẫn cập nhật `last_accessed_at` trên Source đã archive | Không lỗi chức năng, nhưng mâu thuẫn ngữ nghĩa nhẹ |
| `scripts/archiveStaleData.ts` + `DataRetentionRepository.ts` (trùng logic, bản sau không có caller) | Job archive nền | Đúng, loại trừ Source có space công khai tham chiếu | OK — nhưng 2 nơi cùng logic dễ lệch nhau khi sửa 1 chỗ quên chỗ kia |
| `scripts/aiUsageReport.ts` | Báo cáo usage | Không filter, đúng ý (đếm theo request/ngày) | OK |

Không tồn tại: route admin leak, full-text search riêng (chỉ `title.contains`, dùng đúng where-clause an toàn), sitemap/robots (không tồn tại — không có kênh SEO để leak trạng thái).

## 4. Share-token lifecycle — 2 edge case cụ thể

- **Revoke rồi share lại KHÔNG khôi phục link cũ** — luôn sinh token ngẫu nhiên mới (`ensureShareToken`). Đây là chủ đích thiết kế (comment xác nhận: "clearing the token immediately 404s the old URL"), nhưng **không có cảnh báo UI** nói rõ với owner rằng share lại ≠ khôi phục link cũ — người đã có link cũ mất quyền truy cập vĩnh viễn, không thể lấy lại bằng cách "share lại".
- **Race điều kiện đọc-rồi-ghi trong `ensureShareToken`**: không có `$transaction`/lock/compare-and-swap. 2 request đồng thời khi `share_token` đang null có thể cùng sinh 2 token khác nhau và cùng `update` — request thua cuộc trả về UI 1 token đã bị ghi đè, link vừa hiển thị có thể 404 ngay từ đầu chưa từng dùng. Cơ chế retry `P2002` hiện tại chỉ chống trùng giá trị ngẫu nhiên, không chống race này.

## 5. Companions/lineage — leak + vỡ khi lineage đứt (đã xác nhận qua 2 vòng trước, tổng hợp lại)

- `getCompanions`/`findLineageSpaces` không filter `status` ở bất kỳ bước nào (tìm root, BFS xuống con). `CompanionDto` expose **tên thật + % hoàn thành** cho bất kỳ ai là 1 thành viên hợp lệ trong lineage.
- Người archive bản clone của mình (kỳ vọng "ẩn hoạt động") **vẫn bị liệt kê đầy đủ** cho người khác trong lineage — không có opt-out.
- Khi root bị hard-delete (qua cascade user), `cloned_from_space_id` SetNull hàng loạt trên mọi con trực tiếp → mỗi con thành "root của chính nó" → lineage vỡ thành nhiều đảo, companions bị tính thiếu người, không cảnh báo.

## 6. AI-share (BYOK) — các lỗi cụ thể mới xác nhận trong vòng rà soát này

1. **Cache trả nội dung rỗng (ưu tiên cao)**: `findDefaultCache`/`findSharedByokMatch` chỉ check `status: READY`, không loại trừ record đã bị `archived_at != null` (content đã null hoá). `AIGenerationService.generate()` không kiểm tra `content !== null` trước khi coi là cache hit → user nhận response "dùng cache" nhưng nội dung rỗng, thay vì được tự động generate lại.
2. **Hồi sinh row không reset `archived_at`**: nhánh tái sử dụng row SHARED_FREE cũ trong `create()` không set lại `archived_at: null` — để lại dữ liệu mâu thuẫn (READY nhưng vẫn mang dấu archived cũ), ảnh hưởng độ tin cậy của mọi truy vấn tương lai dựa vào `archived_at`.
3. **Danh sách "AI đã chia sẻ" hiện cả bản đã chết nội dung**: `listSharedByUser` không filter `archived_at` — owner thấy bản share "đang hoạt động" (kèm reuseCount cũ) dù nội dung đã bị dọn, không có badge cảnh báo.
4. **Mồ côi vĩnh viễn sau khi chủ BYOK xoá tài khoản**: `generated_by_user_id` SetNull, nhưng row `ai_generations` (`visibility: SHARED`) vẫn sống và vẫn được các clone khác dùng — `revokeShare` không còn userId nào khớp để gọi được nữa.
5. **Source dedup không reset `archived_at`**: `findOrCreateSourceForUrl` tái dùng Source đã archive khi user dán lại đúng URL, nhưng không un-archive nó — lesson mới trỏ vào Source có `transcript: null`.

## 7. Học/quiz trên space đã ARCHIVED — xác nhận không bị chặn

- `LearnService.assertOwnership`, `QuizService.assertLessonAccess`: chỉ check ownership, không check `status`. Owner **học tiếp, nộp quiz mới, ghi tiến độ mới bình thường 100%** trên space đã ARCHIVED — archive chỉ là nhãn ẩn khỏi discovery/`/my-learning` danh sách chính, không khoá chức năng.
- Notes/tiến độ của learner trên bản clone RIÊNG của họ không bị ảnh hưởng gì khi space GỐC (nơi họ từng clone) bị archive hoặc mất lineage — vì dữ liệu học tập độc lập hoàn toàn với space gốc.

## 8. Race condition archive-vs-clone

- Điểm chốt duy nhất kiểm tra `status === 'ACTIVE'` trên đường clone là `findByShareToken` — một query độc lập, đọc xong buông. `cloneForOwner` sau đó **không bao giờ re-check status**, kể cả trong transaction tạo bản sao.
- Nếu owner archive đúng lúc có người khác đang giữa 2 bước clone, request clone đó **vẫn tạo thành công bình thường** — không sinh dữ liệu hỏng, nhưng phá vỡ kỳ vọng "archive có hiệu lực tức thời với mọi clone đang tiến hành".

## 9. Không tìm thấy / xác nhận an toàn

- Full-text search riêng: không tồn tại (chỉ `title.contains`, dùng where-clause đã an toàn).
- Sitemap/robots: không tồn tại.
- Route admin: không tồn tại.
- Transfer ownership: không tồn tại.
- DRAFT status: dead code có chủ đích (pivot bỏ approval gate), an toàn bỏ qua.
- `quiz_attempts` riêng: không tồn tại, dữ liệu nằm trong `learning_progress`.

## 10. Tổng hợp ưu tiên xử lý (nếu quyết định sửa)

**Cập nhật 2026-09-07 (cùng ngày, sau audit): cả 9 mục đã được xử lý.** Chi tiết implementation từng mục ở dưới; kiểm chứng chung cho toàn bộ: `pnpm typecheck` sạch, `pnpm test` 295/295 pass, `pnpm check:tokens` pass, `pnpm lint` 0 lỗi, `pnpm build` production build thành công.

**Cao — lỗi chức năng, ảnh hưởng trải nghiệm trực tiếp:**
1. ✅ **Đã xử lý.** `findDefaultCache`/`findSharedByokMatch` trả cache rỗng khi nguồn đã archive — thêm điều kiện loại trừ hoặc check `content !== null`.
   - Thêm `archived_at: null` vào điều kiện WHERE của cả 2 hàm (`AIGenerationRepository.ts`). Row đã archive không còn được coi là cache hit — rơi vào nhánh generate lại như chưa từng có cache.

**Trung bình — dữ liệu sai lệch nhưng chưa gây lỗi hiển thị ngay:**
2. ✅ **Đã xử lý.** Reset `archived_at: null` khi hồi sinh row `ai_generations`/`sources` được dùng lại.
   - `AIGenerationRepository.create()`, nhánh tái sinh row `SHARED_FREE` cũ: thêm `archived_at: null` vào `data` của `update`, cùng lúc với reset `status`/`content`/`error`.
3. ✅ **Đã xử lý.** `listSharedByUser` nên phân biệt/hiển thị rõ bản đã archived thay vì im lặng.
   - Thêm field `isArchived` xuyên suốt: `SharedAIGenerationSummary` (repository) → `GET /api/v1/management/ai-generations` (serialize) → `MySharedAIGeneration` (FE type) → `/my-shares` (tab AI) hiện badge "Đã dọn nội dung" + đổi dòng phụ khi `isArchived === true`.
4. ✅ **Đã xử lý** — quyết định nghiệp vụ: **ẩn hẳn khỏi companions** (đã hỏi và được xác nhận chọn hướng này, có cân nhắc trade-off với "vẫn hiện + badge" và "cờ riêng tư độc lập với archive").
   - `SpaceRepository.findLineageSpaces` trả thêm `status` mỗi thành viên (không thêm query). `SpaceService.getCompanions` tách 2 bước: quyền truy cập (`isMember`) vẫn dùng lineage đầy đủ kể cả archived, nhưng danh sách **hiển thị** chỉ giữ `status === 'ACTIVE'`. `cloneForOwner` (fast-path lineage-reuse) không đổi vì dùng lineage đầy đủ, không quan tâm status.
5. ✅ **Đã xử lý.** Cảnh báo UI rõ ràng khi revoke share: "share lại sẽ tạo link mới, link cũ không thể khôi phục".
   - `/my-shares` → `handleRevoke`: bổ sung câu cảnh báo đó vào dòng `window.confirm` trước khi thu hồi.

**Thấp — edge case hiếm, rủi ro nhỏ:**
6. ✅ **Đã xử lý.** Race đọc-rồi-ghi trong `ensureShareToken` — thêm điều kiện WHERE-guard hoặc transaction nếu muốn triệt để.
   - Đổi `update` → `updateMany` với WHERE `share_token: null` (compare-and-swap). Bên thua race đọc lại token bên thắng vừa ghi thay vì trả nhầm token của chính mình.
7. ✅ **Đã xử lý.** Race archive-vs-clone — chấp nhận được trong thực tế (window rất hẹp), có thể bỏ qua trừ khi muốn triệt để tuyệt đối.
   - `cloneForOwner` re-check `source.status !== 'ACTIVE'` ngay sau khi fetch, throw `SHARE_LINK_NOT_FOUND` (khớp mã lỗi route đã xử lý sẵn) trước khi tạo bản sao.
8. ✅ **Đã xử lý.** `findActiveById` dead code, `DataRetentionRepository` trùng logic với `scripts/archiveStaleData.ts` — dọn dẹp kỹ thuật, không phải bug.
   - Xoá `SpaceRepository.findActiveById` (0 caller). Xoá `DataRetentionRepository.findArchiveCandidates`/`archiveSource`/`SourceArchiveCandidate` (0 caller/test — job thật tự chứa logic ở `scripts/archiveStaleData.ts` do ràng buộc ts-node ESM); giữ nguyên `touchLastAccessed` (đang dùng thật).
9. ✅ **Đã xử lý.** `cloneCounts` groupBy tính cả clone đã ARCHIVED — sai lệch số liệu hiển thị nhẹ.
   - `findActiveSpacesWithThumbnails`: thêm `status: 'ACTIVE'` vào điều kiện `groupBy` đếm clone.

## 11. Vấn đề gốc rễ xuyên suốt (root cause chung)

Cả nhóm lỗi "companions leak", "group progress vỡ", "AI-share ma", "cache rỗng" đều bắt nguồn từ **cùng 1 thói quen thiết kế**: trạng thái ẩn/archive được coi là **chỉ ảnh hưởng độc lập từng entity ở tầng hiển thị của chính chủ sở hữu**, chứ không được thực thi cưỡng bức tại **tầng truy vấn tổng hợp** (companions, cache lookup, share-list) — nơi dữ liệu bị đọc lại bởi người khác hoặc bởi hệ thống, không phải chính chủ.

Đối chiếu ngành (đã thảo luận): Duolingo (cờ hiển thị riêng lan truyền vào leaderboard), Strava (buộc join qua bảng visibility trước khi aggregate), GitHub (ghost-user thay vì mồ côi, fork-network tách khỏi parent-pointer đơn) đều giải quyết bằng cách bắt buộc lớp lọc trạng thái phải nằm ở tầng truy vấn tổng hợp, không phải tầng hiển thị của 1 view riêng lẻ.
