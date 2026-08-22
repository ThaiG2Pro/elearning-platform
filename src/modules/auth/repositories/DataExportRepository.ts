import { prisma } from '../../../shared/config/database';

// WP1.5.11 — data-export follow-up. Read-only aggregation across
// space-management tables for the self-service "export my data" feature.
// Deliberately lives in the auth module (not space-management) since it's
// driven by AuthController's user-scoped endpoint, not by space ownership
// checks — every query here is already scoped by owner_id/user_id, so no
// AccessControlPolicy call is needed.
export class DataExportRepository {
    async getOwnedSpacesFullTree(userId: bigint) {
        return prisma.spaces.findMany({
            where: { owner_id: userId },
            orderBy: { created_at: 'asc' },
            include: {
                chapters: {
                    orderBy: { order_index: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { order_index: 'asc' },
                            include: {
                                questions: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async getLearningProgress(userId: bigint) {
        return prisma.learning_progress.findMany({ where: { user_id: userId } });
    }

    async getNotes(userId: bigint) {
        return prisma.notes.findMany({ where: { user_id: userId }, orderBy: { created_at: 'asc' } });
    }
}
