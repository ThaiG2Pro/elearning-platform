import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto, { randomBytes } from 'crypto';

const prisma = new PrismaClient();

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

/** Compute recipeHash deterministically for seeding AI generations. */
function computeRecipeHash(type: string, params: Record<string, unknown>, modelVersion: string, segmentRange: { startSec: number; endSec: number } | null = null): string {
    function sortDeep(val: unknown): unknown {
        if (Array.isArray(val)) return val.map(sortDeep);
        if (val !== null && typeof val === 'object') {
            const sorted: Record<string, unknown> = {};
            for (const k of Object.keys(val as Record<string, unknown>).sort()) {
                sorted[k] = sortDeep((val as Record<string, unknown>)[k]);
            }
            return sorted;
        }
        return val;
    }
    const canonical = JSON.stringify(sortDeep({
        type,
        params,
        segmentRange,
        modelVersion,
    }));
    return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Creates (or reuses, by normalized_url) a `sources` row for a video lesson.
 */
async function upsertVideoSource(
    url: string,
    title: string,
    options: {
        transcript?: string | null;
        lastAccessedAt?: Date;
        archivedAt?: Date;
    } = {}
) {
    const normalizedUrl = normalizeYouTubeUrl(url);
    return prisma.sources.upsert({
        where: { normalized_url: normalizedUrl },
        update: {
            transcript: options.transcript,
            last_accessed_at: options.lastAccessedAt,
            archived_at: options.archivedAt,
        },
        create: {
            url,
            normalized_url: normalizedUrl,
            title,
            type: 'YOUTUBE_VIDEO',
            transcript: options.transcript,
            transcript_fetched_at: options.transcript ? new Date() : null,
            last_accessed_at: options.lastAccessedAt || new Date(),
            archived_at: options.archivedAt,
        },
    });
}

async function main() {
    console.log('🌱 Seeding database with comprehensive test scenarios...');

    // Clear existing data — use TRUNCATE to ensure tables are fully cleared and sequences reset
    console.log('🧹 Truncating tables and resetting sequences...');
    await prisma.$executeRaw`TRUNCATE TABLE "credit_transactions","ai_generations","questions","learning_progress","notes","lessons","sources","chapters","spaces","tokens","user_avatars","users" RESTART IDENTITY CASCADE;`;
    console.log('✅ Tables truncated and sequences reset');

    // 2. USERS (Various profiles & states)
    const hashedPassword = await bcrypt.hash('password123', 10);
    const now = new Date();

    // User 1: John Doe — Active Learner with Credit Balance & Stripe Customer ID
    const john = await prisma.users.create({
        data: {
            email: 'john@gmail.com',
            password_hash: hashedPassword,
            full_name: 'John Doe',
            age: 25,
            role: 'STUDENT',
            status: 'ACTIVE',
            created_at: new Date(now.getTime() - 30 * 24 * 3600 * 1000),
            credit_balance: 50,
            stripe_customer_id: 'cus_seed_john_doe_123',
        },
    });
    // Avatar sống ở bảng user_avatars (1-1), không còn trên users.
    await prisma.user_avatars.create({
        data: {
            user_id: john.id,
            data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%232563eb"/><text x="50%" y="55%" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">JD</text></svg>',
        },
    });

    // User 2: Jack Smith — Space Creator / Author
    const jack = await prisma.users.create({
        data: {
            email: 'jack@gmail.com',
            password_hash: hashedPassword,
            full_name: 'Jack Smith',
            age: 38,
            role: 'STUDENT',
            status: 'ACTIVE',
            created_at: new Date(now.getTime() - 60 * 24 * 3600 * 1000),
            credit_balance: 10,
        },
    });

    // User 3: Alice Johnson — Advanced BYOK user
    const alice = await prisma.users.create({
        data: {
            email: 'alice@gmail.com',
            password_hash: hashedPassword,
            full_name: 'Alice Johnson',
            age: 29,
            role: 'STUDENT',
            status: 'ACTIVE',
            created_at: new Date(now.getTime() - 15 * 24 * 3600 * 1000),
            credit_balance: 0,
        },
    });

    // User 4: Bob Newbie — Pending Account (with activation token)
    const bob = await prisma.users.create({
        data: {
            email: 'bob@gmail.com',
            password_hash: hashedPassword,
            full_name: 'Bob Newbie',
            age: 20,
            role: 'STUDENT',
            status: 'INACTIVE',
            created_at: now,
            credit_balance: 0,
        },
    });

    // User 5: Trọng Tín — Admin
    await prisma.users.create({
        data: {
            email: 'admin1@gmail.com',
            password_hash: hashedPassword,
            full_name: 'Trọng Tín',
            age: 31,
            role: 'ADMIN',
            status: 'ACTIVE',
            created_at: new Date(now.getTime() - 90 * 24 * 3600 * 1000),
            credit_balance: 100,
        },
    });

    console.log('✅ Users created (John, Jack, Alice, Bob [Pending], Admin)');

    // 3. TOKENS (Activation & Password Recovery)
    // Activation token for Bob
    await prisma.tokens.create({
        data: {
            user_id: bob.id,
            code: crypto.randomUUID(),
            type: 'ACTIVATION',
            expires_at: new Date(now.getTime() + 24 * 3600 * 1000), // +24h
            is_used: false,
        },
    });

    // Expired Password Recovery token for John (to test expiry checks)
    await prisma.tokens.create({
        data: {
            user_id: john.id,
            code: crypto.randomUUID(),
            type: 'RECOVERY',
            expires_at: new Date(now.getTime() - 2 * 3600 * 1000), // expired 2h ago
            is_used: false,
        },
    });

    console.log('✅ Auth tokens created (Activation for Bob, Expired Recovery for John)');

    // 4. BILLING & CREDIT TRANSACTIONS (WP4.1 Ledger)
    // John bought 50 credits via Stripe Checkout
    await prisma.credit_transactions.create({
        data: {
            user_id: john.id,
            amount: 50,
            reason: 'PURCHASE',
            stripe_reference: 'cs_test_seed_checkout_session_001',
            balance_after: 50,
            created_at: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
        },
    });

    // Jack bought 20 credits, spent 10 credits on PAID_TIER generation
    await prisma.credit_transactions.create({
        data: {
            user_id: jack.id,
            amount: 20,
            reason: 'PURCHASE',
            stripe_reference: 'cs_test_seed_checkout_session_002',
            balance_after: 20,
            created_at: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
        },
    });

    await prisma.credit_transactions.create({
        data: {
            user_id: jack.id,
            amount: -10,
            reason: 'AI_GENERATION_SPEND',
            stripe_reference: null,
            balance_after: 10,
            created_at: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
        },
    });

    console.log('✅ Credit ledger transactions created');

    // 5. SOURCES & TRANSCRIPTS (With Active & Archived cases)
    const javaUrl = 'https://youtu.be/9tQ-GGE010s?si=IRbSd51Vl6NL32Ge';
    const javaTranscript = `00:00 Chào mừng các bạn đến với khóa học Lập trình Java cơ bản.
00:15 Trong bài học này, chúng ta sẽ tìm hiểu về Java Virtual Machine (JVM), JDK và JRE.
01:30 Java là ngôn ngữ lập trình hướng đối tượng, đa nền tảng nhờ cơ chế Bytecode.
03:00 Viết một chương trình Hello World đầu tiên và giải thích cấu trúc method main.`;
    const javaSource = await upsertVideoSource(javaUrl, 'Giới thiệu về Java & Cài đặt môi trường', {
        transcript: javaTranscript,
        lastAccessedAt: new Date(),
    });

    const tsUrl = 'https://www.youtube.com/watch?v=BwuLxPH8IDs';
    const tsTranscript = `00:00 Welcome to TypeScript full space.
00:30 TypeScript adds static type definitions to JavaScript.
02:00 Types, Interfaces, Generics and Type inference explained.
05:00 Advanced Clean Architecture patterns with TypeScript and Prisma.`;
    const tsSource = await upsertVideoSource(tsUrl, 'Mastering TypeScript & Clean Architecture', {
        transcript: tsTranscript,
        lastAccessedAt: new Date(),
    });

    const reactUrl = 'https://www.youtube.com/watch?v=w7ejDZ8SWv8';
    const reactSource = await upsertVideoSource(reactUrl, 'React JS & Next.js Crash Space', {
        transcript: '00:00 React basics and Virtual DOM.\n02:15 Component Lifecycle & Hooks.',
        lastAccessedAt: new Date(),
    });

    // Stale / Archived source (for Data Retention / Archiving testing WP4.2)
    const staleUrl = 'https://www.youtube.com/watch?v=stale_video_sample_123';
    await upsertVideoSource(staleUrl, 'Khóa học Cũ đã lưu trữ (Archived Source)', {
        transcript: null, // nullified by archiveStaleData
        lastAccessedAt: new Date(now.getTime() - 45 * 24 * 3600 * 1000), // 45 days ago
        archivedAt: new Date(now.getTime() - 15 * 24 * 3600 * 1000), // archived 15 days ago
    });

    console.log('✅ Sources & Transcripts created (including active & archived sources)');

    // 6. AI GENERATIONS (SHARED_FREE, BYOK, PAID_TIER, PENDING, FAILED)
    const modelVer = 'groq/qwen/qwen3.6-27b';

    // Case A: SHARED_FREE Default Summary Cache (READY)
    const javaSummaryHash = computeRecipeHash('summary', { detailLevel: 'standard' }, modelVer);
    const javaSummaryAi = await prisma.ai_generations.create({
        data: {
            source_id: javaSource.id,
            recipe_hash: javaSummaryHash,
            recipe_type: 'summary',
            is_default_recipe: true,
            key_source: 'SHARED_FREE',
            generated_by_user_id: jack.id,
            visibility: 'PRIVATE',
            status: 'READY',
            model_version: modelVer,
            content: '### 📌 Tóm tắt bài học Java:\n1. **Khái niệm JVM/JDK/JRE:** Nền tảng thực thi bytecode giúp Java độc lập nền tảng.\n2. **Cú pháp cơ bản:** Cấu trúc lớp `public class` và phương thức khởi chạy `public static void main(String[] args)`.\n3. **Thực hành:** Biên dịch bằng `javac` và chạy qua `java`.',
        },
    });

    // Case B: SHARED_FREE Default Quiz Cache (READY)
    const javaQuizHash = computeRecipeHash('quiz', { questionCount: 3 }, modelVer);
    const javaQuizAi = await prisma.ai_generations.create({
        data: {
            source_id: javaSource.id,
            recipe_hash: javaQuizHash,
            recipe_type: 'quiz',
            is_default_recipe: true,
            key_source: 'SHARED_FREE',
            generated_by_user_id: jack.id,
            visibility: 'PRIVATE',
            status: 'READY',
            model_version: modelVer,
            content: JSON.stringify([
                { question: 'JVM là viết tắt của gì?', options: ['Java Virtual Machine', 'Java Visual Mode', 'Java Variable Manager', 'Java Vector Model'], answer: 'Java Virtual Machine' },
                { question: 'Bytecode của Java chạy trên đâu?', options: ['Trực tiếp trên CPU', 'Trên JVM', 'Trên trình duyệt', 'Trên NodeJS'], answer: 'Trên JVM' }
            ]),
        },
    });

    // Case C: BYOK Custom Recipe (SHARED visibility)
    const tsCustomHash = computeRecipeHash('summary', { focus: 'clean_architecture', detailLevel: 'deep' }, modelVer);
    await prisma.ai_generations.create({
        data: {
            source_id: tsSource.id,
            recipe_hash: tsCustomHash,
            recipe_type: 'summary',
            is_default_recipe: false,
            key_source: 'BYOK',
            generated_by_user_id: alice.id,
            visibility: 'SHARED', // Shared with community
            status: 'READY',
            model_version: modelVer,
            content: '### 🏗️ TypeScript Clean Architecture Summary:\n- Decouple Domain Entities from ORM Models.\n- Dependency Inversion via Interfaces & Repositories.\n- Error handling with functional Results.',
        },
    });

    // Case D: PAID_TIER Generation (PRIVATE)
    const reactPaidHash = computeRecipeHash('quiz', { difficulty: 'hard', count: 10 }, modelVer);
    await prisma.ai_generations.create({
        data: {
            source_id: reactSource.id,
            recipe_hash: reactPaidHash,
            recipe_type: 'quiz',
            is_default_recipe: false,
            key_source: 'PAID_TIER',
            generated_by_user_id: john.id,
            visibility: 'PRIVATE',
            status: 'READY',
            model_version: modelVer,
            content: '### ⚡ Next.js Advanced Quiz generated via Paid Tier.',
        },
    });

    // Case E: FAILED Generation (Rate Limit Error — for error testing)
    const failHash = computeRecipeHash('summary', { test: 'rate_limit_case' }, modelVer);
    await prisma.ai_generations.create({
        data: {
            source_id: javaSource.id,
            recipe_hash: failHash,
            recipe_type: 'summary',
            is_default_recipe: false,
            key_source: 'SHARED_FREE',
            generated_by_user_id: john.id,
            visibility: 'PRIVATE',
            status: 'FAILED',
            model_version: modelVer,
            error: '429 Rate limit exceeded: Groq requests per minute limit reached.',
        },
    });

    // Case F: PENDING Generation (In-flight processing)
    const pendingHash = computeRecipeHash('summary', { test: 'pending_case' }, modelVer);
    await prisma.ai_generations.create({
        data: {
            source_id: tsSource.id,
            recipe_hash: pendingHash,
            recipe_type: 'summary',
            is_default_recipe: false,
            key_source: 'SHARED_FREE',
            generated_by_user_id: bob.id,
            visibility: 'PRIVATE',
            status: 'PENDING',
            model_version: modelVer,
        },
    });

    console.log('✅ AI generations created (SHARED_FREE, BYOK SHARED, PAID_TIER, FAILED, PENDING)');

    // 7. SPACES, CHAPTERS & LESSONS (With Multi-Chapter & Lineage Cases)

    // Space 1: Java (Jack Smith) — Has AI summary and AI quiz attached to lessons
    const javaSpace = await prisma.spaces.create({
        data: {
            owner_id: jack.id,
            title: 'Nhập môn Lập trình Java Cơ bản',
            slug: 'nhap-mon-lap-trinh-java-co-ban',
            description: 'Khóa học Java hoàn chỉnh với tóm tắt AI và bài tập thực hành',
            status: 'ACTIVE',
            source_id: javaSource.id,
            share_token: generateShareToken(),
        },
    });

    const javaChapter1 = await prisma.chapters.create({
        data: { space_id: javaSpace.id, title: 'Chương 1: Môi trường & Cú pháp cơ bản', order_index: 1 },
    });

    const javaLesson1 = await prisma.lessons.create({
        data: {
            chapter_id: javaChapter1.id,
            source_id: javaSource.id,
            title: 'Bài 1: Giới thiệu JVM, JRE và Cài đặt',
            type: 'VIDEO',
            content_url: javaUrl,
            order_index: 1,
            ai_generation_id: javaSummaryAi.id,
        },
    });

    const javaLesson2 = await prisma.lessons.create({
        data: {
            chapter_id: javaChapter1.id,
            source_id: javaSource.id,
            title: 'Bài 2: Trắc nghiệm củng cố kiến thức Java',
            type: 'QUIZ',
            order_index: 2,
            ai_generation_id: javaQuizAi.id,
        },
    });

    await prisma.questions.createMany({
        data: [
            {
                lesson_id: javaLesson2.id,
                content: 'Java là ngôn ngữ lập trình theo mô hình nào?',
                answer_key: 'A',
                options: ['Hướng đối tượng (OOP)', 'Hướng thủ tục thuần túy', 'Hàm thuần túy', 'Logic thuần túy'],
            },
            {
                lesson_id: javaLesson2.id,
                content: 'Tệp chứa mã nguồn Java sau khi biên dịch có đuôi mở rộng là gì?',
                answer_key: 'C',
                options: ['.java', '.exe', '.class', '.jar'],
            },
        ],
    });

    // Space 2: TypeScript Multi-Chapter Space (Alice)
    const tsSpace = await prisma.spaces.create({
        data: {
            owner_id: alice.id,
            title: 'Mastering TypeScript & Clean Architecture',
            slug: 'mastering-typescript-clean-architecture',
            description: 'Khóa học nhiều chương phân cấp: Generics, Decorators, Clean Architecture',
            status: 'ACTIVE',
            source_id: tsSource.id,
            share_token: generateShareToken(),
        },
    });

    const tsChapter1 = await prisma.chapters.create({
        data: { space_id: tsSpace.id, title: 'Phần 1: Nền tảng Type System & Interfaces', order_index: 1 },
    });
    const tsChapter2 = await prisma.chapters.create({
        data: { space_id: tsSpace.id, title: 'Phần 2: Design Patterns & Dependency Injection', order_index: 2 },
    });

    const tsLesson1 = await prisma.lessons.create({
        data: { chapter_id: tsChapter1.id, source_id: tsSource.id, title: '1.1 Deep dive vào Type vs Interface', type: 'VIDEO', content_url: tsUrl, order_index: 1 },
    });
    const tsLesson2 = await prisma.lessons.create({
        data: { chapter_id: tsChapter1.id, title: '1.2 Quiz kiểm tra TypeScript Types', type: 'QUIZ', order_index: 2 },
    });
    await prisma.lessons.create({
        data: { chapter_id: tsChapter2.id, source_id: tsSource.id, title: '2.1 Repository Pattern với Prisma ORM', type: 'VIDEO', content_url: tsUrl, order_index: 1 },
    });

    await prisma.questions.createMany({
        data: [
            {
                lesson_id: tsLesson2.id,
                content: 'Khác biệt chính giữa `type` và `interface` trong TypeScript?',
                answer_key: 'B',
                options: ['Type chạy chậm hơn Interface', 'Interface hỗ trợ declaration merging, type thì không', 'Type không dùng được với Object', 'Không có điểm khác biệt'],
            },
        ],
    });

    // Space 3: Multi-tier Lineage Testing (Fork Tree)
    // Level 1: Jack creates Space A (React Space)
    const reactSpaceA = await prisma.spaces.create({
        data: {
            owner_id: jack.id,
            title: 'Lập trình React 19 & Next.js App Router',
            slug: 'react-19-nextjs-app-router',
            description: 'Không gian học gốc do Jack Smith chia sẻ',
            status: 'ACTIVE',
            source_id: reactSource.id,
            share_token: generateShareToken(),
        },
    });
    const rChapterA = await prisma.chapters.create({
        data: { space_id: reactSpaceA.id, title: 'Chương 1: Server Components & Actions', order_index: 1 },
    });
    await prisma.lessons.create({
        data: { chapter_id: rChapterA.id, source_id: reactSource.id, title: 'React Server Components căn bản', type: 'VIDEO', content_url: reactUrl, order_index: 1 },
    });

    // Level 2: John clones Space A -> Space B
    const reactSpaceB = await prisma.spaces.create({
        data: {
            owner_id: john.id,
            title: 'Lập trình React 19 & Next.js App Router (John Space)',
            slug: `react-19-john-${randomBytes(2).toString('hex')}`,
            description: 'Không gian học của John (Sao chép từ Jack Smith)',
            status: 'ACTIVE',
            cloned_from_space_id: reactSpaceA.id,
            source_id: reactSource.id,
            share_token: generateShareToken(),
        },
    });
    const rChapterB = await prisma.chapters.create({
        data: { space_id: reactSpaceB.id, title: 'Chương 1: Server Components & Actions', order_index: 1 },
    });
    const rLessonB = await prisma.lessons.create({
        data: { chapter_id: rChapterB.id, source_id: reactSource.id, title: 'React Server Components căn bản', type: 'VIDEO', content_url: reactUrl, order_index: 1 },
    });

    // Level 3: Alice clones Space B -> Space C (Cloning a Clone)
    const reactSpaceC = await prisma.spaces.create({
        data: {
            owner_id: alice.id,
            title: 'Lập trình React 19 & Next.js App Router (Alice Space)',
            slug: `react-19-alice-${randomBytes(2).toString('hex')}`,
            description: 'Không gian học của Alice (Sao chép từ John Doe)',
            status: 'ACTIVE',
            cloned_from_space_id: reactSpaceB.id,
            source_id: reactSource.id,
            share_token: generateShareToken(),
        },
    });
    const rChapterC = await prisma.chapters.create({
        data: { space_id: reactSpaceC.id, title: 'Chương 1: Server Components & Actions', order_index: 1 },
    });
    await prisma.lessons.create({
        data: { chapter_id: rChapterC.id, source_id: reactSource.id, title: 'React Server Components căn bản', type: 'VIDEO', content_url: reactUrl, order_index: 1 },
    });

    // Space 4: Empty Draft Space (For testing empty state & draft status)
    await prisma.spaces.create({
        data: {
            owner_id: jack.id,
            title: 'Khóa học Bản thảo Chưa xuất bản',
            slug: 'khoa-hoc-ban-thao-chua-xuat-ban',
            description: 'Khóa học rỗng dùng để test giao diện soạn thảo (0 chapters)',
            status: 'DRAFT',
        },
    });

    console.log('✅ Spaces & Multi-tier Lineage created (Jack -> John -> Alice)');

    // 8. NOTES WITH TIMESTAMPS (Video seeking testing)
    await prisma.notes.createMany({
        data: [
            {
                user_id: john.id,
                space_id: javaSpace.id,
                lesson_id: javaLesson1.id,
                content: '📌 Đoạn này giải thích rất rõ về cách JVM biên dịch bytecode sang machine code.',
                video_timestamp_sec: 15,
            },
            {
                user_id: john.id,
                space_id: javaSpace.id,
                lesson_id: javaLesson1.id,
                content: '⚠️ Lưu ý: `javac` là compiler, `java` là runtime launcher.',
                video_timestamp_sec: 90,
            },
            {
                user_id: john.id,
                space_id: reactSpaceB.id,
                lesson_id: rLessonB.id,
                content: '💡 Server Actions không cần tạo API route trung gian, gọi trực tiếp từ client form.',
                video_timestamp_sec: 180,
            },
            {
                user_id: alice.id,
                space_id: tsSpace.id,
                lesson_id: tsLesson1.id,
                content: '🚀 Dùng `as const` để bảo toàn literal types.',
                video_timestamp_sec: 45,
            },
        ],
    });
    console.log('✅ Notes with video seek timestamps created');

    // 9. LEARNING PROGRESS (Completed, In-progress, Quiz scores)
    // John completed Java Lesson 1
    await prisma.learning_progress.create({
        data: {
            user_id: john.id,
            space_id: javaSpace.id,
            lesson_id: javaLesson1.id,
            is_finished: true,
            video_last_position: 180,
        },
    });

    // John scored 100% on Java Quiz Lesson 2
    await prisma.learning_progress.create({
        data: {
            user_id: john.id,
            space_id: javaSpace.id,
            lesson_id: javaLesson2.id,
            is_finished: true,
            quiz_max_score: 100,
            quiz_start_time: new Date(now.getTime() - 3600 * 1000),
        },
    });

    // John is currently watching React Lesson (In-progress at 145s)
    await prisma.learning_progress.create({
        data: {
            user_id: john.id,
            space_id: reactSpaceB.id,
            lesson_id: rLessonB.id,
            is_finished: false,
            video_last_position: 145,
        },
    });

    // Alice is in progress on TypeScript
    await prisma.learning_progress.create({
        data: {
            user_id: alice.id,
            space_id: tsSpace.id,
            lesson_id: tsLesson1.id,
            is_finished: false,
            video_last_position: 78,
        },
    });

    console.log('✅ Learning progress created (completed, in-progress, quiz scores)');

    console.log('\n🎉 Comprehensive database seeding completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST DATA OVERVIEW:');
    console.log('👤 Users:');
    console.log('   - John Doe: john@gmail.com / password123 (50 Credits, Stripe ID, Active progress)');
    console.log('   - Jack Smith: jack@gmail.com / password123 (Creator, 10 Credits, Space Author)');
    console.log('   - Alice Johnson: alice@gmail.com / password123 (BYOK User, TypeScript Creator)');
    console.log('   - Bob Newbie: bob@gmail.com / password123 (Status: PENDING, Valid Activation Token)');
    console.log('   - Trọng Tín (Admin): admin1@gmail.com / password123');
    console.log('\n🤖 AI Generations & Economics (ai_generations):');
    console.log('   - SHARED_FREE Cache Hit (Summary & Quiz): Ready on Java Source');
    console.log('   - BYOK Shared Summary: Ready on TypeScript Source');
    console.log('   - PAID_TIER Private Generation: Ready on React Source');
    console.log('   - FAILED Generation: 429 Rate Limit error sample');
    console.log('   - PENDING Generation: Async in-progress sample');
    console.log('\n🔗 Multi-tier Clone Lineage (Fork Tree):');
    console.log(`   - Root: Jack's React Space (ID: ${reactSpaceA.id})`);
    console.log(`   - Fork Level 1: John's Clone (ID: ${reactSpaceB.id})`);
    console.log(`   - Fork Level 2: Alice's Clone of John's Clone (ID: ${reactSpaceC.id})`);
    console.log('\n📝 Rich Notes with Video Timestamps:');
    console.log('   - Java lesson (15s, 90s), React lesson (180s), TypeScript lesson (45s)');
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

