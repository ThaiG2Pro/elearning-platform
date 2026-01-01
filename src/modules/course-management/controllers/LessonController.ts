import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { LessonRepository } from '../repositories/LessonRepository';
import { prisma } from '../../../shared/config/database';

export interface VideoContextDto {
    lessonId: bigint;
    videoUrl: string;
    duration: number;
    lastPosition: number;
    isFinished: boolean;
}

export class LessonController {
    private enrollmentRepo: EnrollmentRepository;
    private lessonRepo: LessonRepository;

    constructor() {
        const enrollmentRepo = new EnrollmentRepository(prisma);
        const lessonRepo = new LessonRepository(prisma);
        this.enrollmentRepo = enrollmentRepo;
        this.lessonRepo = lessonRepo;
    }

    async getVideoContext(userId: bigint, lessonId: bigint): Promise<VideoContextDto> {
        // Check if user is enrolled in the course containing this lesson
        const lesson = await this.lessonRepo.findById(lessonId);
        if (!lesson) {
            throw new Error('LESSON_NOT_FOUND');
        }

        // Find the course ID through the chapter
        const chapter = await prisma.chapters.findUnique({
            where: { id: lesson.chapterId },
            select: { course_id: true }
        });

        if (!chapter) {
            throw new Error('LESSON_NOT_FOUND');
        }

        // Check enrollment
        const enrollment = await this.enrollmentRepo.findByStudentAndCourse(userId, chapter.course_id);
        if (!enrollment) {
            throw new Error('NOT_ENROLLED');
        }

        // Get progress for this lesson
        const progress = await prisma.learning_progress.findFirst({
            where: {
                enrollment_id: enrollment!.id as bigint,
                lesson_id: lessonId
            }
        });

        // Assuming video duration is stored or calculated (placeholder: 600 seconds = 10 minutes)
        const duration = 600; // This should come from lesson metadata
        const lastPosition = progress?.video_last_position || 0;
        const isFinished = progress?.is_finished || false;

        return {
            lessonId,
            videoUrl: lesson.contentUrl || '',
            duration,
            lastPosition,
            isFinished
        };
    }
}
