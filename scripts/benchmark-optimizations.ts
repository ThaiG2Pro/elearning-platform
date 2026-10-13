import { PrismaClient, Prisma } from '@prisma/client';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
    scale: number;
    before: {
        queryCount: number;
        dbTimeMs: number;
        overheadMs: number;
        totalMs: number;
    };
    after: {
        queryCount: number;
        dbTimeMs: number;
        overheadMs: number;
        totalMs: number;
    };
    speedup: number;
}

class BenchmarkRunner {
    private prisma: PrismaClient;
    private queryCount: number = 0;
    private dbTimeMs: number = 0;
    private isMeasuring: boolean = false;

    constructor() {
        this.prisma = new PrismaClient({
            log: [{ emit: 'event', level: 'query' }],
        });

        (this.prisma as any).$on('query', (e: { duration: number }) => {
            if (this.isMeasuring) {
                this.queryCount++;
                this.dbTimeMs += e.duration;
            }
        });
    }

    async init() {
        await this.prisma.$connect();
    }

    async cleanup() {
        await this.prisma.$disconnect();
    }

    private startMeasure() {
        this.queryCount = 0;
        this.dbTimeMs = 0;
        this.isMeasuring = true;
    }

    private stopMeasure(startTotal: number) {
        const totalMs = performance.now() - startTotal;
        this.isMeasuring = false;
        const overheadMs = Math.max(0, totalMs - this.dbTimeMs);
        return {
            queryCount: this.queryCount,
            dbTimeMs: Math.round(this.dbTimeMs * 100) / 100,
            overheadMs: Math.round(overheadMs * 100) / 100,
            totalMs: Math.round(totalMs * 100) / 100,
        };
    }

    async measure(fn: () => Promise<void>) {
        // Warm up 1 iteration
        await fn();

        // Run 5 iterations and average
        const iters = 5;
        let totalQ = 0;
        let totalDb = 0;
        let totalTime = 0;

        for (let i = 0; i < iters; i++) {
            this.startMeasure();
            const start = performance.now();
            await fn();
            const m = this.stopMeasure(start);
            totalQ += m.queryCount;
            totalDb += m.dbTimeMs;
            totalTime += m.totalMs;
        }

        const avgQ = Math.round(totalQ / iters);
        const avgDb = Math.round((totalDb / iters) * 100) / 100;
        const avgTotal = Math.round((totalTime / iters) * 100) / 100;
        const avgOverhead = Math.round(Math.max(0, avgTotal - avgDb) * 100) / 100;

        return {
            queryCount: avgQ,
            dbTimeMs: avgDb,
            overheadMs: avgOverhead,
            totalMs: avgTotal,
        };
    }

    getPrisma() {
        return this.prisma;
    }
}

async function run() {
    console.log('='.repeat(80));
    console.log('⚡ KHỞI ĐỘNG HỆ THỐNG BENCHMARK TỰ ĐỘNG PHÂN RÃ HIỆU NĂNG ⚡');
    console.log('PostgreSQL Database: localhost:15432 (Docker)');
    console.log('Phân rã: Query Count (Q), DB Query Time (T_db), Network & App Overhead, Total Time');
    console.log('='.repeat(80));

    const runner = new BenchmarkRunner();
    await runner.init();
    const prisma = runner.getPrisma();

    // Create a benchmark test user
    const userEmail = `bench_${Date.now()}@test.com`;
    const user = await prisma.users.create({
        data: {
            email: userEmail,
            password_hash: 'hash',
            full_name: 'Benchmark User',
            role: 'STUDENT',
            status: 'ACTIVE',
        },
    });

    try {
        // =====================================================================
        // TEST 1: GET /api/v1/spaces/[id]/lessons (N+1 Query Waterfall)
        // =====================================================================
        console.log('\n' + '#'.repeat(80));
        console.log('📊 TEST 1: GET /api/v1/spaces/[id]/lessons (N+1 Progress List Query)');
        console.log('Kịch bản: Tăng dần số lượng bài học N = [5, 15, 30, 60, 100]');
        console.log('Trước Fix: Vòng lặp N câu findByStudentAndLesson (SELECT ... WHERE user_id AND lesson_id)');
        console.log('Sau Fix: 1 câu query duy nhất findByUserAndSpace (WHERE user_id AND space_id) + in-memory Map');
        console.log('#'.repeat(80));

        const scales1 = [5, 15, 30, 60, 100];
        const results1: BenchmarkResult[] = [];

        for (const N of scales1) {
            // Seed a space with N lessons and user progress
            const space = await prisma.spaces.create({
                data: {
                    owner_id: user.id,
                    title: `Bench Space N=${N}`,
                    slug: `bench-space-${N}-${Date.now()}`,
                    status: 'ACTIVE',
                    chapters: {
                        create: [
                            {
                                title: `Chapter for N=${N}`,
                                order_index: 0,
                                lessons: {
                                    create: Array.from({ length: N }, (_, i) => ({
                                        title: `Lesson ${i + 1}`,
                                        type: 'VIDEO',
                                        order_index: i,
                                        content_url: 'https://youtube.com/watch?v=abc',
                                    })),
                                },
                            },
                        ],
                    },
                },
                include: { chapters: { include: { lessons: true } } },
            });

            const lessonIds = space.chapters[0].lessons.map(l => l.id);

            // Create progress for 50% of the lessons
            await prisma.learning_progress.createMany({
                data: lessonIds.slice(0, Math.ceil(N / 2)).map(lid => ({
                    user_id: user.id,
                    space_id: space.id,
                    lesson_id: lid,
                    is_finished: true,
                })),
            });

            // BEFORE FIX
            const beforeMetrics = await runner.measure(async () => {
                const lessons = [];
                for (const ch of space.chapters) {
                    for (const l of ch.lessons) {
                        const progress = await prisma.learning_progress.findFirst({
                            where: { user_id: user.id, lesson_id: l.id },
                        });
                        lessons.push({ id: l.id, isCompleted: !!progress?.is_finished });
                    }
                }
            });

            // AFTER FIX
            const afterMetrics = await runner.measure(async () => {
                const progresses = await prisma.learning_progress.findMany({
                    where: { user_id: user.id, space_id: space.id },
                });
                const map = new Map(progresses.map(p => [p.lesson_id.toString(), p.is_finished]));
                const lessons = [];
                for (const ch of space.chapters) {
                    for (const l of ch.lessons) {
                        lessons.push({ id: l.id, isCompleted: !!map.get(l.id.toString()) });
                    }
                }
            });

            const speedup = Math.round((beforeMetrics.totalMs / Math.max(0.01, afterMetrics.totalMs)) * 10) / 10;
            results1.push({ scale: N, before: beforeMetrics, after: afterMetrics, speedup });

            // Clean up space
            await prisma.spaces.delete({ where: { id: space.id } });
        }

        printTable(results1, 'Số bài học (N)');

        // =====================================================================
        // TEST 2: SpaceService.getCompanions (Progress Batching: 2N Queries vs SQL Batch)
        // =====================================================================
        console.log('\n' + '#'.repeat(80));
        console.log('📊 TEST 2: SpaceService.getCompanions (Progress Batching)');
        console.log('Kịch bản: Tăng dần số lượng Spaces trong lineage N = [5, 10, 20, 35]');
        console.log('Trước Fix: Mỗi space gọi getSpaceProgress -> 2 câu SQL riêng biệt (Tổng 2N queries)');
        console.log('Sau Fix: 1 câu query SQL gom IN + GROUP BY duy nhất');
        console.log('#'.repeat(80));

        const scales2 = [5, 10, 20, 35];
        const results2: BenchmarkResult[] = [];

        for (const N of scales2) {
            const spaceIds: bigint[] = [];
            for (let i = 0; i < N; i++) {
                const sp = await prisma.spaces.create({
                    data: {
                        owner_id: user.id,
                        title: `Lineage Space ${i}`,
                        slug: `lineage-sp-${N}-${i}-${Date.now()}`,
                        status: 'ACTIVE',
                        chapters: {
                            create: [{
                                title: 'Ch 1',
                                order_index: 0,
                                lessons: {
                                    create: [
                                        { title: 'L1', type: 'VIDEO', order_index: 0 },
                                        { title: 'L2', type: 'VIDEO', order_index: 1 },
                                    ],
                                },
                            }],
                        },
                    },
                    include: { chapters: { include: { lessons: true } } },
                });
                spaceIds.push(sp.id);

                await prisma.learning_progress.create({
                    data: {
                        user_id: user.id,
                        space_id: sp.id,
                        lesson_id: sp.chapters[0].lessons[0].id,
                        is_finished: true,
                    },
                });
            }

            // BEFORE FIX: 2 queries per space (lessons count + progress count)
            const beforeMetrics = await runner.measure(async () => {
                const map = new Map<string, number>();
                for (const sid of spaceIds) {
                    const lessons = await prisma.lessons.findMany({
                        where: { chapter: { space_id: sid } },
                        select: { id: true },
                    });
                    const progresses = await prisma.learning_progress.findMany({
                        where: { user_id: user.id, space_id: sid },
                    });
                    const total = lessons.length;
                    const finished = progresses.filter(p => p.is_finished).length;
                    map.set(sid.toString(), total > 0 ? Math.round((finished / total) * 100) : 0);
                }
            });

            // AFTER FIX: Single SQL query with IN and GROUP BY
            const afterMetrics = await runner.measure(async () => {
                const rows = await prisma.$queryRaw<{ space_id: bigint; completion_rate: number }[]>`
                    SELECT
                        s.id AS space_id,
                        CASE 
                            WHEN COUNT(DISTINCT l.id) > 0 
                            THEN ROUND((COUNT(DISTINCT CASE WHEN lp.is_finished = true THEN l.id END)::numeric / COUNT(DISTINCT l.id)::numeric) * 100)::int
                            ELSE 0 
                        END AS completion_rate
                    FROM spaces s
                    LEFT JOIN chapters c ON c.space_id = s.id
                    LEFT JOIN lessons l ON l.chapter_id = c.id
                    LEFT JOIN learning_progress lp 
                        ON lp.space_id = s.id 
                       AND lp.user_id = s.owner_id 
                       AND lp.lesson_id = l.id
                    WHERE s.id IN (${Prisma.join(spaceIds)})
                    GROUP BY s.id
                `;
                const map = new Map(rows.map(r => [r.space_id.toString(), Number(r.completion_rate)]));
                if (!map) throw new Error();
            });

            const speedup = Math.round((beforeMetrics.totalMs / Math.max(0.01, afterMetrics.totalMs)) * 10) / 10;
            results2.push({ scale: N, before: beforeMetrics, after: afterMetrics, speedup });

            // Clean up
            await prisma.spaces.deleteMany({ where: { id: { in: spaceIds } } });
        }

        printTable(results2, 'Số Spaces (N)');

        // =====================================================================
        // TEST 3: SpaceRepository.findLineageSpaces (Tree Traversal: While Loop vs Root Pointer)
        // =====================================================================
        console.log('\n' + '#'.repeat(80));
        console.log('📊 TEST 3: SpaceRepository.findLineageSpaces (Tree Traversal)');
        console.log('Kịch bản: Tăng dần độ sâu cây phả hệ (Depth D = [2, 5, 10, 20])');
        console.log('Trước Fix: Vòng lặp while leo lên tìm root + while BFS duyệt con cháu');
        console.log('Sau Fix: Truy vấn phẳng 100% O(1) qua trường root_space_id');
        console.log('#'.repeat(80));

        const scales3 = [2, 5, 10, 20];
        const results3: BenchmarkResult[] = [];

        for (const Depth of scales3) {
            // Seed a chain of clones: Root -> C1 -> C2 -> ... -> CD
            const root = await prisma.spaces.create({
                data: {
                    owner_id: user.id,
                    title: `Root Space D=${Depth}`,
                    slug: `root-d-${Depth}-${Date.now()}`,
                    status: 'ACTIVE',
                },
            });

            let parentId = root.id;
            const allIds = [root.id];

            for (let d = 1; d <= Depth; d++) {
                const child = await prisma.spaces.create({
                    data: {
                        owner_id: user.id,
                        title: `Clone Level ${d}`,
                        slug: `clone-d${Depth}-lvl${d}-${Date.now()}`,
                        status: 'ACTIVE',
                        cloned_from_space_id: parentId,
                        root_space_id: root.id,
                    },
                });
                parentId = child.id;
                allIds.push(child.id);
            }

            // Test query starting from the deepest child
            const leafId = parentId;

            // BEFORE FIX: while loop climbing up to root + BFS down
            const beforeMetrics = await runner.measure(async () => {
                const start = await prisma.spaces.findUnique({ where: { id: leafId } });
                let pId = start?.cloned_from_space_id;
                let foundRoot = start?.id;
                const visited = new Set<string>();
                if (start?.id) visited.add(start.id.toString());

                while (pId && !visited.has(pId.toString())) {
                    visited.add(pId.toString());
                    foundRoot = pId;
                    const p = await prisma.spaces.findUnique({ where: { id: pId } });
                    pId = p?.cloned_from_space_id;
                }

                // BFS down
                let frontier = foundRoot ? [foundRoot] : [];
                const members = [];
                while (frontier.length > 0) {
                    const children = await prisma.spaces.findMany({
                        where: { cloned_from_space_id: { in: frontier } },
                        select: { id: true, cloned_from_space_id: true },
                    });
                    members.push(...children);
                    frontier = children.map(c => c.id);
                }
            });

            // AFTER FIX: single flat query via root_space_id
            const afterMetrics = await runner.measure(async () => {
                const start = await prisma.spaces.findUnique({
                    where: { id: leafId },
                    select: { id: true, root_space_id: true, cloned_from_space_id: true },
                });
                const rId = start?.root_space_id ?? start?.id;
                const members = await prisma.spaces.findMany({
                    where: {
                        OR: [{ id: rId }, { root_space_id: rId }],
                    },
                    select: { id: true, owner_id: true, status: true },
                });
                if (!members) throw new Error();
            });

            const speedup = Math.round((beforeMetrics.totalMs / Math.max(0.01, afterMetrics.totalMs)) * 10) / 10;
            results3.push({ scale: Depth, before: beforeMetrics, after: afterMetrics, speedup });

            // Clean up
            await prisma.spaces.deleteMany({ where: { id: { in: allIds } } });
        }

        printTable(results3, 'Độ sâu cây (Depth)');

        // =====================================================================
        // TEST 4: LessonRepository.syncLessons (Bulk Update: updateMany vs UPDATE FROM VALUES)
        // =====================================================================
        console.log('\n' + '#'.repeat(80));
        console.log('📊 TEST 4: LessonRepository.syncLessons (Bulk Update in Transaction)');
        console.log('Kịch bản: Tăng dần số bài học cần update N = [5, 15, 30, 60, 100]');
        console.log('Trước Fix: Vòng lặp N câu tx.lessons.updateMany trong Interactive Transaction');
        console.log('Sau Fix: 1 câu PostgreSQL UPDATE ... FROM (VALUES ...) qua $executeRaw');
        console.log('#'.repeat(80));

        const scales4 = [5, 15, 30, 60, 100];
        const results4: BenchmarkResult[] = [];

        for (const N of scales4) {
            const space = await prisma.spaces.create({
                data: {
                    owner_id: user.id,
                    title: `Bench Sync N=${N}`,
                    slug: `bench-sync-${N}-${Date.now()}`,
                    status: 'ACTIVE',
                    chapters: {
                        create: [{
                            title: 'Ch 1',
                            order_index: 0,
                            lessons: {
                                create: Array.from({ length: N }, (_, i) => ({
                                    title: `Lesson ${i}`,
                                    type: 'VIDEO',
                                    order_index: i,
                                    content_url: 'https://youtube.com/watch?v=old',
                                })),
                            },
                        }],
                    },
                },
                include: { chapters: { include: { lessons: true } } },
            });

            const chId = space.chapters[0].id;
            const existingLessons = space.chapters[0].lessons.map((l, i) => ({
                id: l.id,
                title: `Updated Title ${i}`,
                orderIndex: i + 1,
                contentUrl: 'https://youtube.com/watch?v=new',
            }));

            // BEFORE FIX: Loop of updateMany in tx
            const beforeMetrics = await runner.measure(async () => {
                await prisma.$transaction(async (tx) => {
                    for (const lesson of existingLessons) {
                        await tx.lessons.updateMany({
                            where: { id: lesson.id, chapter_id: { in: [chId] } },
                            data: {
                                title: lesson.title,
                                order_index: lesson.orderIndex,
                                content_url: lesson.contentUrl,
                            },
                        });
                    }
                });
            });

            // AFTER FIX: PostgreSQL UPDATE ... FROM (VALUES ...) in tx
            const afterMetrics = await runner.measure(async () => {
                await prisma.$transaction(async (tx) => {
                    const values = existingLessons.map((l) =>
                        Prisma.sql`(${l.id}::bigint, ${l.title}::varchar, 'VIDEO'::lesson_type, ${l.orderIndex}::int, ${l.contentUrl}::varchar)`
                    );
                    await tx.$executeRaw`
                        UPDATE lessons AS l
                        SET
                            title = v.title,
                            type = v.type,
                            order_index = v.order_index,
                            content_url = v.content_url
                        FROM (
                            VALUES ${Prisma.join(values)}
                        ) AS v(id, title, type, order_index, content_url)
                        WHERE l.id = v.id
                          AND l.chapter_id IN (${Prisma.join([chId])});
                    `;
                });
            });

            const speedup = Math.round((beforeMetrics.totalMs / Math.max(0.01, afterMetrics.totalMs)) * 10) / 10;
            results4.push({ scale: N, before: beforeMetrics, after: afterMetrics, speedup });

            await prisma.spaces.delete({ where: { id: space.id } });
        }

        printTable(results4, 'Số bài học (N)');

        // =====================================================================
        // TEST 5: SpaceRepository.cloneForOwner (Cascading Loops vs Deep Insert)
        // =====================================================================
        console.log('\n' + '#'.repeat(80));
        console.log('📊 TEST 5: SpaceRepository.cloneForOwner (Deep Clone Space)');
        console.log('Kịch bản: Tăng dần số bài học N = [6, 18, 36, 60] trong 3 chương');
        console.log('Trước Fix: Vồng 3 vòng lặp tx.chapters.create + tx.lessons.create');
        console.log('Sau Fix: 1 lệnh Prisma Deep Insert (Nested Write)');
        console.log('#'.repeat(80));

        const scales5 = [6, 18, 36, 60];
        const results5: BenchmarkResult[] = [];

        for (const N of scales5) {
            const lessonsPerChapter = Math.ceil(N / 3);
            const source = await prisma.spaces.create({
                data: {
                    owner_id: user.id,
                    title: `Source Space N=${N}`,
                    slug: `source-${N}-${Date.now()}`,
                    status: 'ACTIVE',
                    chapters: {
                        create: [0, 1, 2].map(cIdx => ({
                            title: `Chapter ${cIdx + 1}`,
                            order_index: cIdx,
                            lessons: {
                                create: Array.from({ length: lessonsPerChapter }, (_, lIdx) => ({
                                    title: `Ch ${cIdx + 1} Lesson ${lIdx + 1}`,
                                    type: 'VIDEO',
                                    order_index: lIdx,
                                    content_url: 'https://youtube.com/watch?v=clone',
                                })),
                            },
                        })),
                    },
                },
                include: { chapters: { include: { lessons: true } } },
            });

            const createdIds: bigint[] = [];
            // Pre-create recipient users for all measurement iterations to avoid (owner_id, cloned_from_space_id) collision
            const recipientUsers: any[] = [];
            for (let i = 0; i < 20; i++) {
                const u = await prisma.users.create({
                    data: {
                        email: `clone_recip_${N}_${i}_${Date.now()}@test.com`,
                        password_hash: 'hash',
                        full_name: 'Recipient',
                        role: 'STUDENT',
                        status: 'ACTIVE',
                    },
                });
                recipientUsers.push(u);
            }
            let recipIdx = 0;

            // BEFORE FIX: 3-level loops in transaction
            const beforeMetrics = await runner.measure(async () => {
                const targetUser = recipientUsers[recipIdx++];
                const cloned = await prisma.$transaction(async (tx) => {
                    const sp = await tx.spaces.create({
                        data: {
                            owner_id: targetUser.id,
                            title: source.title,
                            slug: `clone-old-${Date.now()}-${Math.random()}`,
                            status: 'ACTIVE',
                            cloned_from_space_id: source.id,
                        },
                    });
                    for (const ch of source.chapters) {
                        const newCh = await tx.chapters.create({
                            data: {
                                space_id: sp.id,
                                title: ch.title,
                                order_index: ch.order_index,
                            },
                        });
                        for (const l of ch.lessons) {
                            await tx.lessons.create({
                                data: {
                                    chapter_id: newCh.id,
                                    title: l.title,
                                    type: l.type,
                                    order_index: l.order_index,
                                    content_url: l.content_url,
                                },
                            });
                        }
                    }
                    return sp;
                });
                createdIds.push(cloned.id);
            });

            // AFTER FIX: Single Prisma Deep Insert
            const afterMetrics = await runner.measure(async () => {
                const targetUser = recipientUsers[recipIdx++];
                const cloned = await prisma.spaces.create({
                    data: {
                        owner_id: targetUser.id,
                        title: source.title,
                        slug: `clone-new-${Date.now()}-${Math.random()}`,
                        status: 'ACTIVE',
                        cloned_from_space_id: source.id,
                        root_space_id: source.id,
                        chapters: {
                            create: source.chapters.map(ch => ({
                                title: ch.title,
                                order_index: ch.order_index,
                                lessons: {
                                    create: ch.lessons.map(l => ({
                                        title: l.title,
                                        type: l.type,
                                        order_index: l.order_index,
                                        content_url: l.content_url,
                                    })),
                                },
                            })),
                        },
                    },
                    select: { id: true },
                });
                createdIds.push(cloned.id);
            });

            const speedup = Math.round((beforeMetrics.totalMs / Math.max(0.01, afterMetrics.totalMs)) * 10) / 10;
            results5.push({ scale: N, before: beforeMetrics, after: afterMetrics, speedup });

            // Cleanup
            await prisma.spaces.deleteMany({ where: { id: { in: createdIds } } });
            await prisma.spaces.delete({ where: { id: source.id } });
            await prisma.users.deleteMany({ where: { id: { in: recipientUsers.map(u => u.id) } } });
        }

        printTable(results5, 'Số bài học (N)');

    } finally {
        // Clean up test user
        await prisma.users.delete({ where: { id: user.id } });
        await runner.cleanup();
    }
}

function printTable(results: BenchmarkResult[], scaleLabel: string) {
    console.log('\n' + '-'.repeat(105));
    console.log(
        `${scaleLabel.padEnd(14)} | ` +
        `BEFORE (Cũ: Q -> T_db + Overhead = Total)`.padEnd(42) + ` | ` +
        `AFTER (Mới: Q -> T_db + Overhead = Total)`.padEnd(42) + ` | Speedup`
    );
    console.log('-'.repeat(105));

    for (const r of results) {
        const b = r.before;
        const a = r.after;

        const bStr = `${b.queryCount}q -> ${b.dbTimeMs}ms + ${b.overheadMs}ms = ${b.totalMs}ms`;
        const aStr = `${a.queryCount}q -> ${a.dbTimeMs}ms + ${a.overheadMs}ms = ${a.totalMs}ms`;

        console.log(
            `${r.scale.toString().padEnd(14)} | ` +
            bStr.padEnd(42) + ` | ` +
            aStr.padEnd(42) + ` | ${r.speedup}x`
        );
    }
    console.log('-'.repeat(105) + '\n');
}

run().catch((err) => {
    console.error('Benchmark error:', err);
    process.exit(1);
});
