import { describe, it, expect, vi } from 'vitest';
import { ContentManagementService } from '../ContentManagementService';

// Security fix: content_url (lesson VIDEO/ARTICLE) was written to the DB
// with no scheme validation — a "javascript:" or other non-http(s) URI
// could be persisted and returned verbatim to clients. createLesson/
// updateLesson now reject anything that isn't a well-formed public
// http(s) URL (isPublicHttpUrlSyntax, same guard WebPageAdapter uses).

const OWNER_ID = BigInt(1);
const SECTION_ID = BigInt(20);
const LESSON_ID = BigInt(30);

function makeService() {
    const spaceRepository = {
        findById: vi.fn(async () => null),
        save: vi.fn(async () => undefined),
    };
    const prisma = {
        chapters: {
            findUnique: vi.fn(async ({ where }: any) =>
                where.id === SECTION_ID ? { space: { owner_id: OWNER_ID } } : null),
            create: vi.fn(async ({ data }: any) => ({ id: BigInt(99), ...data })),
        },
        lessons: {
            findUnique: vi.fn(async ({ where }: any) =>
                where.id === LESSON_ID ? { chapter: { space: { owner_id: OWNER_ID } } } : null),
            create: vi.fn(async ({ data }: any) => ({ id: BigInt(100), source_id: null, ...data })),
            update: vi.fn(async ({ data }: any) => ({ id: LESSON_ID, source_id: null, ...data })),
        },
        sources: {
            findUnique: vi.fn(async () => null),
            create: vi.fn(async ({ data }: any) => ({ id: BigInt(200), ...data })),
        },
    };
    return { service: new ContentManagementService(spaceRepository as any, prisma as any), prisma };
}

describe('ContentManagementService — content_url scheme validation', () => {
    it('createLesson rejects a javascript: URI', async () => {
        const { service, prisma } = makeService();
        await expect(service.createLesson(OWNER_ID, SECTION_ID, {
            title: 'ok', type: 'VIDEO', orderIndex: 0, contentUrl: 'javascript:alert(1)',
        } as any)).rejects.toThrow('INVALID_CONTENT_URL');
        expect(prisma.lessons.create).not.toHaveBeenCalled();
    });

    it('createLesson accepts a well-formed https URL', async () => {
        const { service } = makeService();
        await expect(service.createLesson(OWNER_ID, SECTION_ID, {
            title: 'ok', type: 'VIDEO', orderIndex: 0, contentUrl: 'https://example.com/video.mp4',
        } as any)).resolves.toBeDefined();
    });

    it('updateLesson rejects a data: URI', async () => {
        const { service, prisma } = makeService();
        await expect(service.updateLesson(OWNER_ID, LESSON_ID, {
            contentUrl: 'data:text/html,<script>alert(1)</script>',
        } as any)).rejects.toThrow('INVALID_CONTENT_URL');
        expect(prisma.lessons.update).not.toHaveBeenCalled();
    });
});
