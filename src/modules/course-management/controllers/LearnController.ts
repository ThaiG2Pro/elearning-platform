import { LearnService } from '../services/LearnService';
import { NoteService, NoteView } from '../services/NoteService';
import { LearningProgressRepository } from '../repositories/LearningProgressRepository';
import { EnrollmentRepository } from '../repositories/EnrollmentRepository';
import { NoteRepository } from '../repositories/NoteRepository';
import { ProgressResult } from '../dtos/ProgressResult';
import { prisma } from '../../../shared/config/database';

export class LearnController {
    private service: LearnService;
    private noteService: NoteService;

    constructor() {
        const progressRepo = new LearningProgressRepository(prisma);
        const enrollmentRepo = new EnrollmentRepository(prisma);
        const noteRepo = new NoteRepository(prisma);
        this.service = new LearnService(progressRepo, enrollmentRepo, prisma);
        this.noteService = new NoteService(noteRepo, enrollmentRepo, prisma);
    }

    async trackVideoProgress(
        userId: bigint,
        lessonId: bigint,
        position: number,
        duration: number,
        isPreview: boolean = false
    ): Promise<ProgressResult> {
        return await this.service.trackVideoProgress(userId, lessonId, position, duration, isPreview);
    }

    async getProgress(userId: bigint, lessonId: bigint): Promise<{ currentPosition: number; isCompleted: boolean; lastAccessedAt: string } | null> {
        return await this.service.getProgress(userId, lessonId);
    }

    async getCourseProgress(userId: bigint, courseId: bigint): Promise<{ completionRate: number; finishedLessons: number; totalLessons: number }> {
        return await this.service.getCourseProgress(userId, courseId);
    }

    async addNote(userId: bigint, lessonId: bigint, content: string, videoTimestampSec: number | null): Promise<NoteView> {
        return await this.noteService.addNote(userId, lessonId, content, videoTimestampSec);
    }

    async listNotes(userId: bigint, lessonId: bigint): Promise<NoteView[]> {
        return await this.noteService.listNotes(userId, lessonId);
    }

    async deleteNote(userId: bigint, noteId: bigint): Promise<void> {
        await this.noteService.deleteNote(userId, noteId);
    }
}
