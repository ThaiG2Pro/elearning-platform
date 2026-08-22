import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { Space, SpaceStatus } from '../domain/Space';
import { Chapter } from '../domain/Chapter';
import { Lesson } from '../domain/Lesson';
import { VideoThumbnailUtil } from '../../shared/utils/VideoThumbnailUtil';
import { AIGenerationPolicy, KeySource } from '../../ai-generation/domain/AIGenerationPolicy';

export class SpaceRepository {
    constructor(private prisma: PrismaClient) { }

    async findById(id: bigint): Promise<Space | null> {
        const space = await this.prisma.spaces.findUnique({
            where: { id },
        });
        if (!space) return null;
        return new Space(
            space.id,
            space.owner_id,
            space.title,
            space.slug,
            space.description,
            space.status as SpaceStatus,
        );
    }

    async findActiveById(id: bigint): Promise<Space | null> {
        const space = await this.prisma.spaces.findFirst({
            where: {
                id,
                status: 'ACTIVE',
            },
        });
        if (!space) return null;
        return new Space(
            space.id,
            space.owner_id,
            space.title,
            space.slug,
            space.description,
            space.status as SpaceStatus,
        );
    }

    async findByIdWithFullStructure(id: bigint): Promise<any> {
        const space = await this.prisma.spaces.findUnique({
            where: { id },
            include: {
                owner: {
                    select: { full_name: true },
                },
                chapters: {
                    include: {
                        lessons: true,
                    },
                    orderBy: { order_index: 'asc' },
                },
            },
        });

        if (!space) return null;

        const chapters = space.chapters.map(chapter => {
            const lessons = chapter.lessons.map(lesson =>
                new Lesson(
                    lesson.id,
                    lesson.chapter_id,
                    lesson.title,
                    lesson.type as any,
                    lesson.content_url || '',
                    lesson.order_index,
                    lesson.source_id
                )
            );
            return new Chapter(
                chapter.id,
                chapter.space_id,
                chapter.title,
                chapter.order_index,
                lessons
            );
        });

        const domainSpace = new Space(
            space.id,
            space.owner_id,
            space.title,
            space.slug,
            space.description,
            space.status as SpaceStatus,
            chapters,
            space.share_token,
        );
        (domainSpace as any).ownerName = space.owner.full_name;
        return domainSpace;
    }

    async findActiveSpacesWithThumbnails(search?: string): Promise<{ id: bigint; title: string; slug: string; description: string | null; thumbnailUrl: string; isShowcase: boolean; cloneCount: number }[]> {
        const where: any = {
            status: 'ACTIVE',
        };

        if (search) {
            where.title = {
                contains: search,
                mode: 'insensitive',
            };
        }

        const spaces = await this.prisma.spaces.findMany({
            where,
            select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                is_showcase: true,
            },
            orderBy: { id: 'desc' },
        });

        const cloneCounts = await this.prisma.spaces.groupBy({
            by: ['cloned_from_space_id'],
            _count: { id: true },
        });
        const cloneCountMap = new Map<string, number>();
        for (const item of cloneCounts) {
            if (item.cloned_from_space_id) {
                cloneCountMap.set(item.cloned_from_space_id.toString(), item._count.id);
            }
        }

        const spacesWithThumbnails = await Promise.all(
            spaces.map(async (space) => {
                const thumbnailUrl = await this.getSpaceThumbnailUrl(space.id);
                return {
                    ...space,
                    isShowcase: space.is_showcase,
                    cloneCount: cloneCountMap.get(space.id.toString()) || 0,
                    thumbnailUrl,
                };
            })
        );

        return spacesWithThumbnails;
    }

    private async getSpaceThumbnailUrl(spaceId: bigint): Promise<string> {
        try {
            const space = await this.prisma.spaces.findUnique({
                where: { id: spaceId },
                include: {
                    chapters: {
                        orderBy: { order_index: 'asc' },
                        include: {
                            lessons: {
                                where: { content_url: { not: null } },
                                orderBy: { order_index: 'asc' },
                            },
                        },
                    },
                },
            });

            if (!space) {
                return '/images/space-placeholder.svg';
            }

            // Find first video URL
            const firstVideoUrl = VideoThumbnailUtil.findFirstVideoUrl(space.chapters);
            if (firstVideoUrl) {
                return VideoThumbnailUtil.deriveThumbnailFromVideoUrl(firstVideoUrl);
            }

            return '/images/space-placeholder.svg';
        } catch (error) {
            console.warn('Error getting space thumbnail:', error);
            return '/images/space-placeholder.svg';
        }
    }

    async create(space: Space): Promise<void> {
        const created = await this.prisma.spaces.create({
            data: {
                owner_id: space.ownerId,
                title: space.title,
                slug: space.slug,
                description: space.description,
                status: space.status,
            },
        });
        space.id = created.id;
    }

    async save(space: Space): Promise<void> {
        if (!space.id) throw new Error('Space ID is required for update');
        await this.prisma.spaces.update({
            where: { id: space.id },
            data: {
                title: space.title,
                slug: space.slug,
                description: space.description,
                status: space.status,
            },
        });
    }

    /**
     * Returns the space's existing share token, generating a stable one on
     * first request. Tokens are opaque (not the numeric id) so a future
     * migration of ids never breaks a link already handed out — required by
     * ROADMAP.md principle #3 (share links must survive upgrades).
     */
    async ensureShareToken(spaceId: bigint): Promise<string> {
        const existing = await this.prisma.spaces.findUnique({
            where: { id: spaceId },
            select: { share_token: true },
        });
        if (!existing) throw new Error('SPACE_NOT_FOUND');
        if (existing.share_token) return existing.share_token;

        // Collisions are astronomically unlikely (10 bytes of randomness) but
        // retry a few times against the unique constraint just in case.
        for (let attempt = 0; attempt < 5; attempt++) {
            const token = randomBytes(10).toString('base64url');
            try {
                await this.prisma.spaces.update({
                    where: { id: spaceId },
                    data: { share_token: token },
                });
                return token;
            } catch (error: any) {
                if (error?.code === 'P2002') continue; // unique violation, retry
                throw error;
            }
        }
        throw new Error('SHARE_TOKEN_GENERATION_FAILED');
    }

    /**
     * WP1.5.11: once shared there was no way to take a link back — clearing
     * the token immediately 404s the old URL (findByShareToken looks it up
     * by token, so a cleared token simply can't be found anymore).
     */
    async clearShareToken(spaceId: bigint): Promise<void> {
        await this.prisma.spaces.update({
            where: { id: spaceId },
            data: { share_token: null },
        });
    }

    /** WP1.5.11: for the "my share links" management screen. */
    async findOwnedWithShareStatus(userId: bigint): Promise<Array<{ id: bigint; title: string; shareToken: string | null }>> {
        const spaces = await this.prisma.spaces.findMany({
            where: { owner_id: userId },
            select: { id: true, title: true, share_token: true },
            orderBy: { id: 'desc' },
        });
        return spaces.map(c => ({ id: c.id, title: c.title, shareToken: c.share_token }));
    }

    /** Public lookup by share token — no ownership check, used by anonymous visitors. */
    async findByShareToken(token: string): Promise<any | null> {
        const space = await this.prisma.spaces.findFirst({
            where: { share_token: token, status: 'ACTIVE' },
            include: {
                owner: { select: { full_name: true } },
                chapters: {
                    include: { lessons: true },
                    orderBy: { order_index: 'asc' },
                },
            },
        });
        if (!space) return null;

        const chapters = space.chapters.map(chapter => {
            const lessons = chapter.lessons.map(lesson =>
                new Lesson(
                    lesson.id,
                    lesson.chapter_id,
                    lesson.title,
                    lesson.type as any,
                    lesson.content_url || '',
                    lesson.order_index
                )
            );
            return new Chapter(chapter.id, chapter.space_id, chapter.title, chapter.order_index, lessons);
        });

        const domainSpace = new Space(
            space.id,
            space.owner_id,
            space.title,
            space.slug,
            space.description,
            space.status as SpaceStatus,
            chapters,
            space.share_token,
        );
        (domainSpace as any).ownerName = space.owner?.full_name || '';
        return domainSpace;
    }

    /**
     * Deep-copies a space (chapters + lessons, reusing the same `Source`
     * rows) into a brand new space owned by `newOwnerId`. Used by "Sao chép
     * về học" on a shared space — the copy is fully independent afterwards,
     * so editing/archiving it never touches the original owner's space.
     */
    async cloneForOwner(spaceId: bigint, newOwnerId: bigint): Promise<bigint> {
        const source = await this.prisma.spaces.findUnique({
            where: { id: spaceId },
            include: {
                chapters: {
                    include: {
                        // WP3.2 — cần key_source của bản AIGeneration đã gán để
                        // quyết định có kế thừa qua clone hay không (mục 5 fix
                        // free-rider: PAID_TIER không bao giờ được kế thừa).
                        // questions: bản copy phải mang theo câu hỏi quiz —
                        // lesson QUIZ mà rỗng ruột thì copy vô nghĩa. Câu hỏi là
                        // nội dung đã "vật chất hoá" (kể cả gốc từ AI), copy
                        // nguyên vẹn, không dính luật kế thừa ai_generation ở trên.
                        lessons: {
                            include: {
                                ai_generation: { select: { key_source: true } },
                                questions: true,
                            },
                        },
                    },
                    orderBy: { order_index: 'asc' },
                },
            },
        });
        if (!source) throw new Error('SPACE_NOT_FOUND');

        // Fast path 1: owner cannot clone their own space — return source.id
        if (source.owner_id === newOwnerId) {
            return source.id;
        }

        // Fast path 2: direct clone check (idempotency)
        const existingClone = await this.prisma.spaces.findFirst({
            where: { owner_id: newOwnerId, cloned_from_space_id: spaceId },
            select: { id: true },
        });
        if (existingClone) return existingClone.id;

        // Fast path 3: lineage check — if newOwnerId already owns a space in this lineage, reuse it
        const lineage = await this.findLineageSpaces(spaceId);
        const existingInLineage = lineage.find(m => m.ownerId === newOwnerId);
        if (existingInLineage) return existingInLineage.id;

        const baseSlug = source.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const suffix = randomBytes(4).toString('hex');
        const slug = `${baseSlug}-${suffix}`;

        try {
            return await this.prisma.$transaction(async (tx) => {
                const created = await tx.spaces.create({
                    data: {
                        owner_id: newOwnerId,
                        title: source.title,
                        slug,
                        description: source.description,
                        status: 'ACTIVE',
                        cloned_from_space_id: spaceId,
                        source_id: source.source_id,
                    },
                });

                for (const chapter of source.chapters) {
                    const newChapter = await tx.chapters.create({
                        data: {
                            space_id: created.id,
                            title: chapter.title,
                            order_index: chapter.order_index,
                        },
                    });

                    for (const lesson of chapter.lessons) {
                        // WP3.2/mục 5 economics doc — kế thừa AIGeneration đã
                        // gán qua clone, TRỪ bản PAID_TIER (free-rider fix:
                        // người fork phải tự tạo lại nếu muốn bản tương
                        // đương, không được "thừa hưởng" bản người khác đã
                        // trả tiền).
                        const inheritedAiGenerationId =
                            lesson.ai_generation_id !== null &&
                            AIGenerationPolicy.inheritOnClone((lesson.ai_generation?.key_source as KeySource) ?? null)
                                ? lesson.ai_generation_id
                                : null;

                        const newLesson = await tx.lessons.create({
                            data: {
                                chapter_id: newChapter.id,
                                source_id: lesson.source_id,
                                title: lesson.title,
                                type: lesson.type,
                                content_url: lesson.content_url,
                                order_index: lesson.order_index,
                                ai_generation_id: inheritedAiGenerationId,
                            },
                        });

                        if (lesson.questions.length > 0) {
                            await tx.questions.createMany({
                                data: lesson.questions.map((q) => ({
                                    lesson_id: newLesson.id,
                                    content: q.content,
                                    answer_key: q.answer_key,
                                    // Json column: JsonValue đọc ra có thể là null
                                    // theo type Prisma, nhưng cột NOT NULL nên
                                    // fallback [] không bao giờ chạy trong thực tế.
                                    options: q.options ?? [],
                                })),
                            });
                        }
                    }
                }

                return created.id;
            });
        } catch (error: any) {
            // P2002 = unique violation on (owner_id, cloned_from_space_id) —
            // a concurrent request (double-submit/double-fire) won the race
            // and created the clone first. Return that one instead of erroring.
            if (error?.code === 'P2002') {
                const raceWinner = await this.prisma.spaces.findFirst({
                    where: { owner_id: newOwnerId, cloned_from_space_id: spaceId },
                    select: { id: true },
                });
                if (raceWinner) return raceWinner.id;
            }
            throw error;
        }
    }

    /**
     * WP1.7 — every space sharing this space's clone lineage: the root
     * (owner-authored space, possibly itself) plus every clone anyone made
     * of it, at any generation. Walks up `cloned_from_space_id` to find the
     * root, then BFS's back down — cloning a clone is possible (share a
     * clone → someone else clones it), so this isn't just one level deep.
     */
    async findLineageSpaces(spaceId: bigint): Promise<{ id: bigint; ownerId: bigint; ownerName: string }[]> {
        const start = await this.prisma.spaces.findUnique({
            where: { id: spaceId },
            select: { id: true, cloned_from_space_id: true },
        });
        if (!start) return [];

        // Walk up to the root. `visited` guards against a corrupt cycle.
        const visited = new Set<string>([start.id.toString()]);
        let rootId = start.id;
        let parentId = start.cloned_from_space_id;
        while (parentId && !visited.has(parentId.toString())) {
            visited.add(parentId.toString());
            rootId = parentId;
            const parent = await this.prisma.spaces.findUnique({
                where: { id: parentId },
                select: { cloned_from_space_id: true },
            });
            if (!parent) break;
            parentId = parent.cloned_from_space_id;
        }

        const members = new Map<string, { id: bigint; ownerId: bigint; ownerName: string }>();
        const root = await this.prisma.spaces.findUnique({
            where: { id: rootId },
            select: { id: true, owner_id: true, owner: { select: { full_name: true } } },
        });
        if (!root) return [];
        members.set(root.id.toString(), { id: root.id, ownerId: root.owner_id, ownerName: root.owner.full_name });

        let frontier = [root.id];
        while (frontier.length > 0) {
            const children = await this.prisma.spaces.findMany({
                where: { cloned_from_space_id: { in: frontier } },
                select: { id: true, owner_id: true, owner: { select: { full_name: true } } },
            });
            frontier = [];
            for (const child of children) {
                const key = child.id.toString();
                if (members.has(key)) continue;
                members.set(key, { id: child.id, ownerId: child.owner_id, ownerName: child.owner.full_name });
                frontier.push(child.id);
            }
        }

        return Array.from(members.values());
    }
}
