import { describe, it, expect, vi } from 'vitest';
import { ContentManagementService } from '../ContentManagementService';
import { Space, SpaceStatus } from '../../domain/Space';
import { FIELD_LIMITS } from '../../../../shared/validation/fieldLimits';

// Security fix: title (spaces/chapters/lessons) and content_url had no
// app-layer length guard before hitting Prisma — an oversized value fell
// through to a raw Postgres "value too long" error instead of a clean
// 400. These tests pin the new guards in ContentManagementService.

const OWNER_ID = BigInt(1);
const OTHER_USER_ID = BigInt(2);
const SPACE_ID = BigInt(10);
const SECTION_ID = BigInt(20);
const LESSON_ID = BigInt(30);

function makeSpace() {
    return new Space(SPACE_ID, OWNER_ID, 'My space', 'my-space', null, SpaceStatus.ACTIVE, []);
}

function makeService() {
    const spaceRepository = {
        findById: vi.fn(async (id: bigint) => (id === SPACE_ID ? makeSpace() : null)),
        save: vi.fn(async () => undefined),
    };
    const prisma = {
        chapters: {
            findUnique: vi.fn(async ({ where }: any) =>
                where.id === SECTION_ID ? { space: { owner_id: OWNER_ID } } : null),
            create: vi.fn(async ({ data }: any) => ({ id: BigInt(99), ...data })),
            update: vi.fn(async ({ data }: any) => ({ id: SECTION_ID, ...data })),
        },
        lessons: {
            findUnique: vi.fn(async ({ where }: any) =>
                where.id === LESSON_ID ? { chapter: { space: { owner_id: OWNER_ID } } } : null),
            create: vi.fn(async ({ data }: any) => ({ id: BigInt(100), source_id: null, ...data })),
            update: vi.fn(async ({ data }: any) => ({ id: LESSON_ID, source_id: null, ...data })),
        },
    };
    return { service: new ContentManagementService(spaceRepository as any, prisma as any), prisma };
}

describe('ContentManagementService — field length limits', () => {
    it('createSection rejects a title over the DB limit and writes nothing', async () => {
        const { service, prisma } = makeService();
        const tooLong = 'a'.repeat(FIELD_LIMITS.TITLE + 1);
        await expect(service.createSection(OWNER_ID, SPACE_ID, { title: tooLong, orderIndex: 0 } as any))
            .rejects.toThrow('TITLE_TOO_LONG');
        expect(prisma.chapters.create).not.toHaveBeenCalled();
    });

    it('createSection accepts a title exactly at the DB limit', async () => {
        const { service } = makeService();
        const atLimit = 'a'.repeat(FIELD_LIMITS.TITLE);
        await expect(service.createSection(OWNER_ID, SPACE_ID, { title: atLimit, orderIndex: 0 } as any))
            .resolves.toBeDefined();
    });

    it('updateSection rejects an over-limit title', async () => {
        const { service, prisma } = makeService();
        const tooLong = 'a'.repeat(FIELD_LIMITS.TITLE + 1);
        await expect(service.updateSection(OWNER_ID, SECTION_ID, { title: tooLong } as any))
            .rejects.toThrow('TITLE_TOO_LONG');
        expect(prisma.chapters.update).not.toHaveBeenCalled();
    });

    it('createLesson rejects an over-limit title', async () => {
        const { service, prisma } = makeService();
        const tooLong = 'a'.repeat(FIELD_LIMITS.TITLE + 1);
        await expect(service.createLesson(OWNER_ID, SECTION_ID, { title: tooLong, type: 'VIDEO', orderIndex: 0 } as any))
            .rejects.toThrow('TITLE_TOO_LONG');
        expect(prisma.lessons.create).not.toHaveBeenCalled();
    });

    it('createLesson rejects an over-limit contentUrl', async () => {
        const { service, prisma } = makeService();
        const tooLongUrl = 'https://example.com/' + 'a'.repeat(FIELD_LIMITS.URL);
        await expect(service.createLesson(OWNER_ID, SECTION_ID, { title: 'ok', type: 'VIDEO', orderIndex: 0, contentUrl: tooLongUrl } as any))
            .rejects.toThrow('URL_TOO_LONG');
        expect(prisma.lessons.create).not.toHaveBeenCalled();
    });

    it('updateLesson rejects an over-limit title or contentUrl', async () => {
        const { service, prisma } = makeService();
        const tooLong = 'a'.repeat(FIELD_LIMITS.TITLE + 1);
        await expect(service.updateLesson(OWNER_ID, LESSON_ID, { title: tooLong } as any))
            .rejects.toThrow('TITLE_TOO_LONG');
        expect(prisma.lessons.update).not.toHaveBeenCalled();
    });

    it('createSpace rejects an over-limit title before any DB write', async () => {
        const { service } = makeService();
        const tooLong = 'a'.repeat(FIELD_LIMITS.TITLE + 1);
        // prisma.$transaction isn't mocked here — the guard must throw
        // before createSpace ever reaches it.
        await expect(service.createSpace(OWNER_ID, { title: tooLong } as any))
            .rejects.toThrow('TITLE_TOO_LONG');
    });

    it('updateSpaceMetadata rejects an over-limit title and refuses non-owners as before', async () => {
        const { service } = makeService();
        const tooLong = 'a'.repeat(FIELD_LIMITS.TITLE + 1);
        await expect(service.updateSpaceMetadata(OWNER_ID, SPACE_ID, { title: tooLong }))
            .rejects.toThrow('TITLE_TOO_LONG');
        await expect(service.updateSpaceMetadata(OTHER_USER_ID, SPACE_ID, { title: 'ok' }))
            .rejects.toThrow('ACCESS_DENIED');
    });
});
