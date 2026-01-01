import { LearnService } from '../services/LearnService';
import { NoteService } from '../services/NoteService';
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

    async saveNote(userId: bigint, lessonId: bigint, content: string): Promise<void> {
        await this.noteService.saveNote(userId, lessonId, content);
    }

    async getNote(userId: bigint, lessonId: bigint): Promise<{ content: string; updatedAt: string } | null> {
        return await this.noteService.getNote(userId, lessonId);
    }
}
