import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * "Có người đang học" seed — chống cold-start: user thật đầu tiên vào 1
 * Space (đặc biệt các Space từ prisma/seed-playlists.ts) không thấy 1 nơi
 * trống trơn 0 người, mà thấy vài "bạn học" (CompanionDto) với % tiến độ
 * khác nhau, và Space có clone-count > 0 ở trang chủ.
 *
 * ĐÂY LÀ SOCIAL PROOF GIẢ — ghi rõ ở đây để không ai nhầm là dữ liệu thật
 * khi đọc lại DB sau này:
 *   - Mỗi "user ảo" dưới đây là 1 row `users` thật (bắt buộc, vì
 *     CompanionDto/SpaceService.getCompanions chỉ đọc từ owner thật của
 *     spaces trong cùng lineage — không có cách nào giả companion mà không
 *     tạo user thật), nhưng password_hash là hash của 1 chuỗi random 32
 *     byte KHÔNG lưu ở đâu cả — không ai (kể cả người chạy script) đăng
 *     nhập được vào các tài khoản này. Email dùng domain nội bộ
 *     `@elearning-platform.local` để không đụng inbox thật nào.
 *   - Mỗi user ảo "clone" 1 Space seed (prisma/seed-playlists.ts) y hệt
 *     luồng SpaceRepository.cloneForOwner thật (spaces.cloned_from_space_id
 *     trỏ về Space gốc, copy nguyên chapters/lessons) — về mặt dữ liệu
 *     không khác gì 1 user thật bấm "Sao chép về học", CHỈ có "ai đứng sau
 *     tài khoản" là giả.
 *   - learning_progress được set is_finished=true cho 1 phần lesson để
 *     completionRate (tính runtime ở LearnService.getSpaceProgress) ra số %
 *     hợp lý, KHÔNG đều nhau giữa các user (tránh trông máy móc).
 *
 * Additive/idempotent: mỗi cặp (user ảo, Space gốc) chỉ tạo 1 lần — nếu
 * user đã có bản clone của đúng Space đó (unique owner_id+cloned_from_space_id,
 * spaces.ts:281) thì bỏ qua, an toàn để chạy lại.
 *
 * Yêu cầu: chạy SAU `npm run seed:playlists` (cần các Space gốc `is_showcase`
 * đã tồn tại để clone).
 */

const SEED_MARK = '@elearning-platform.local'; // mọi user ảo seed ở đây dùng chung domain này để dễ nhận diện/xoá hàng loạt sau này

interface VirtualUser {
    emailLocal: string;
    fullName: string;
    joinedDaysAgo: number; // spread ngày tạo tài khoản ra để không trông như 1 đợt bulk-insert
}

const VIRTUAL_USERS: VirtualUser[] = [
    { emailLocal: 'active-hoa.nguyen', fullName: 'Hoà Nguyễn', joinedDaysAgo: 42 },
    { emailLocal: 'active-minh.tran', fullName: 'Minh Trần', joinedDaysAgo: 35 },
    { emailLocal: 'active-thu.le', fullName: 'Thu Lê', joinedDaysAgo: 29 },
    { emailLocal: 'active-duc.pham', fullName: 'Đức Phạm', joinedDaysAgo: 24 },
    { emailLocal: 'active-lan.vo', fullName: 'Lan Võ', joinedDaysAgo: 18 },
    { emailLocal: 'active-quan.hoang', fullName: 'Quân Hoàng', joinedDaysAgo: 13 },
    { emailLocal: 'active-linh.dang', fullName: 'Linh Đặng', joinedDaysAgo: 9 },
    { emailLocal: 'active-nam.bui', fullName: 'Nam Bùi', joinedDaysAgo: 5 },
    // 2026-09-14 (v2) — mở rộng để phủ hết 23 Space playlist thật (trước chỉ
    // 6/13), thêm 6 user để mỗi Space có người học mà không lặp lại đúng 1 bộ
    // 8 tên ở khắp nơi (trông giả nếu cùng vài cái tên xuất hiện ở mọi Space).
    { emailLocal: 'active-tuan.le', fullName: 'Tuấn Lê', joinedDaysAgo: 55 },
    { emailLocal: 'active-mai.pham', fullName: 'Mai Phạm', joinedDaysAgo: 47 },
    { emailLocal: 'active-khanh.vu', fullName: 'Khánh Vũ', joinedDaysAgo: 38 },
    { emailLocal: 'active-huy.nguyen', fullName: 'Huy Nguyễn', joinedDaysAgo: 22 },
    { emailLocal: 'active-yen.tran', fullName: 'Yến Trần', joinedDaysAgo: 14 },
    { emailLocal: 'active-phuc.dinh', fullName: 'Phúc Đinh', joinedDaysAgo: 6 },
];

// Space gốc (slug từ prisma/playlists-seed-data.json / seed-playlists.ts) → ai
// clone + học tới đâu. Không gán đều tất cả user vào mọi Space — số lượng
// và % lệch nhau giữa các Space để không trông như 1 khuôn lặp lại.
interface Assignment {
    slug: string;
    members: { emailLocal: string; completionPercent: number }[];
}

const ASSIGNMENTS: Assignment[] = [
    {
        slug: 'hoc-html-css-cung-f8',
        members: [
            { emailLocal: 'active-hoa.nguyen', completionPercent: 82 },
            { emailLocal: 'active-minh.tran', completionPercent: 41 },
            { emailLocal: 'active-thu.le', completionPercent: 15 },
        ],
    },
    {
        slug: 'hoc-reactjs-cung-f8',
        members: [
            { emailLocal: 'active-minh.tran', completionPercent: 63 },
            { emailLocal: 'active-duc.pham', completionPercent: 28 },
            { emailLocal: 'active-linh.dang', completionPercent: 8 },
        ],
    },
    {
        slug: 'java-spring-boot-project-techmaster',
        members: [
            { emailLocal: 'active-lan.vo', completionPercent: 53 },
            { emailLocal: 'active-quan.hoang', completionPercent: 20 },
        ],
    },
    {
        slug: 'flutter',
        members: [
            { emailLocal: 'active-duc.pham', completionPercent: 34 },
            { emailLocal: 'active-nam.bui', completionPercent: 11 },
        ],
    },
    {
        slug: 'lap-trinh-c-co-ban-howkteam',
        members: [
            { emailLocal: 'active-hoa.nguyen', completionPercent: 47 },
            { emailLocal: 'active-quan.hoang', completionPercent: 71 },
            { emailLocal: 'active-nam.bui', completionPercent: 19 },
        ],
    },
    {
        slug: 'khoa-hoc-lap-trinh-python-a-z-2023',
        members: [
            { emailLocal: 'active-thu.le', completionPercent: 58 },
            { emailLocal: 'active-linh.dang', completionPercent: 33 },
        ],
    },
    // 2026-09-14 (v2) — phủ nốt 17 Space còn lại (10 playlist mới seed thêm +
    // 7 Space cũ trước đó chưa có ai), để KHÔNG Space nào trông trống trơn.
    {
        slug: 'java-core-project-techmaster',
        members: [
            { emailLocal: 'active-hoa.nguyen', completionPercent: 91 },
            { emailLocal: 'active-tuan.le', completionPercent: 45 },
            { emailLocal: 'active-khanh.vu', completionPercent: 22 },
        ],
    },
    {
        slug: 'nodejs-co-ban',
        members: [
            { emailLocal: 'active-duc.pham', completionPercent: 58 },
            { emailLocal: 'active-huy.nguyen', completionPercent: 27 },
        ],
    },
    {
        slug: 'lap-trinh-java-co-ban-howkteam',
        members: [
            { emailLocal: 'active-mai.pham', completionPercent: 33 },
            { emailLocal: 'active-khanh.vu', completionPercent: 12 },
        ],
    },
    {
        slug: 'lap-trinh-c-co-ban-howkteam-2',
        members: [
            { emailLocal: 'active-quan.hoang', completionPercent: 65 },
            { emailLocal: 'active-yen.tran', completionPercent: 19 },
        ],
    },
    {
        slug: 'java-khoa-hoc-lap-trinh-javafx-howkteam',
        members: [
            { emailLocal: 'active-tuan.le', completionPercent: 44 },
            { emailLocal: 'active-nam.bui', completionPercent: 8 },
        ],
    },
    {
        slug: 'sql-server-khoa-hoc-su-dung-sql-server',
        members: [
            { emailLocal: 'active-mai.pham', completionPercent: 71 },
            { emailLocal: 'active-phuc.dinh', completionPercent: 25 },
        ],
    },
    {
        slug: 'hoc-vuejs-cung-zendvn',
        members: [
            { emailLocal: 'active-linh.dang', completionPercent: 39 },
            { emailLocal: 'active-huy.nguyen', completionPercent: 15 },
            { emailLocal: 'active-yen.tran', completionPercent: 60 },
        ],
    },
    {
        slug: '2025-hoc-git-mien-phi-khoa-hoc-git-mien-phi',
        members: [
            { emailLocal: 'active-phuc.dinh', completionPercent: 88 },
            { emailLocal: 'active-khanh.vu', completionPercent: 50 },
        ],
    },
    {
        slug: 'git-co-ban-va-nang-cao',
        members: [
            { emailLocal: 'active-hoa.nguyen', completionPercent: 27 },
            { emailLocal: 'active-yen.tran', completionPercent: 66 },
        ],
    },
    {
        slug: 'khoa-hoc-lap-trinh-python-tu-co-ban-den-nang-cao',
        members: [
            { emailLocal: 'active-thu.le', completionPercent: 24 },
            { emailLocal: 'active-mai.pham', completionPercent: 45 },
            { emailLocal: 'active-tuan.le', completionPercent: 9 },
        ],
    },
    {
        slug: 'hoc-lap-trinh-python',
        members: [
            { emailLocal: 'active-linh.dang', completionPercent: 55 },
            { emailLocal: 'active-phuc.dinh', completionPercent: 18 },
        ],
    },
    {
        slug: 'khoa-hoc-fullstack-sern-sql-express-js-react-js-node-js-web-developer-mien-phi-voi-hoi-dan-it',
        members: [
            { emailLocal: 'active-duc.pham', completionPercent: 17 },
            { emailLocal: 'active-quan.hoang', completionPercent: 36 },
            { emailLocal: 'active-huy.nguyen', completionPercent: 6 },
        ],
    },
    {
        slug: 'full-khoa-hoc-java-fullstack-developer',
        members: [
            { emailLocal: 'active-hoa.nguyen', completionPercent: 29 },
            { emailLocal: 'active-khanh.vu', completionPercent: 62 },
            { emailLocal: 'active-nam.bui', completionPercent: 13 },
        ],
    },
    {
        slug: 'hoi-vien-khoa-hoc-node-js-co-ban-tu-a-den-z-cho-nguoi-moi-bat-dau-hoi-dan-it',
        members: [
            { emailLocal: 'active-minh.tran', completionPercent: 22 },
            { emailLocal: 'active-tuan.le', completionPercent: 48 },
        ],
    },
    {
        slug: 'csharp-khoa-hoc-lap-trinh-c-nang-cao-howkteam',
        members: [
            { emailLocal: 'active-quan.hoang', completionPercent: 15 },
            { emailLocal: 'active-mai.pham', completionPercent: 40 },
        ],
    },
    {
        slug: 'c-thuat-toan-cau-truc-du-lieu-giai-thuat-nang-cao-on-thi-hoc-sinh-gioi-tinh-on-vao-doi-tuyen-quoc-gia-tin-hoc-lap-trinh-thi-dau',
        members: [
            { emailLocal: 'active-khanh.vu', completionPercent: 33 },
            { emailLocal: 'active-thu.le', completionPercent: 11 },
            { emailLocal: 'active-yen.tran', completionPercent: 52 },
        ],
    },
    {
        slug: 'hoc-lap-trinh-web-php-co-ban-mien-phi-vietpro-academy',
        members: [
            { emailLocal: 'active-phuc.dinh', completionPercent: 44 },
            { emailLocal: 'active-linh.dang', completionPercent: 20 },
        ],
    },
];

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

/** Mirrors SpaceRepository.ensureShareToken — clone cá nhân không cần share_token (chưa chia sẻ tiếp). */
function slugify(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function ensureUniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    while (await prisma.spaces.findUnique({ where: { slug: candidate } })) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
    }
    return candidate;
}

async function ensureVirtualUser(v: VirtualUser) {
    const email = `${v.emailLocal}${SEED_MARK}`;
    let user = await prisma.users.findFirst({ where: { email } });
    if (user) return user;
    const unusablePassword = await bcrypt.hash(randomBytes(32).toString('base64url'), 10);
    user = await prisma.users.create({
        data: {
            email,
            password_hash: unusablePassword, // không lưu plaintext ở đâu — không ai đăng nhập được
            full_name: v.fullName,
            role: 'STUDENT',
            status: 'ACTIVE',
            created_at: daysAgo(v.joinedDaysAgo),
        },
    });
    console.log(`✅ Tạo user ảo ${v.fullName} (${email})`);
    return user;
}

/** Clone 1 Space gốc cho 1 owner mới — copy chapters/lessons, giữ nguyên
 *  cấu trúc (KHÔNG tham chiếu ngược lessons gốc, y hệt SpaceRepository.cloneForOwner
 *  thật) để learning_progress của clone không đụng learning_progress của Space gốc
 *  hay của clone khác. */
async function cloneSpaceForUser(rootSpaceId: bigint, rootTitle: string, ownerId: bigint, ownerName: string, joinedDaysAgo: number) {
    const existing = await prisma.spaces.findFirst({
        where: { owner_id: ownerId, cloned_from_space_id: rootSpaceId },
    });
    if (existing) return existing;

    const root = await prisma.spaces.findUniqueOrThrow({
        where: { id: rootSpaceId },
        include: { chapters: { include: { lessons: true }, orderBy: { order_index: 'asc' } } },
    });

    const slug = await ensureUniqueSlug(slugify(`${rootTitle}-${ownerName}`));
    const clone = await prisma.spaces.create({
        data: {
            owner_id: ownerId,
            title: root.title,
            slug,
            description: root.description,
            status: 'ACTIVE',
            is_showcase: false, // clone cá nhân — không phải artifact showcase
            source_id: root.source_id,
            cloned_from_space_id: root.id,
            created_at: daysAgo(joinedDaysAgo),
        },
    });

    const lessonIdMap = new Map<bigint, bigint>(); // lesson gốc → lesson trong bản clone (thứ tự giữ nguyên)
    for (const chapter of root.chapters) {
        const newChapter = await prisma.chapters.create({
            data: { space_id: clone.id, title: chapter.title, order_index: chapter.order_index },
        });
        for (const lesson of chapter.lessons.sort((a, b) => a.order_index - b.order_index)) {
            const newLesson = await prisma.lessons.create({
                data: {
                    chapter_id: newChapter.id,
                    source_id: lesson.source_id,
                    title: lesson.title,
                    type: lesson.type,
                    content_url: lesson.content_url,
                    order_index: lesson.order_index,
                },
            });
            lessonIdMap.set(lesson.id, newLesson.id);
        }
    }

    return { ...clone, _lessonIdMap: lessonIdMap };
}

async function main() {
    console.log(`🌱 Seeding ${VIRTUAL_USERS.length} user ảo + ${ASSIGNMENTS.length} Space có "bạn học"...`);

    const users = new Map<string, Awaited<ReturnType<typeof ensureVirtualUser>>>();
    for (const v of VIRTUAL_USERS) {
        users.set(v.emailLocal, await ensureVirtualUser(v));
    }

    let clonesCreated = 0;
    let progressRowsCreated = 0;
    const skippedSlugs: string[] = [];

    for (const assignment of ASSIGNMENTS) {
        const root = await prisma.spaces.findUnique({ where: { slug: assignment.slug } });
        if (!root) {
            skippedSlugs.push(assignment.slug);
            continue;
        }

        for (const member of assignment.members) {
            const virtualUserDef = VIRTUAL_USERS.find((v) => v.emailLocal === member.emailLocal)!;
            const user = users.get(member.emailLocal)!;

            const clone = await cloneSpaceForUser(root.id, root.title, user.id, user.full_name, virtualUserDef.joinedDaysAgo);
            if (!('_lessonIdMap' in clone)) continue; // đã tồn tại từ lần chạy trước — bỏ qua, không re-seed progress
            clonesCreated += 1;

            const orderedLessonIds = [...clone._lessonIdMap.values()];
            const finishedCount = Math.min(
                orderedLessonIds.length,
                Math.max(1, Math.round((member.completionPercent / 100) * orderedLessonIds.length)),
            );

            for (let i = 0; i < finishedCount; i++) {
                await prisma.learning_progress.create({
                    data: {
                        user_id: user.id,
                        space_id: clone.id,
                        lesson_id: orderedLessonIds[i],
                        is_finished: true,
                    },
                });
                progressRowsCreated += 1;
            }

            console.log(`   ↳ ${user.full_name} clone "${root.title}" — ${finishedCount}/${orderedLessonIds.length} bài (~${member.completionPercent}%)`);
        }
    }

    console.log('\n🎉 Active-user seed complete.');
    console.log(`   Space clone tạo mới: ${clonesCreated}`);
    console.log(`   Dòng learning_progress tạo mới: ${progressRowsCreated}`);
    if (skippedSlugs.length > 0) {
        console.log(`   Bỏ qua (không tìm thấy Space gốc — chạy npm run seed:playlists trước): ${skippedSlugs.join(', ')}`);
    }
}

/** Chạy độc lập (npm run seed:active-users) HOẶC được prisma/seed-launch.ts import gọi tuần tự. */
export async function run(): Promise<void> {
    try {
        await main();
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    run().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
