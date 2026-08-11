import { UserEntity } from '../domain/UserEntity';

// WP1.5.11 — the last open item from the WP1.5 core-product-debt audit.
// Account deletion (WP1.5.6) already ships; this is the export half of the
// GDPR-style pair, covering everything deletion doesn't erase: profile,
// owned courses (full tree), learning progress, and notes. Every id/date
// is converted to a plain string here (not left as BigInt/Date) so the
// route can hand this straight to JSON.stringify without a custom
// replacer — BigInt has no native JSON representation and throws.
export class UserDataExportDto {
    exportedAt: string;
    profile: {
        id: string;
        email: string;
        fullName: string;
        age: number | null;
        role: string;
        avatarUrl: string | null;
    };
    ownedCourses: Array<{
        id: string;
        title: string;
        slug: string;
        description: string | null;
        status: string;
        shareToken: string | null;
        createdAt: string | null;
        chapters: Array<{
            id: string;
            title: string;
            orderIndex: number;
            lessons: Array<{
                id: string;
                title: string;
                type: string;
                contentUrl: string | null;
                orderIndex: number;
                questions: Array<{
                    id: string;
                    content: string;
                    optionA: string;
                    optionB: string;
                    optionC: string;
                    optionD: string;
                    answerKey: string | null;
                }>;
            }>;
        }>;
    }>;
    learningProgress: Array<{
        courseId: string | null;
        lessonId: string;
        isFinished: boolean;
        videoLastPosition: number | null;
        quizMaxScore: number | null;
        quizStartTime: string | null;
        personalNote: string | null;
    }>;
    notes: Array<{
        id: string;
        lessonId: string;
        courseId: string;
        content: string;
        videoTimestampSec: number | null;
        createdAt: string;
        updatedAt: string;
    }>;

    constructor(user: UserEntity, courses: any[], progress: any[], notes: any[]) {
        this.exportedAt = new Date().toISOString();

        this.profile = {
            id: user.id.toString(),
            email: user.email,
            fullName: user.fullName,
            age: user.age ?? null,
            role: user.roleName,
            avatarUrl: user.avatarUrl ?? null,
        };

        this.ownedCourses = courses.map((c: any) => ({
            id: c.id.toString(),
            title: c.title,
            slug: c.slug,
            description: c.description ?? null,
            status: c.status,
            shareToken: c.share_token ?? null,
            createdAt: c.created_at ? c.created_at.toISOString() : null,
            chapters: c.chapters.map((ch: any) => ({
                id: ch.id.toString(),
                title: ch.title,
                orderIndex: ch.order_index,
                lessons: ch.lessons.map((l: any) => ({
                    id: l.id.toString(),
                    title: l.title,
                    type: l.type,
                    contentUrl: l.content_url ?? null,
                    orderIndex: l.order_index,
                    questions: l.questions.map((q: any) => ({
                        id: q.id.toString(),
                        content: q.content,
                        optionA: q.option_a,
                        optionB: q.option_b,
                        optionC: q.option_c,
                        optionD: q.option_d,
                        answerKey: q.answer_key ?? null,
                    })),
                })),
            })),
        }));

        this.learningProgress = progress.map((p: any) => ({
            courseId: p.course_id ? p.course_id.toString() : null,
            lessonId: p.lesson_id.toString(),
            isFinished: p.is_finished,
            videoLastPosition: p.video_last_position ?? null,
            quizMaxScore: p.quiz_max_score ?? null,
            quizStartTime: p.quiz_start_time ? p.quiz_start_time.toISOString() : null,
            personalNote: p.personal_note ?? null,
        }));

        this.notes = notes.map((n: any) => ({
            id: n.id.toString(),
            lessonId: n.lesson_id.toString(),
            courseId: n.course_id.toString(),
            content: n.content,
            videoTimestampSec: n.video_timestamp_sec ?? null,
            createdAt: n.created_at.toISOString(),
            updatedAt: n.updated_at.toISOString(),
        }));
    }
}
