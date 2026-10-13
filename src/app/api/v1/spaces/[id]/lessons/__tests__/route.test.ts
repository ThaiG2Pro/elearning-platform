import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/shared/middleware/auth', () => ({
    getUserIdFromRequest: vi.fn(),
}));

const mockGetSpaceDetail = vi.fn();
vi.mock('@/modules/space-management/controllers/SpaceController', () => ({
    SpaceController: class {
        getSpaceDetail = mockGetSpaceDetail;
    },
}));

const mockFindByUserAndSpace = vi.fn();
vi.mock('@/modules/space-management/repositories/LearningProgressRepository', () => ({
    LearningProgressRepository: class {
        findByUserAndSpace = mockFindByUserAndSpace;
    },
}));

import { GET } from '../route';
import { getUserIdFromRequest } from '@/shared/middleware/auth';

describe('GET /api/v1/spaces/[id]/lessons', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 401 when user is not authenticated', async () => {
        vi.mocked(getUserIdFromRequest).mockResolvedValue(null);
        const req = new NextRequest('http://localhost:3000/api/v1/spaces/10/lessons');
        const res = await GET(req, { params: Promise.resolve({ id: '10' }) });
        expect(res.status).toBe(401);
    });

    it('returns 404 when space id is invalid', async () => {
        const req = new NextRequest('http://localhost:3000/api/v1/spaces/invalid/lessons');
        const res = await GET(req, { params: Promise.resolve({ id: 'invalid' }) });
        expect(res.status).toBe(404);
    });

    it('returns 403 when user is not the owner', async () => {
        vi.mocked(getUserIdFromRequest).mockResolvedValue(1n);
        mockGetSpaceDetail.mockResolvedValue({ id: 10n, isOwner: false });

        const req = new NextRequest('http://localhost:3000/api/v1/spaces/10/lessons');
        const res = await GET(req, { params: Promise.resolve({ id: '10' }) });
        expect(res.status).toBe(403);
    });

    it('batches progress retrieval using a single findByUserAndSpace call', async () => {
        vi.mocked(getUserIdFromRequest).mockResolvedValue(1n);
        mockGetSpaceDetail.mockResolvedValue({
            id: 10n,
            isOwner: true,
            chapters: [
                {
                    id: 101n,
                    title: 'Chapter 1',
                    orderIndex: 0,
                    lessons: [
                        { id: 1001n, title: 'Lesson 1', type: 'VIDEO', orderIndex: 0, contentUrl: 'url1' },
                        { id: 1002n, title: 'Lesson 2', type: 'VIDEO', orderIndex: 1, contentUrl: 'url2' },
                    ],
                },
                {
                    id: 102n,
                    title: 'Chapter 2',
                    orderIndex: 1,
                    lessons: [
                        { id: 1003n, title: 'Lesson 3', type: 'QUIZ', orderIndex: 0, contentUrl: '' },
                    ],
                },
            ],
        });

        // Lesson 1001 is finished, others are not
        mockFindByUserAndSpace.mockResolvedValue([
            { lessonId: 1001n, isFinished: true },
        ]);

        const req = new NextRequest('http://localhost:3000/api/v1/spaces/10/lessons');
        const res = await GET(req, { params: Promise.resolve({ id: '10' }) });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveLength(3);

        // Verify single batch query
        expect(mockFindByUserAndSpace).toHaveBeenCalledTimes(1);
        expect(mockFindByUserAndSpace).toHaveBeenCalledWith(1n, 10n);

        // Verify mapped data
        expect(data[0]).toMatchObject({
            id: '1001',
            title: 'Lesson 1',
            isCompleted: true,
        });
        expect(data[1]).toMatchObject({
            id: '1002',
            title: 'Lesson 2',
            isCompleted: false,
        });
        expect(data[2]).toMatchObject({
            id: '1003',
            title: 'Lesson 3',
            isCompleted: false,
        });
    });
});
