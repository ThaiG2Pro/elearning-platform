import { SpaceRepository } from '../repositories/SpaceRepository';
import { LearnService } from './LearnService';
import { SpaceListDto } from '../dtos/SpaceListDto';
import { SpaceDetailDto, ChapterDto, LessonDto } from '../dtos/SpaceDetailDto';
import { CompanionDto } from '../dtos/CompanionDto';
import { VideoThumbnailUtil } from '../../shared/utils/VideoThumbnailUtil';

export class SpaceService {
    constructor(
        private spaceRepository: SpaceRepository,
        // WP1.6 follow-up — the dead `_enrollmentRepository` compatibility
        // param (never read since WP1.5.9's ownership-based access check)
        // was dropped entirely, along with the matching call-site arg in
        // SpaceController.
        private learnService?: LearnService,
    ) { }

    async getSpaces(search?: string): Promise<SpaceListDto[]> {
        const spaces = await this.spaceRepository.findActiveSpacesWithThumbnails(search);

        return spaces.map(space => new SpaceListDto(
            Number(space.id),
            space.title,
            space.slug,
            space.description || '',
            space.thumbnailUrl,
            space.isShowcase,
            space.cloneCount,
            space.clonedFrom,
        ));
    }

    async getSpaceDetail(spaceId: bigint, userId?: bigint): Promise<SpaceDetailDto> {
        const fullSpace = await this.spaceRepository.findByIdWithFullStructure(spaceId);
        if (!fullSpace) {
            throw new Error('SPACE_NOT_FOUND');
        }

        // WP1.5.9 (found while fixing WP1.5.12): access here was still gated
        // by the legacy `enrollments` table, which WP0.2 was supposed to
        // remove from the main flow — a space's own owner has no enrollment
        // row, so GET /spaces/[id]/lessons 403'd for literally every user,
        // including on their own space. Personal-organizer model: a space
        // is accessible to the user who owns it, full stop.
        const isOwner = !!userId && fullSpace.ownerId === userId;

        // Security fix (2026-09-05) — this method used to build and return
        // the full chapters/lessons/contentUrl payload for ANY spaceId, no
        // matter who asked (isOwner was computed but never enforced): an
        // anonymous caller, or any logged-in user, could read a private
        // space's entire content by guessing/enumerating its numeric id.
        // `/spaces/[id]/page.tsx` also uses this same method as the public
        // "preview before Sao chép về học" page reached from the homepage
        // listing or a share link, so non-owners are still let through when
        // the space has actually been shared — never by id alone.
        const isPubliclyShared = fullSpace.status === 'ACTIVE' && !!fullSpace.shareToken;
        if (!isOwner && !isPubliclyShared) {
            // Same message/shape as "doesn't exist" — a 403 would confirm a
            // private space's id is in use, a 404 doesn't.
            throw new Error('SPACE_NOT_FOUND');
        }

        // WP1.3: surface the logged-in user's own progress on space-detail —
        // ownership-based, no enrollment required.
        let completionRate: number | undefined;
        if (userId && this.learnService) {
            const progress = await this.learnService.getSpaceProgress(userId, spaceId);
            completionRate = progress.completionRate;
        }

        const chapters = fullSpace.chapters.map((chapter: any) => {
            const lessons = chapter.lessons.map((lesson: any) => new LessonDto(
                Number(lesson.id),
                lesson.title,
                lesson.type,
                lesson.orderIndex,
                lesson.contentUrl,
                lesson.sourceId ? Number(lesson.sourceId) : null
            ));
            return new ChapterDto(
                Number(chapter.id),
                chapter.title,
                lessons,
                chapter.orderIndex
            );
        });

        return new SpaceDetailDto(
            Number(fullSpace.id),
            fullSpace.title,
            fullSpace.slug,
            fullSpace.description,
            fullSpace.ownerName,
            isOwner,
            chapters,
            VideoThumbnailUtil.findFirstVideoUrl(fullSpace.chapters)
                ? VideoThumbnailUtil.deriveThumbnailFromVideoUrl(
                    VideoThumbnailUtil.findFirstVideoUrl(fullSpace.chapters)!
                )
                : '/images/space-placeholder.svg',
            fullSpace.status,
            completionRate,
            fullSpace.shareToken || fullSpace.share_token || undefined,
            fullSpace.clonedFrom,
        );
    }

    /**
     * WP1.7 — everyone sharing this space's clone lineage (owner-authored
     * root + every clone anyone made of it) with their own completion %.
     * Read-only, and only visible to a caller who is themself a member of
     * that lineage — this is not a public leaderboard.
     */
    async getCompanions(spaceId: bigint, userId: bigint): Promise<CompanionDto[]> {
        const lineage = await this.spaceRepository.findLineageSpaces(spaceId);
        const isMember = lineage.some(member => member.ownerId === userId);
        if (!isMember) {
            throw new Error('FORBIDDEN');
        }

        // Solo — no one else has cloned this space (or its root) yet.
        if (lineage.length <= 1 || !this.learnService) {
            return [];
        }

        const companions = await Promise.all(
            lineage.map(async (member) => {
                const progress = await this.learnService!.getSpaceProgress(member.ownerId, member.id);
                return new CompanionDto(
                    Number(member.id),
                    member.ownerName,
                    progress.completionRate,
                    member.ownerId === userId,
                );
            })
        );

        return companions.sort((a, b) => b.completionRate - a.completionRate);
    }
}
