import { run as runShowcase } from './seed-showcase';
import { run as runPlaylists } from './seed-playlists';
import { run as runActiveUsers } from './seed-active-users';

/**
 * Seed CHUẨN — chạy 1 LẦN DUY NHẤT khi public app thật (production/staging
 * mới, TRƯỚC KHI có user thật đầu tiên), gom 3 bước additive/idempotent theo
 * đúng thứ tự phụ thuộc:
 *   1. seed-showcase.ts     — 5 Space demo 1-video (WP1.9)
 *   2. seed-playlists.ts    — Space nhiều-bài từ playlist YouTube thật
 *      (seed-active-users clone lại chính các Space này nên PHẢI chạy trước)
 *   3. seed-active-users.ts — user ảo + clone + tiến độ giả, tạo cảm giác
 *      "đang có người học" ngay từ ngày đầu (chống cold-start)
 *
 * KHÔNG liên quan tới prisma/seed.ts — 2 mục đích tách biệt, không được gộp:
 *   - seed.ts        → chạy khi PHÁT TRIỂN / TEST TÍNH NĂNG cục bộ. Kịch bản
 *     4 user test cố định (viet/nam/hoang/sa), TRUNCATE toàn bộ bảng mỗi lần
 *     chạy (huỷ hết dữ liệu hiện có), có guard chặn chạy nhầm vào DB production.
 *   - seed-launch.ts → chạy 1 lần khi PUBLIC APP thật. Additive, idempotent
 *     (chạy lại không lỗi, không tạo trùng — an toàn nếu lỡ chạy 2 lần), không
 *     bao giờ xoá dữ liệu.
 *
 * Mỗi bước con vẫn chạy độc lập được (npm run seed:showcase / seed:playlists /
 * seed:active-users) — hữu ích khi chỉ cần re-run 1 phần sau này (vd thêm
 * playlist mới thì chỉ cần seed:playlists rồi seed:active-users, không cần
 * chạy lại seed-launch từ đầu). File này chỉ là 1 wrapper gọi tuần tự cho
 * tiện dùng đúng 1 lần lúc public.
 */
async function main() {
    console.log('🚀 seed-launch — seed CHUẨN cho lần public app đầu tiên\n');

    console.log('━━━ [1/3] Showcase spaces ━━━');
    await runShowcase();

    console.log('\n━━━ [2/3] Playlist spaces (YouTube thật) ━━━');
    await runPlaylists();

    console.log('\n━━━ [3/3] Active users (bạn học ảo — social proof, chống cold-start) ━━━');
    await runActiveUsers();

    console.log('\n🎉 seed-launch hoàn tất — app đã sẵn sàng để public.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
