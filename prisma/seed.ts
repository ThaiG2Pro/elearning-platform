import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'db', 'postgres']);

/**
 * This seed TRUNCATES every table. It exists for dev/QA only. Refuse to run
 * against anything that looks like a real deployment unless the operator
 * explicitly opts in with ALLOW_DESTRUCTIVE_SEED=1.
 *
 * "Looks real" = NODE_ENV is production, or DATABASE_URL points at a host that
 * is not a local/compose database.
 */
function assertSafeToTruncate(): void {
    if (process.env.ALLOW_DESTRUCTIVE_SEED === '1') {
        console.warn('⚠️  ALLOW_DESTRUCTIVE_SEED=1 — skipping production guard, ALL DATA WILL BE WIPED.');
        return;
    }

    const reasons: string[] = [];
    if (process.env.NODE_ENV === 'production') {
        reasons.push('NODE_ENV=production');
    }
    let host = '';
    try {
        host = new URL(process.env.DATABASE_URL ?? '').hostname.toLowerCase();
    } catch {
        // unparsable → treat as unknown/remote
    }
    if (!LOCAL_DB_HOSTS.has(host)) {
        reasons.push(`DATABASE_URL host "${host || '?'}" is not a local database`);
    }

    if (reasons.length > 0) {
        console.error('❌ Refusing to run destructive seed (it TRUNCATEs every table):');
        for (const r of reasons) console.error(`   - ${r}`);
        console.error('   Set ALLOW_DESTRUCTIVE_SEED=1 to override if you really mean it.');
        process.exit(1);
    }
}

/** Mirrors SpaceRepository.ensureShareToken — opaque, not the numeric id. */
function generateShareToken(): string {
    return randomBytes(10).toString('base64url');
}

/**
 * Mirrors YouTubeOEmbedAdapter.normalize — canonical form used for `sources.normalized_url` dedup.
 */
const YOUTUBE_ID_PATTERN = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
function normalizeYouTubeUrl(url: string): string {
    const match = url.match(YOUTUBE_ID_PATTERN);
    if (!match) return url.trim();
    return `https://www.youtube.com/watch?v=${match[1]}`;
}

/** Bỏ dấu tiếng Việt + rút gọn thành slug an toàn cho URL. */
function slugify(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // bỏ dấu
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Avatar đồng nhất: cùng 1 template SVG (nền xanh, chữ trắng), chỉ khác 2 chữ
 * cái đầu lấy từ tên — theo đúng quy ước đã thống nhất cho seed data.
 */
function initialsOf(name: string): string {
    return name.replace(/[^\p{L}]/gu, '').slice(0, 2).toUpperCase();
}
function avatarDataUrl(name: string): string {
    const initials = initialsOf(name);
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%232563eb"/><text x="50%" y="55%" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
}

/**
 * Creates (or reuses, by normalized_url) a `sources` row for a video lesson.
 */
async function upsertVideoSource(url: string, title: string) {
    const normalizedUrl = normalizeYouTubeUrl(url);
    return prisma.sources.upsert({
        where: { normalized_url: normalizedUrl },
        update: {},
        create: {
            url,
            normalized_url: normalizedUrl,
            title,
            type: 'YOUTUBE_VIDEO',
            last_accessed_at: new Date(),
        },
    });
}

interface VideoDef {
    url: string;
    label: string;
}

/**
 * Tạo cây chapters/lessons cho 1 space, 1 chapter chứa đúng 1 lesson — khớp
 * layout "Space → Chapter → Lesson" mà mỗi chương chỉ có 1 bài giảng video.
 * Dùng chung cho space gốc lẫn các bản clone (source được upsert dedup theo
 * normalized_url nên clone trỏ lại đúng source đã tồn tại, không tạo trùng).
 */
async function createChaptersAndLessons(spaceId: bigint, courseTitle: string, videos: VideoDef[]) {
    for (let i = 0; i < videos.length; i++) {
        const n = i + 1;
        const video = videos[i];
        const source = await upsertVideoSource(video.url, `${courseTitle} — Bài ${n}: ${video.label}`);
        const chapter = await prisma.chapters.create({
            data: { space_id: spaceId, title: `Chương ${n}`, order_index: n },
        });
        await prisma.lessons.create({
            data: {
                chapter_id: chapter.id,
                source_id: source.id,
                title: `Bài ${n}: ${video.label}`,
                type: 'VIDEO',
                content_url: video.url,
                order_index: 1,
            },
        });
    }
}

async function main() {
    assertSafeToTruncate();
    console.log('🌱 Seeding database (kịch bản 4 user / 4 space thật)...');

    console.log('🧹 Truncating tables and resetting sequences...');
    await prisma.$executeRaw`TRUNCATE TABLE "credit_transactions","ai_generations","questions","learning_progress","notes","lessons","sources","chapters","spaces","tokens","user_avatars","users" RESTART IDENTITY CASCADE;`;
    console.log('✅ Tables truncated and sequences reset');

    // 1. USERS — Viet, Nam, Hoang, Sa. Cùng password, cùng 100 credit khởi điểm.
    const hashedPassword = await bcrypt.hash('password123', 10);
    const now = new Date();

    const userDefs = [
        { key: 'viet', email: 'viet@gmail.com', full_name: 'Viet' },
        { key: 'nam', email: 'nam@gmail.com', full_name: 'Nam' },
        { key: 'hoang', email: 'hoang@gmail.com', full_name: 'Hoang' },
        { key: 'sa', email: 'sa@gmail.com', full_name: 'Sa' },
    ] as const;

    const users: Record<string, { id: bigint; full_name: string }> = {};
    for (const def of userDefs) {
        const user = await prisma.users.create({
            data: {
                email: def.email,
                password_hash: hashedPassword,
                full_name: def.full_name,
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: now,
                credit_balance: 100,
            },
        });
        await prisma.user_avatars.create({
            data: { user_id: user.id, data: avatarDataUrl(def.full_name) },
        });
        users[def.key] = user;
    }
    const viet = users.viet;
    const nam = users.nam;
    const hoang = users.hoang;
    const sa = users.sa;

    console.log('✅ Users created (Viet, Nam, Hoang, Sa) — mỗi người 100 credit, avatar 2 chữ cái');

    // 2. SPACES gốc (mỗi space 1 chủ sở hữu, mỗi chapter đúng 1 lesson)

    // Space 1: Viet — Lập trình Python cơ bản (titv). Đã share link (công khai qua link).
    const space1 = await prisma.spaces.create({
        data: {
            owner_id: viet.id,
            title: 'Lập trình Python - 01. Lập Trình Cơ Bản PYTHON Tự Học Cho Người Mới Bắt Đầu',
            slug: slugify('Lap trinh Python 01 Lap Trinh Co Ban PYTHON Tu Hoc Cho Nguoi Moi Bat Dau'),
            description: 'Playlist YouTube của kênh titv — Lập trình Python cơ bản tự học cho người mới bắt đầu.',
            status: 'ACTIVE',
            share_token: generateShareToken(),
        },
    });
    await createChaptersAndLessons(space1.id, 'Python cơ bản (titv)', [
        { url: 'https://youtu.be/6I_ulPytQIc?si=zNIcRmi4SfPYNgQk', label: 'Video 1' },
        { url: 'https://youtu.be/uh8SiLlyDq8?si=Hn2EPoqb-Mogtyfj', label: 'Video 2' },
        { url: 'https://youtu.be/rrs-bKmJsoc?si=xDQ0WprEBy0N6rhH', label: 'Video 3' },
        { url: 'https://youtu.be/16qD3hRRadc?si=r28DulSg34NnRt3W', label: 'Video 4' },
        { url: 'https://youtu.be/ohmzrmh6a50?si=hCP30_wmANzx7bhW', label: 'Video 5' },
        { url: 'https://youtu.be/vSAIkPlm6t8?si=P1zX2-6lxsHHUme5', label: 'Video 6' },
        { url: 'https://youtu.be/vfS2_6nl7AA?si=i8oXbbQaSAtCGbYM', label: 'Video 7' },
    ]);

    // Space 2: Nam — Basic Python Programming (Dũng Lại Lập Trình). Có share link
    // (Viet clone được không gian này nên cần link tồn tại).
    const space2 = await prisma.spaces.create({
        data: {
            owner_id: nam.id,
            title: 'Basic PYTHON Programming Self-Study For Beginners',
            slug: slugify('Basic PYTHON Programming Self Study For Beginners'),
            description: 'Playlist YouTube của kênh Dũng Lại Lập Trình — Basic Python Programming Self-Study For Beginners.',
            status: 'ACTIVE',
            share_token: generateShareToken(),
        },
    });
    await createChaptersAndLessons(space2.id, 'Basic Python (Dũng Lại Lập Trình)', [
        { url: 'https://youtu.be/oFgg7K2tpfk?si=Emr4VBM6Hsd0R4-f', label: 'Video 1' },
        { url: 'https://youtu.be/HyovJpkPSfY?si=VQajkFl-kNwrSBfd', label: 'Video 2' },
        { url: 'https://youtu.be/wVboOz_O8rE?si=PekzH-9rkHc0dsCR', label: 'Video 3' },
        { url: 'https://youtu.be/WagJ-OjRtCM?si=gC0B9qZasU0jfIKa', label: 'Video 4' },
    ]);

    // Space 3: Viet — Lập trình Go cơ bản (Việt Trần). Giữ riêng tư (không share_token).
    const space3 = await prisma.spaces.create({
        data: {
            owner_id: viet.id,
            title: 'Lập trình Go cơ bản',
            slug: slugify('Lap trinh Go co ban'),
            description: 'Playlist YouTube của Việt Trần — Lập trình Go cơ bản.',
            status: 'ACTIVE',
            share_token: null,
        },
    });
    await createChaptersAndLessons(space3.id, 'Go cơ bản (Việt Trần)', [
        { url: 'https://youtu.be/3E9W5pvVqsg?si=89SK8KsoMrSuLIhV', label: 'Video 1' },
        { url: 'https://youtu.be/AW5ql00ZWZ0?si=_Hvfp3sNmH_hdDdV', label: 'Video 2' },
        { url: 'https://youtu.be/UqgolK8jf2c?si=pK-6wIMIU7JIVvB6', label: 'Video 3' },
    ]);

    // Space 4: Hoang — Lập Trình REST API cơ bản với Golang (Việt Trần). Có share
    // link (Nam clone được không gian này nên cần link tồn tại).
    const space4 = await prisma.spaces.create({
        data: {
            owner_id: hoang.id,
            title: 'Lập Trình REST API cơ bản với Golang',
            slug: slugify('Lap Trinh REST API co ban voi Golang'),
            description: 'Playlist YouTube của Việt Trần — Lập Trình REST API cơ bản với Golang.',
            status: 'ACTIVE',
            share_token: generateShareToken(),
        },
    });
    await createChaptersAndLessons(space4.id, 'REST API Golang (Việt Trần)', [
        { url: 'https://youtu.be/99bk5YpHxx0?si=W8mpXq1jmp3XxvBE', label: 'Video 1' },
        { url: 'https://youtu.be/F39kqQw76mE?si=DNOc5ROSSeCXSEHB', label: 'Video 2' },
        { url: 'https://youtu.be/9T7zHMmz15A?si=J-LCpkDkJx2eg_cy', label: 'Video 3' },
    ]);

    console.log('✅ 4 Spaces gốc tạo xong (Space1 Viet, Space2 Nam, Space3 Viet[private], Space4 Hoang)');

    // 3. CLONES ("Sao chép về học") — mirror ContentManagementService.cloneSpace:
    // space mới, owner mới, cloned_from_space_id trỏ về gốc, không có share_token
    // riêng (clone luôn private cho tới khi chủ mới tự share).

    // Viet clone Space 2 (của Nam)
    const space2CloneByViet = await prisma.spaces.create({
        data: {
            owner_id: viet.id,
            title: space2.title,
            slug: `${slugify(space2.title)}-${randomBytes(3).toString('hex')}`,
            description: space2.description,
            status: 'ACTIVE',
            cloned_from_space_id: space2.id,
        },
    });
    await createChaptersAndLessons(space2CloneByViet.id, 'Basic Python (Dũng Lại Lập Trình)', [
        { url: 'https://youtu.be/oFgg7K2tpfk?si=Emr4VBM6Hsd0R4-f', label: 'Video 1' },
        { url: 'https://youtu.be/HyovJpkPSfY?si=VQajkFl-kNwrSBfd', label: 'Video 2' },
        { url: 'https://youtu.be/wVboOz_O8rE?si=PekzH-9rkHc0dsCR', label: 'Video 3' },
        { url: 'https://youtu.be/WagJ-OjRtCM?si=gC0B9qZasU0jfIKa', label: 'Video 4' },
    ]);

    // Nam clone Space 1 (của Viet)
    const space1CloneByNam = await prisma.spaces.create({
        data: {
            owner_id: nam.id,
            title: space1.title,
            slug: `${slugify(space1.title)}-${randomBytes(3).toString('hex')}`,
            description: space1.description,
            status: 'ACTIVE',
            cloned_from_space_id: space1.id,
        },
    });
    await createChaptersAndLessons(space1CloneByNam.id, 'Python cơ bản (titv)', [
        { url: 'https://youtu.be/6I_ulPytQIc?si=zNIcRmi4SfPYNgQk', label: 'Video 1' },
        { url: 'https://youtu.be/uh8SiLlyDq8?si=Hn2EPoqb-Mogtyfj', label: 'Video 2' },
        { url: 'https://youtu.be/rrs-bKmJsoc?si=xDQ0WprEBy0N6rhH', label: 'Video 3' },
        { url: 'https://youtu.be/16qD3hRRadc?si=r28DulSg34NnRt3W', label: 'Video 4' },
        { url: 'https://youtu.be/ohmzrmh6a50?si=hCP30_wmANzx7bhW', label: 'Video 5' },
        { url: 'https://youtu.be/vSAIkPlm6t8?si=P1zX2-6lxsHHUme5', label: 'Video 6' },
        { url: 'https://youtu.be/vfS2_6nl7AA?si=i8oXbbQaSAtCGbYM', label: 'Video 7' },
    ]);

    // Nam clone Space 4 (của Hoang)
    const space4CloneByNam = await prisma.spaces.create({
        data: {
            owner_id: nam.id,
            title: space4.title,
            slug: `${slugify(space4.title)}-${randomBytes(3).toString('hex')}`,
            description: space4.description,
            status: 'ACTIVE',
            cloned_from_space_id: space4.id,
        },
    });
    await createChaptersAndLessons(space4CloneByNam.id, 'REST API Golang (Việt Trần)', [
        { url: 'https://youtu.be/99bk5YpHxx0?si=W8mpXq1jmp3XxvBE', label: 'Video 1' },
        { url: 'https://youtu.be/F39kqQw76mE?si=DNOc5ROSSeCXSEHB', label: 'Video 2' },
        { url: 'https://youtu.be/9T7zHMmz15A?si=J-LCpkDkJx2eg_cy', label: 'Video 3' },
    ]);

    console.log('✅ Clones tạo xong (Viet←Space2, Nam←Space1, Nam←Space4)');

    // Sa: chưa owner space nào, chưa clone gì, chưa học gì — chỉ tồn tại như user thuần.
    void sa;

    // Không tạo learning_progress / notes / tokens / credit_transactions /
    // ai_generations cho bất kỳ ai — đúng theo kịch bản "chưa học space nào cả"
    // và "chưa có 1 data nào liên quan tới AI gen".

    console.log('\n🎉 Seeding hoàn tất!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Users (password123 cho tất cả, 100 credit, avatar 2 chữ cái đầu tên):');
    console.log('   - Viet  : viet@gmail.com   — owner Space1 (shared), Space3 (private); clone Space2 của Nam');
    console.log('   - Nam   : nam@gmail.com    — owner Space2; clone Space1 (Viet) và Space4 (Hoang)');
    console.log('   - Hoang : hoang@gmail.com  — owner Space4; không clone ai');
    console.log('   - Sa    : sa@gmail.com     — chưa owner space nào, chưa clone, chưa học');
    console.log('\n📚 Spaces gốc:');
    console.log(`   - Space1 (Viet, 7 chương/7 bài, SHARED)  id=${space1.id}`);
    console.log(`   - Space2 (Nam, 4 chương/4 bài, shared)   id=${space2.id}`);
    console.log(`   - Space3 (Viet, 3 chương/3 bài, PRIVATE) id=${space3.id}`);
    console.log(`   - Space4 (Hoang, 3 chương/3 bài, shared) id=${space4.id}`);
    console.log('\n🔗 Clones:');
    console.log(`   - Viet clone Space2  -> id=${space2CloneByViet.id}`);
    console.log(`   - Nam clone Space1   -> id=${space1CloneByNam.id}`);
    console.log(`   - Nam clone Space4   -> id=${space4CloneByNam.id}`);
    console.log('\n🚫 Không có dữ liệu AI generation / learning progress / notes nào được seed.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
