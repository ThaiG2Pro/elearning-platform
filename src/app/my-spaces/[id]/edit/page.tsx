'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, HelpCircle } from 'lucide-react';
import {
    getSpaceStructure,
    getLessonPreview,
    createSection,
    updateSection,
    deleteSection,
    createLesson,
    updateLesson,
    deleteLesson,
    parseQuizFile,
    uploadQuizFile,
    downloadQuizTemplate,
    updateSpaceMetadata,
    getOrCreateShareLink,
    saveGeneratedQuizQuestions,
} from '@/lib/management';
import {
    generateAIContent,
    parseAIQuizContent,
    AIGenerationError,
    AIQuizQuestionDraft,
} from '@/lib/aiGeneration';
import {
    SpaceStructure,
    Chapter,
    Lesson,
    LessonEdit,
    ChapterEdit,
    QuizQuestion,
    QuizParseResponse
} from '@/types/management.types';
import { Button } from '@/components/ui/button';
import TopBar from '@/components/vibe/TopBar';
import Toast from '@/components/Toast';
import MarkdownText from '@/components/MarkdownText';
import AILessonComposer, { AIVideoSourceOption } from '@/components/AILessonComposer';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

// Resolves "which option is correct" across the several incompatible shapes
// the backend has emitted over time for a QuizQuestion (see
// SpaceManagementService.getLessonPreview): a numeric correctIndex, a
// correctId that may itself be numeric or a string like "option_0", or a
// bare answerKey letter ("A", "B", …). Returns null if none resolve.
const getCorrectOptionIndex = (q: QuizQuestion): number | null => {
    if (typeof q.correctIndex === 'number') return q.correctIndex;
    if (typeof q.correctId === 'number') return q.correctId;
    if (typeof q.correctId === 'string') {
        const match = q.correctId.match(/(\d+)$/);
        if (match) return parseInt(match[1], 10);
    }
    if (q.answerKey) {
        const idx = q.answerKey.trim().toUpperCase().charCodeAt(0) - 65; // 'A' -> 0
        if (idx >= 0) return idx;
    }
    return null;
};

const getQuestionText = (q: QuizQuestion): string => q.content ?? q.text ?? '';

type EditState = 'idle' | 'editingVideo' | 'editingQuiz';
// Separate from EditState (which panel is shown) — this tracks the
// parse/upload sub-flow *within* the quiz panel. These used to be values of
// EditState itself ('processing'/'reviewing'), but the panel render below
// gates on `editState === 'editingQuiz'` exactly — flipping editState to
// 'processing' while parsing a file, or 'reviewing' after parsing succeeded,
// made that check fail and the ENTIRE quiz panel (title field, existing
// questions, upload box, and the parsed-questions preview itself) vanish
// mid-flow, falling back to the "chọn một bài học" empty state. A lecturer
// clicking "Xem trước câu hỏi" would watch their own editor disappear.
type QuizFlowStatus = 'idle' | 'processing' | 'reviewing';

const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/)([^&\s?/]+)/);
    return match ? match[1] : null;
};

export default function SpaceEditPage() {
    const params = useParams();
    const router = useRouter();
    const spaceId = parseInt(params.id as string);

    // Main States
    const [activeTab, setActiveTab] = useState<'curriculum' | 'settings'>('curriculum');
    const [space, setSpace] = useState<SpaceStructure | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingChapter, setSavingChapter] = useState(false);
    const [savingLesson, setSavingLesson] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Selection & Edit States
    const [editState, setEditState] = useState<EditState>('idle');
    const [quizFlowStatus, setQuizFlowStatus] = useState<QuizFlowStatus>('idle');
    const [selectedItem, setSelectedItem] = useState<Chapter | Lesson | null>(null);
    const [parsedQuestions, setParsedQuestions] = useState<QuizParseResponse | null>(null);
    const [loadingLessonDetail, setLoadingLessonDetail] = useState(false);
    const [existingQuizQuestions, setExistingQuizQuestions] = useState<QuizQuestion[] | null>(null);

    // Confirm-dialog state (replaces native confirm())
    const [chapterToDelete, setChapterToDelete] = useState<number | null>(null);
    const [lessonToDelete, setLessonToDelete] = useState<{ chapterId: number; lessonId: number } | null>(null);
    // In-flight guards for the two delete dialogs — previously a double-click
    // (or a slow network) on "Xoá chương"/"Xoá bài học" could fire the same
    // delete call twice before the first response came back and disabled
    // anything, racing a second DELETE against an id that's already gone.
    const [isDeletingChapter, setIsDeletingChapter] = useState(false);
    const [isDeletingLesson, setIsDeletingLesson] = useState(false);

    // Share & Metadata States
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [generatingShare, setGeneratingShare] = useState(false);
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDesc, setMetaDesc] = useState('');
    const [savingMeta, setSavingMeta] = useState(false);

    // Form States
    const [chapterForm, setChapterForm] = useState<ChapterEdit>({ title: '', orderIndex: 0 });
    const [lessonForm, setLessonForm] = useState<LessonEdit>({
        title: '',
        videoUrl: '',
        orderIndex: 0,
        type: 'VIDEO'
    });
    const [showAddChapter, setShowAddChapter] = useState(false);
    const [chapterCreating, setChapterCreating] = useState(false);
    const [addingLessonChapterId, setAddingLessonChapterId] = useState<number | null>(null);
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [newLessonType, setNewLessonType] = useState<'VIDEO' | 'QUIZ'>('VIDEO');
    const [creatingLesson, setCreatingLesson] = useState(false);
    const [quizFile, setQuizFile] = useState<File | null>(null);
    const [quizUploadedCount, setQuizUploadedCount] = useState<number | null>(null);

    // AI trong editor — bổ sung gap: dán link → vào editor → AI tự sinh
    // quiz ngay tại đó, thay vì chỉ có đường Excel thủ công. Luôn do user
    // chủ động bấm nút, không có gì tự chạy khi mở editor/thêm lesson mới.
    const [aiLoading, setAiLoading] = useState<'summary' | 'quiz' | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiErrorCode, setAiErrorCode] = useState<string | null>(null);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [aiQuizDraft, setAiQuizDraft] = useState<AIQuizQuestionDraft[] | null>(null);
    // Nếu 2 lesson QUIZ khác nhau cùng chọn 1 video nguồn, kết quả AI sẽ
    // GIỐNG HỆT NHAU — cache theo (source, recipe) dùng chung, đúng thiết
    // kế tiết kiệm token (không gọi LLM 2 lần cho cùng 1 video), nhưng nhìn
    // như "tự dưng trùng quiz của bài khác" nếu không nói rõ. Hiện dấu hiệu
    // này ra UI thay vì để user tự đoán.
    const [aiQuizServedFromCache, setAiQuizServedFromCache] = useState(false);
    const [creatingAIQuizLesson, setCreatingAIQuizLesson] = useState(false);
    // Đang mở 1 lesson QUIZ có sẵn (không tự có sourceId) — cho chọn 1 lesson
    // VIDEO khác trong cùng chương để AI sinh quiz từ đó, rồi lưu thẳng vào
    // đúng lesson QUIZ đang mở (không tạo lesson mới).
    const [aiQuizSourceLessonId, setAiQuizSourceLessonId] = useState<number | null>(null);
    const [savingAIQuizIntoCurrentLesson, setSavingAIQuizIntoCurrentLesson] = useState(false);
    // Quyết định UX 2026-08-21: trang edit là nơi duy nhất trigger AI (trang
    // học chỉ điều hướng về đây). Composer = dialog cấp-space: chọn bất kỳ
    // video nào trong space làm nguồn + đủ tuỳ chọn (số câu/độ khó/chủ đề
    // focus/BYOK/trả phí), quiz sinh ra ráp NGAY thành lesson QUIZ mới.
    const [aiComposerOpen, setAiComposerOpen] = useState(false);
    const [aiComposerType, setAiComposerType] = useState<'summary' | 'quiz'>('quiz');

    const isProcessing = quizFlowStatus === 'processing';
    const isReviewing = quizFlowStatus === 'reviewing';

    // Fetch Space Structure
    const fetchSpaceStructure = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const spaceData = await getSpaceStructure(spaceId);
            setSpace(spaceData);
            setMetaTitle(spaceData.title || '');
            setMetaDesc(spaceData.description || '');

            // Auto-select first lesson or first chapter if available
            if (spaceData.chapters.length > 0) {
                const firstChapter = spaceData.chapters[0];
                if (firstChapter.lessons.length > 0) {
                    const firstLesson = firstChapter.lessons[0];
                    selectLesson(firstLesson);
                } else {
                    setSelectedItem(firstChapter);
                    setChapterForm({ id: firstChapter.id, title: firstChapter.title, orderIndex: firstChapter.orderIndex });
                    setEditState('idle');
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [spaceId]);

    useEffect(() => {
        fetchSpaceStructure();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchSpaceStructure]);

    // Share Link Handler
    const handleCopyShareLink = async () => {
        try {
            setGeneratingShare(true);
            const res = await getOrCreateShareLink(spaceId);
            setShareUrl(res.shareUrl);
            await navigator.clipboard.writeText(res.shareUrl);
            setToast({ message: 'Đã sao chép link chia sẻ vào bộ nhớ tạm!', type: 'success' });
        } catch (err: any) {
            setToast({ message: 'Không thể tạo link chia sẻ: ' + err.message, type: 'error' });
        } finally {
            setGeneratingShare(false);
        }
    };

    // Metadata Save Handler
    const handleSaveSettings = async () => {
        try {
            setSavingMeta(true);
            await updateSpaceMetadata(spaceId, { title: metaTitle, description: metaDesc });
            setSpace(prev => prev ? { ...prev, title: metaTitle, description: metaDesc } : null);
            setToast({ message: 'Đã cập nhật thông tin Space!', type: 'success' });
        } catch (err: any) {
            setToast({ message: err.message, type: 'error' });
        } finally {
            setSavingMeta(false);
        }
    };

    // Chapter Select
    const handleChapterSelect = (chapter: Chapter) => {
        setSelectedItem(chapter);
        setChapterForm({ id: chapter.id, title: chapter.title, orderIndex: chapter.orderIndex });
        setEditState('idle');
    };

    // Lesson Select — loads the lesson's real current state (video URL,
    // existing quiz questions) via getLessonPreview instead of trusting only
    // the sidebar's shallow shape. Previously this just copied whatever the
    // sidebar already had and left a comment that loading details "would
    // need an additional API call" — that call already existed and was
    // simply never made, so re-opening an existing quiz lesson showed an
    // empty upload box with no memory of what was already there.
    const selectLesson = async (lesson: Lesson) => {
        setSelectedItem(lesson);
        setQuizUploadedCount(null);
        setExistingQuizQuestions(null);
        setParsedQuestions(null);
        setQuizFile(null);
        setQuizFlowStatus('idle');
        setEditState(lesson.type === 'VIDEO' ? 'editingVideo' : 'editingQuiz');
        setLessonForm({
            id: lesson.id,
            title: lesson.title,
            videoUrl: lesson.videoUrl || (lesson as any).contentUrl || '',
            orderIndex: lesson.orderIndex ?? 0,
            type: lesson.type,
            sourceId: lesson.sourceId ?? null,
        });
        // Kết quả AI thuộc về lesson vừa chọn — đổi lesson phải xoá sạch, để
        // không lỡ hiện tóm tắt/quiz của bài trước lẫn vào bài đang mở.
        setAiError(null);
        setAiErrorCode(null);
        setAiSummary(null);
        setAiQuizDraft(null);
        setAiQuizServedFromCache(false);
        setAiQuizSourceLessonId(null);

        setLoadingLessonDetail(true);
        try {
            const preview = await getLessonPreview(spaceId, lesson.id);
            setLessonForm(prev => prev.id === lesson.id ? {
                ...prev,
                videoUrl: preview.videoUrl || prev.videoUrl,
            } : prev);
            if (lesson.type === 'QUIZ') {
                setExistingQuizQuestions(preview.quizQuestions ?? []);
            }
        } catch (err: any) {
            setToast({ message: 'Không thể tải chi tiết bài học: ' + getErrorMessage(err.message), type: 'error' });
        } finally {
            setLoadingLessonDetail(false);
        }
    };

    // Create Chapter
    const handleCreateChapter = async () => {
        if (!space) return;
        setChapterCreating(true);
        try {
            const nextChapterIndex = space.chapters.length + 1;
            const titleToUse = chapterForm.title.trim() || `Chương ${nextChapterIndex}`;
            const res = await createSection(spaceId, {
                title: titleToUse,
                orderIndex: nextChapterIndex
            });
            const newChapter: Chapter = {
                id: (res as any).id ?? (res as any).sectionId,
                title: titleToUse,
                orderIndex: nextChapterIndex,
                lessons: [],
            };
            setSpace(prev => prev ? {
                ...prev,
                chapters: [...prev.chapters, newChapter]
            } : null);
            setChapterForm({ title: '', orderIndex: 0 });
            setShowAddChapter(false);
            setSelectedItem(newChapter);
            setToast({ message: `Đã thêm Chương ${nextChapterIndex}!`, type: 'success' });
        } catch (err: any) {
            setToast({ message: 'Không thể tạo chương: ' + getErrorMessage(err.message), type: 'error' });
        } finally {
            setChapterCreating(false);
        }
    };

    // Update Chapter
    const handleUpdateChapter = async () => {
        if (!chapterForm.id) return;
        try {
            setSavingChapter(true);
            await updateSection(chapterForm.id, {
                title: chapterForm.title,
                orderIndex: chapterForm.orderIndex
            });
            setSpace(prev => prev ? {
                ...prev,
                chapters: prev.chapters.map(ch =>
                    ch.id === chapterForm.id ? { ...ch, title: chapterForm.title, orderIndex: chapterForm.orderIndex } : ch
                )
            } : null);
            setToast({ message: 'Đã cập nhật tên chương!', type: 'success' });
        } catch (err: any) {
            setToast({ message: 'Không thể cập nhật chương: ' + getErrorMessage(err.message), type: 'error' });
        } finally {
            setSavingChapter(false);
        }
    };

    // Delete Chapter — confirmed via Dialog (see chapterToDelete state)
    const handleDeleteChapter = async (chapterId: number) => {
        if (isDeletingChapter) return; // guard against double-click on the dialog's confirm button
        setIsDeletingChapter(true);
        try {
            await deleteSection(chapterId);
            setSpace(prev => prev ? {
                ...prev,
                chapters: prev.chapters.filter(ch => ch.id !== chapterId)
            } : null);
            setSelectedItem(null);
            setToast({ message: 'Đã xóa chương!', type: 'info' });
        } catch (err: any) {
            setToast({ message: 'Không thể xóa chương: ' + getErrorMessage(err.message), type: 'error' });
        } finally {
            setIsDeletingChapter(false);
            setChapterToDelete(null);
        }
    };

    // Quick Add Lesson to Chapter
    const handleQuickAddLesson = async (chapterId: number) => {
        if (creatingLesson) return; // guard against double-click / Enter+click race
        const targetChapter = space?.chapters.find(c => c.id === chapterId);
        if (!targetChapter) return;

        const nextIndex = targetChapter.lessons.length + 1;
        const titleToUse = newLessonTitle.trim() || `Bài ${nextIndex}`;

        setCreatingLesson(true);
        try {
            const res = await createLesson(chapterId, {
                title: titleToUse,
                videoUrl: '',
                orderIndex: nextIndex,
                type: newLessonType
            });
            const newLesson: Lesson = {
                id: res.lessonId,
                title: titleToUse,
                type: newLessonType,
                orderIndex: nextIndex,
                videoUrl: '',
                sourceId: res.sourceId,
            };
            setSpace(prev => prev ? {
                ...prev,
                chapters: prev.chapters.map(ch =>
                    ch.id === chapterId ? {
                        ...ch,
                        lessons: [...ch.lessons, newLesson]
                    } : ch
                )
            } : null);
            setNewLessonTitle('');
            setAddingLessonChapterId(null);
            selectLesson(newLesson);
            setToast({ message: 'Đã thêm bài học mới!', type: 'success' });
        } catch (err: any) {
            setToast({ message: 'Không thể thêm bài học: ' + getErrorMessage(err.message), type: 'error' });
        } finally {
            setCreatingLesson(false);
        }
    };

    // Delete Lesson — confirmed via Dialog (see lessonToDelete state)
    const handleDeleteLesson = async (chapterId: number, lessonId: number) => {
        if (isDeletingLesson) return; // guard against double-click on the dialog's confirm button
        setIsDeletingLesson(true);
        try {
            await deleteLesson(lessonId);
            setSpace(prev => prev ? {
                ...prev,
                chapters: prev.chapters.map(ch =>
                    ch.id === chapterId ? { ...ch, lessons: ch.lessons.filter(l => l.id !== lessonId) } : ch
                )
            } : null);
            if (selectedItem?.id === lessonId) {
                setSelectedItem(null);
                setEditState('idle');
            }
            setToast({ message: 'Đã xóa bài học!', type: 'info' });
        } catch (err: any) {
            setToast({ message: 'Không thể xóa bài học: ' + getErrorMessage(err.message), type: 'error' });
        } finally {
            setIsDeletingLesson(false);
            setLessonToDelete(null);
        }
    };

    // Move Chapter — same immediate-persist swap pattern as handleMoveLesson
    // below, applied to chapters via updateSection's orderIndex. Chapters
    // previously had no reorder control at all (lessons did), forcing a
    // delete-and-recreate-in-the-right-order workaround to fix ordering.
    const handleMoveChapter = async (chapterId: number, direction: -1 | 1) => {
        if (!space) return;
        const index = space.chapters.findIndex(ch => ch.id === chapterId);
        const targetIndex = index + direction;
        if (index < 0 || targetIndex < 0 || targetIndex >= space.chapters.length) return;

        const a = space.chapters[index];
        const b = space.chapters[targetIndex];

        setSpace(prev => {
            if (!prev) return prev;
            const chapters = [...prev.chapters];
            [chapters[index], chapters[targetIndex]] = [
                { ...chapters[targetIndex], orderIndex: a.orderIndex ?? index },
                { ...chapters[index], orderIndex: b.orderIndex ?? targetIndex },
            ];
            return { ...prev, chapters };
        });

        try {
            await Promise.all([
                updateSection(a.id, { title: a.title, orderIndex: b.orderIndex ?? targetIndex }),
                updateSection(b.id, { title: b.title, orderIndex: a.orderIndex ?? index }),
            ]);
        } catch (err: any) {
            setToast({ message: 'Không thể lưu thứ tự chương: ' + getErrorMessage(err.message), type: 'error' });
            // Revert the optimistic swap
            setSpace(prev => {
                if (!prev) return prev;
                const chapters = [...prev.chapters];
                [chapters[index], chapters[targetIndex]] = [chapters[targetIndex], chapters[index]];
                return { ...prev, chapters };
            });
        }
    };

    // Move Lesson — persists immediately (there is no more global "save all"
    // to fall back on), by swapping the two affected lessons' orderIndex via
    // updateLesson. Optimistic in-memory swap first, toast + best-effort
    // revert if either persist call fails.
    const handleMoveLesson = async (chapterId: number, lessonId: number, direction: -1 | 1) => {
        const chapter = space?.chapters.find(ch => ch.id === chapterId);
        if (!chapter) return;
        const index = chapter.lessons.findIndex(l => l.id === lessonId);
        const targetIndex = index + direction;
        if (index < 0 || targetIndex < 0 || targetIndex >= chapter.lessons.length) return;

        const a = chapter.lessons[index];
        const b = chapter.lessons[targetIndex];

        setSpace(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                chapters: prev.chapters.map(ch => {
                    if (ch.id !== chapterId) return ch;
                    const lessons = [...ch.lessons];
                    [lessons[index], lessons[targetIndex]] = [
                        { ...lessons[targetIndex], orderIndex: a.orderIndex ?? index },
                        { ...lessons[index], orderIndex: b.orderIndex ?? targetIndex },
                    ];
                    return { ...ch, lessons };
                })
            };
        });

        try {
            await Promise.all([
                updateLesson(a.id, { title: a.title, videoUrl: a.videoUrl, orderIndex: b.orderIndex ?? targetIndex }),
                updateLesson(b.id, { title: b.title, videoUrl: b.videoUrl, orderIndex: a.orderIndex ?? index }),
            ]);
        } catch (err: any) {
            setToast({ message: 'Không thể lưu thứ tự bài học: ' + getErrorMessage(err.message), type: 'error' });
            // Revert the optimistic swap
            setSpace(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    chapters: prev.chapters.map(ch => {
                        if (ch.id !== chapterId) return ch;
                        const lessons = [...ch.lessons];
                        [lessons[index], lessons[targetIndex]] = [lessons[targetIndex], lessons[index]];
                        return { ...ch, lessons };
                    })
                };
            });
        }
    };

    // Save Lesson Field (title / video URL) — mirrors handleUpdateChapter:
    // immediate, explicit persistence instead of the old silent in-memory
    // sync that only ever reached the server via the (now removed) global
    // bulk save.
    const handleSaveLesson = async () => {
        if (!lessonForm.id) return;
        try {
            setSavingLesson(true);
            const result = await updateLesson(lessonForm.id, {
                title: lessonForm.title,
                videoUrl: lessonForm.videoUrl,
                orderIndex: lessonForm.orderIndex,
            });
            // 2026-09-04 — dán/đổi videoUrl giờ server tự tạo Source (nếu
            // chưa có) và trả lại sourceId; phải ghi lại vào cả lessonForm
            // (bật panel AI ngay, không cần thoát-vào-lại lesson) lẫn cây
            // `space` (để lần chọn lesson tiếp theo không mất, vì selectLesson
            // đọc sourceId từ đúng object này chứ không refetch).
            setLessonForm(prev => prev.id === lessonForm.id ? { ...prev, sourceId: result.sourceId } : prev);
            setSpace(prev => prev ? {
                ...prev,
                chapters: prev.chapters.map(ch => ({
                    ...ch,
                    lessons: ch.lessons.map(l => l.id === lessonForm.id ? {
                        ...l,
                        title: lessonForm.title,
                        videoUrl: lessonForm.videoUrl,
                        sourceId: result.sourceId,
                    } : l)
                }))
            } : null);
            setToast({ message: 'Đã lưu bài học!', type: 'success' });
        } catch (err: any) {
            setToast({ message: 'Không thể lưu bài học: ' + getErrorMessage(err.message), type: 'error' });
        } finally {
            setSavingLesson(false);
        }
    };

    // Parse Quiz (preview only — does not persist anything)
    const handleParseQuiz = async () => {
        if (!quizFile) return;
        setQuizFlowStatus('processing');
        try {
            const result = await parseQuizFile(quizFile);
            setParsedQuestions(result);
            setQuizFlowStatus('reviewing');
        } catch (err: any) {
            // A failed preview is a transient, in-panel error, not a
            // page-level one — routing it through the global `error` state
            // used to swap the ENTIRE editor for a full-page "Đã có lỗi xảy
            // ra" dead-end (see the `if (error) return ...` render guard
            // below) over something as recoverable as a bad Excel row.
            setToast({ message: 'Không thể đọc tệp: ' + getErrorMessage(err.message), type: 'error' });
            setQuizFlowStatus('idle');
        }
    };

    // Upload Quiz
    const handleUploadQuiz = async () => {
        if (!quizFile || !selectedItem || (selectedItem as Lesson).type !== 'QUIZ') return;
        const lesson = selectedItem as Lesson;
        setQuizFlowStatus('processing');
        try {
            const result = await uploadQuizFile(lesson.id, quizFile);
            setQuizUploadedCount(result.uploadedCount);
            setQuizFile(null);
            setParsedQuestions(null);
            setQuizFlowStatus('idle');
            setToast({ message: `Đã tải lên ${result.uploadedCount} câu hỏi Quiz!`, type: 'success' });
            // Upload fully replaces the question set (BR-UPLOAD-01) — refetch
            // so the "existing questions" list reflects what's actually there now.
            try {
                const preview = await getLessonPreview(spaceId, lesson.id);
                setExistingQuizQuestions(preview.quizQuestions ?? []);
            } catch {
                // non-fatal — the upload itself already succeeded
            }
        } catch (err: any) {
            setToast({ message: 'Không thể tải lên bộ câu hỏi: ' + getErrorMessage(err.message), type: 'error' });
            setQuizFlowStatus('idle');
        }
    };

    const handleDownloadQuizTemplate = async () => {
        try {
            await downloadQuizTemplate();
        } catch (err: any) {
            setToast({ message: 'Không thể tải file mẫu: ' + getErrorMessage(err.message), type: 'error' });
        }
    };

    // AI trong editor — luôn do user chủ động bấm (không có gì tự chạy).
    // Cùng 1 Source có thể đã có bản SHARED_FREE cache sẵn (vd generate qua
    // composer cấp-space phía trên), nên bấm ở đây có thể trả về ngay
    // (servedFromCache), không tốn thêm 1 lần gọi LLM.
    const handleGenerateAISummary = async () => {
        if (!lessonForm.sourceId) return;
        setAiLoading('summary');
        setAiError(null);
        setAiErrorCode(null);
        try {
            const result = await generateAIContent(lessonForm.sourceId, 'summary');
            // Contract sync (hướng a): POST chỉ trả về khi READY (có content)
            // hoặc throw. Check theo content thay vì `status === 'FAILED'` —
            // server không bao giờ trả FAILED qua POST (nó throw), và cache
            // giờ chỉ khớp READY; content rỗng là bất thường → hiện lỗi thay
            // vì im lặng không làm gì.
            if (result.content) {
                setAiSummary(result.content);
            } else {
                setAiError('Tạo tóm tắt AI thất bại, thử lại sau.');
            }
        } catch (err: any) {
            setAiError(err.message || 'Có lỗi xảy ra khi tạo tóm tắt bằng AI.');
            if (err instanceof AIGenerationError) setAiErrorCode(err.code);
        } finally {
            setAiLoading(null);
        }
    };

    // `sourceId` truyền rõ (không đọc thẳng lessonForm.sourceId) — dùng
    // chung được cho 2 tình huống: (a) đang mở lesson VIDEO, tạo quiz từ
    // chính source của nó; (b) đang mở 1 lesson QUIZ có sẵn (rỗng hoặc đã
    // có câu hỏi cũ), muốn tạo quiz từ 1 video khác trong cùng chương — bản
    // thân lesson QUIZ không có source riêng.
    const handleGenerateAIQuiz = async (sourceId: number, paymentMethod?: 'CREDITS') => {
        setAiLoading('quiz');
        setAiError(null);
        setAiErrorCode(null);
        setAiQuizDraft(null);
        setAiQuizServedFromCache(false);
        try {
            const result = await generateAIContent(sourceId, 'quiz', paymentMethod ? { paymentMethod } : undefined);
            // Cùng lý do với handleGenerateAISummary: check theo content,
            // nhánh FAILED cũ là dead code với contract sync.
            if (result.content) {
                setAiQuizDraft(parseAIQuizContent(result.content));
                setAiQuizServedFromCache(result.servedFromCache);
            } else {
                setAiError('Tạo quiz AI thất bại, thử lại sau.');
            }
        } catch (err: any) {
            setAiError(err.message || 'Có lỗi xảy ra khi tạo quiz bằng AI.');
            if (err instanceof AIGenerationError) setAiErrorCode(err.code);
        } finally {
            setAiLoading(null);
        }
    };

    // Gộp generate + tạo lesson làm 1 bước (quyết định 2026-09-04): trước đó
    // nút "AI tạo quiz 10 câu" ở panel sửa VIDEO chỉ sinh ra bản xem trước,
    // phải bấm thêm "Tạo bài quiz mới từ đây" mới thật sự ra 1 lesson QUIZ —
    // 2 bước cho cùng 1 ý định (đang sửa video, muốn có ngay bài quiz mới),
    // giống hệt luồng composer cấp-space (AILessonComposer.handleGenerate)
    // vốn đã tự ráp lesson ngay sau khi parse xong. Dùng `draft` cục bộ thay
    // vì đọc lại aiQuizDraft từ state — setState không đồng bộ nên gọi tạo
    // lesson ngay sau khi set draft có thể vẫn thấy giá trị cũ.
    const handleGenerateAndCreateAIQuizLesson = async (sourceId: number, paymentMethod?: 'CREDITS') => {
        const targetChapter = space?.chapters.find(ch => ch.lessons.some(l => l.id === lessonForm.id));
        setAiLoading('quiz');
        setAiError(null);
        setAiErrorCode(null);
        setAiQuizDraft(null);
        setAiQuizServedFromCache(false);
        try {
            const result = await generateAIContent(sourceId, 'quiz', paymentMethod ? { paymentMethod } : undefined);
            if (!result.content) {
                setAiError('Tạo quiz AI thất bại, thử lại sau.');
                return;
            }
            const draft = parseAIQuizContent(result.content);
            if (!targetChapter) {
                // Hiếm gặp: không xác định được chương chứa lesson đang mở — vẫn
                // hiện bản xem trước để không mất công AI vừa sinh ra.
                setAiQuizDraft(draft);
                setAiQuizServedFromCache(result.servedFromCache);
                return;
            }
            try {
                setCreatingAIQuizLesson(true);
                const chapterId = targetChapter.id;
                const nextIndex = targetChapter.lessons.length + 1;
                const title = `Quiz (AI) — ${lessonForm.title || 'bài học'}`;
                const res = await createLesson(chapterId, { title, videoUrl: '', orderIndex: nextIndex, type: 'QUIZ' });
                const newLessonId = Number((res as any).lessonId ?? (res as any).id);

                await saveGeneratedQuizQuestions(newLessonId, draft);

                const newLesson: Lesson = { id: newLessonId, title, type: 'QUIZ', orderIndex: nextIndex };
                setSpace(prev => prev ? {
                    ...prev,
                    chapters: prev.chapters.map(ch => ch.id === chapterId ? { ...ch, lessons: [...ch.lessons, newLesson] } : ch)
                } : null);
                setToast({ message: `Đã tạo bài quiz mới với ${draft.length} câu hỏi!`, type: 'success' });
                selectLesson(newLesson);
            } catch (err: any) {
                // AI đã sinh thành công, chỉ bước tạo lesson lỗi (vd mất mạng) —
                // giữ lại bản xem trước để user bấm "Tạo bài quiz mới từ đây" thử
                // lại, không bắt gọi AI thêm 1 lần nữa (tốn credit/lượt).
                setAiQuizDraft(draft);
                setAiQuizServedFromCache(result.servedFromCache);
                setToast({ message: 'Không thể tạo bài quiz từ AI: ' + getErrorMessage(err.message), type: 'error' });
            } finally {
                setCreatingAIQuizLesson(false);
            }
        } catch (err: any) {
            setAiError(err.message || 'Có lỗi xảy ra khi tạo quiz bằng AI.');
            if (err instanceof AIGenerationError) setAiErrorCode(err.code);
        } finally {
            setAiLoading(null);
        }
    };

    // "Tạo bài quiz mới": biến bản nháp AI đã xem trước thành 1 lesson QUIZ
    // thật trong cùng chương — đúng hình dung ban đầu (dán link → vào editor
    // → AI sinh quiz ngay → thêm video khác → vào học 1 space chỉnh chu),
    // trước đây phải quay lại trang học rồi không có cách nào gắn kết quả
    // vào cấu trúc space.
    const handleCreateQuizLessonFromAIDraft = async () => {
        // Chương chứa lesson video vừa generate — tính lại tại chỗ (không
        // dựa vào `parentChapterOfSelected`, biến chỉ được khai báo bên dưới
        // trong phần render) để bài quiz mới luôn nằm cùng chương với video
        // sinh ra nó.
        const targetChapter = space?.chapters.find(ch => ch.lessons.some(l => l.id === lessonForm.id));
        if (!aiQuizDraft || !targetChapter) return;
        setCreatingAIQuizLesson(true);
        try {
            const chapterId = targetChapter.id;
            const nextIndex = targetChapter.lessons.length + 1;
            const title = `Quiz (AI) — ${lessonForm.title || 'bài học'}`;
            const res = await createLesson(chapterId, { title, videoUrl: '', orderIndex: nextIndex, type: 'QUIZ' });
            const newLessonId = Number((res as any).lessonId ?? (res as any).id);

            await saveGeneratedQuizQuestions(newLessonId, aiQuizDraft);

            const newLesson: Lesson = { id: newLessonId, title, type: 'QUIZ', orderIndex: nextIndex };
            setSpace(prev => prev ? {
                ...prev,
                chapters: prev.chapters.map(ch => ch.id === chapterId ? { ...ch, lessons: [...ch.lessons, newLesson] } : ch)
            } : null);
            setAiQuizDraft(null);
            setToast({ message: `Đã tạo bài quiz mới với ${aiQuizDraft.length} câu hỏi!`, type: 'success' });
            selectLesson(newLesson);
        } catch (err: any) {
            setToast({ message: 'Không thể tạo bài quiz từ AI: ' + getErrorMessage(err.message), type: 'error' });
        } finally {
            setCreatingAIQuizLesson(false);
        }
    };

    // Bổ sung sau feedback thật: mở 1 lesson QUIZ có sẵn (vd tạo tay qua
    // "Thêm bài học" chọn loại Quiz, hoặc bài quiz cũ muốn làm lại) vốn
    // không có nút AI nào — chỉ có upload Excel. Cho phép chọn 1 video khác
    // trong cùng chương làm nguồn, AI sinh quiz, rồi LƯU THẲNG vào đúng
    // lesson đang mở (thay thế toàn bộ câu hỏi cũ — cùng BR-UPLOAD-01 với
    // Excel) thay vì tạo thêm 1 lesson mới.
    const handleSaveAIQuizDraftIntoCurrentLesson = async () => {
        if (!aiQuizDraft || !lessonForm.id) return;
        setSavingAIQuizIntoCurrentLesson(true);
        try {
            const result = await saveGeneratedQuizQuestions(lessonForm.id, aiQuizDraft);
            setQuizUploadedCount(result.savedCount);
            setAiQuizDraft(null);
            setToast({ message: `Đã lưu ${result.savedCount} câu hỏi (AI) vào bài quiz này!`, type: 'success' });
            // Cùng pattern refresh với handleUploadQuiz — thay thế toàn bộ nên
            // phải tải lại để "Câu hỏi hiện có" khớp đúng dữ liệu mới.
            try {
                const preview = await getLessonPreview(spaceId, lessonForm.id);
                setExistingQuizQuestions(preview.quizQuestions ?? []);
            } catch {
                // non-fatal — đã lưu thành công, chỉ là chưa refresh được preview
            }
        } catch (err: any) {
            setToast({ message: 'Không thể lưu quiz từ AI: ' + getErrorMessage(err.message), type: 'error' });
        } finally {
            setSavingAIQuizIntoCurrentLesson(false);
        }
    };

    // Composer cấp-space (AILessonComposer): tạo lesson QUIZ mới trong đúng
    // chương của video nguồn từ bản nháp đã parse. Tách khỏi
    // handleCreateQuizLessonFromAIDraft vì chương đích do composer chỉ định
    // (video nguồn chọn từ dropdown, có thể ở bất kỳ chương nào), không suy
    // ra từ lesson đang mở. Throw lại cho composer catch → lỗi hiện trong
    // dialog, không toast đè lên dialog đang mở.
    const handleComposerCreateQuizLesson = async (
        chapterId: number,
        draft: AIQuizQuestionDraft[],
        sourceLessonTitle: string,
        servedFromCache: boolean,
    ) => {
        const targetChapter = space?.chapters.find(ch => ch.id === chapterId);
        if (!targetChapter) throw new Error('Không tìm thấy chương của video nguồn — tải lại trang rồi thử lại.');
        const nextIndex = targetChapter.lessons.length + 1;
        const title = `Quiz (AI) — ${sourceLessonTitle}`;
        const res = await createLesson(chapterId, { title, videoUrl: '', orderIndex: nextIndex, type: 'QUIZ' });
        const newLessonId = Number((res as any).lessonId ?? (res as any).id);

        await saveGeneratedQuizQuestions(newLessonId, draft);

        const newLesson: Lesson = { id: newLessonId, title, type: 'QUIZ', orderIndex: nextIndex };
        setSpace(prev => prev ? {
            ...prev,
            chapters: prev.chapters.map(ch => ch.id === chapterId ? { ...ch, lessons: [...ch.lessons, newLesson] } : ch)
        } : null);
        setToast({
            message: `Đã tạo bài quiz mới với ${draft.length} câu hỏi!${servedFromCache ? ' (dùng lại bản AI đã tạo trước đó cho video này)' : ''}`,
            type: 'success',
        });
        selectLesson(newLesson);
    };

    const getErrorMessage = (errorCode: string) => {
        switch (errorCode) {
            case 'ACCESS_DENIED':
                return 'Bạn không có quyền chỉnh sửa nội dung này.';
            case 'INVALID_FILE_FORMAT':
                return 'Định dạng tệp không hợp lệ. Vui lòng sử dụng tệp Excel (.xlsx).';
            case 'FILE_TOO_LARGE':
                return 'Dung lượng tệp vượt quá giới hạn cho phép.';
            case 'SECTION_NOT_FOUND':
                return 'Dữ liệu chương không tồn tại hoặc đã bị xóa.';
            case 'LESSON_NOT_FOUND':
                return 'Bài học không tồn tại hoặc đã bị xóa.';
            default:
                return errorCode || 'Lỗi hệ thống.';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-ink-page flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-9 w-9 border-2 border-ink-accent border-t-transparent"/>
                    <p className="text-xs text-ink-textMuted font-medium">Đang tải trình chỉnh sửa Space…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-ink-page flex items-center justify-center p-4">
                <div className="bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-sm p-8 max-w-md w-full text-center">
                    <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-ink-text mb-2">Đã có lỗi xảy ra</h3>
                    <p className="text-sm text-ink-textMid mb-6">{getErrorMessage(error)}</p>
                    <Button onClick={() => router.push('/')} className="w-full">
                        Quay lại trang chủ
                    </Button>
                </div>
            </div>
        );
    }

    if (!space) return null;

    const totalLessons = space.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);

    // Breadcrumb for the lesson editor panel — which chapter the open lesson
    // belongs to. Previously the panel only showed the lesson's own title,
    // giving no orientation once a space had more than a couple of
    // chapters open in the sidebar at once.
    const parentChapterOfSelected = selectedItem && !('lessons' in selectedItem)
        ? space.chapters.find(ch => ch.lessons.some(l => l.id === selectedItem.id))
        : undefined;

    // Toàn bộ video có Source trong space — ứng viên "video nguồn" cho
    // composer AI (không giới hạn cùng chương như dropdown trong lesson QUIZ).
    const aiVideoOptions: AIVideoSourceOption[] = space.chapters.flatMap(ch =>
        ch.lessons
            .filter((l): l is Lesson & { sourceId: number } => l.type === 'VIDEO' && !!l.sourceId)
            .map(l => ({
                lessonId: l.id,
                lessonTitle: l.title,
                sourceId: l.sourceId,
                chapterId: ch.id,
                chapterTitle: ch.title,
            }))
    );

    return (
        <div className="min-h-screen bg-ink-page flex flex-col">
            {/* Toast Notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Delete Chapter Confirmation */}
            <Dialog open={chapterToDelete !== null} onOpenChange={(open) => { if (!open) setChapterToDelete(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xoá chương này?</DialogTitle>
                        <DialogDescription>
                            Toàn bộ bài học bên trong chương này sẽ bị xoá theo. Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setChapterToDelete(null)} disabled={isDeletingChapter}>Hủy</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isDeletingChapter}
                            onClick={() => chapterToDelete !== null && handleDeleteChapter(chapterToDelete)}
                        >
                            {isDeletingChapter ? 'Đang xoá…' : 'Xoá chương'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Lesson Confirmation */}
            <Dialog open={lessonToDelete !== null} onOpenChange={(open) => { if (!open) setLessonToDelete(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xoá bài học này?</DialogTitle>
                        <DialogDescription>
                            Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLessonToDelete(null)} disabled={isDeletingLesson}>Hủy</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isDeletingLesson}
                            onClick={() => lessonToDelete && handleDeleteLesson(lessonToDelete.chapterId, lessonToDelete.lessonId)}
                        >
                            {isDeletingLesson ? 'Đang xoá…' : 'Xoá bài học'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Composer AI cấp-space — mở từ 2 nút trigger ở sidebar */}
            <AILessonComposer
                open={aiComposerOpen}
                initialType={aiComposerType}
                videoOptions={aiVideoOptions}
                onClose={() => setAiComposerOpen(false)}
                onCreateQuizLesson={handleComposerCreateQuizLesson}
            />

            {/* Top Navigation Bar — vỏ dùng chung TopBar variant="site" (bg/border/
                height/sticky/z-index khớp Header.tsx), subRow chứa hàng tab riêng
                của trang edit. Không dùng variant="workspace" vì đây là màn quản
                trị (CRUD), không phải trải nghiệm xem video có focus-mode. */}
            <TopBar
                variant="site"
                subRow={
                    <div className="flex border-t border-ink-pageDim gap-6">
                        <button
                            onClick={() => setActiveTab('curriculum')}
                            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                                activeTab === 'curriculum'
                                    ? 'border-ink-accent text-ink-accent'
                                    : 'border-transparent text-ink-textMuted hover:text-ink-text'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                            </svg>
                            Cấu trúc bài học
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                                activeTab === 'settings'
                                    ? 'border-ink-accent text-ink-accent'
                                    : 'border-transparent text-ink-textMuted hover:text-ink-text'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            Cài đặt & Chia sẻ
                        </button>
                    </div>
                }
            >
                {/* Left: Back & Title */}
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        onClick={() => router.push('/')}
                        className="inline-flex items-center gap-1.5 text-sm text-ink-textMuted hover:text-ink-text transition-colors font-medium focus:outline-none"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                        </svg>
                        <span>Trang chủ</span>
                    </button>

                    <div className="w-px h-5 bg-ink-border hidden sm:block"/>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-ink-text truncate max-w-xs sm:max-w-md leading-none">
                                {space.title}
                            </h1>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                space.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                                {space.status === 'Active' ? 'Đang hoạt động' : 'Đã lưu trữ'}
                            </span>
                        </div>
                        <p className="text-xs text-ink-textDim mt-0.5">
                            {space.chapters.length} chương • {totalLessons} bài học
                        </p>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Copy Share Link */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyShareLink}
                        disabled={generatingShare}
                        className="hidden sm:inline-flex items-center gap-1.5"
                        title="Sao chép link chia sẻ Space"
                    >
                        {generatingShare ? (
                            <span className="w-3.5 h-3.5 border-2 border-ink-textDim border-t-transparent rounded-full animate-spin"/>
                        ) : (
                            <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                            </svg>
                        )}
                        <span>Chia sẻ</span>
                    </Button>

                    {/* View Learning Page */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/spaces/${spaceId}/learn`)}
                        className="inline-flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span>Vào học</span>
                    </Button>
                </div>
            </TopBar>

            {/* Main Body */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
                {activeTab === 'curriculum' ? (
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Sidebar: Space Tree */}
                        <div className="w-full lg:w-80 flex-shrink-0">
                            <div className="bg-ink-panel rounded-ink-lg border border-ink-border shadow-ink-sm p-4 sticky top-36">
                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-ink-pageDim">
                                    <h2 className="text-xs font-bold text-ink-text uppercase tracking-wider">
                                        Nội dung Space
                                    </h2>
                                    <span className="text-xs text-ink-textDim font-medium">
                                        {space.chapters.length} chương
                                    </span>
                                </div>

                                {/* Trigger AI tinh tế cấp-space (quyết định UX 2026-08-21):
                                    chỉ hiện khi có ít nhất 1 video từ link làm nguồn được. */}
                                {aiVideoOptions.length > 0 && (
                                    <div className="flex gap-2 mb-3">
                                        <button
                                            onClick={() => { setAiComposerType('quiz'); setAiComposerOpen(true); }}
                                            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border border-dashed border-ink-accentA text-ink-accent hover:bg-ink-accentA hover:border-ink-accentA transition-colors"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                            </svg>
                                            Tạo quiz tại đây
                                        </button>
                                        <button
                                            onClick={() => { setAiComposerType('summary'); setAiComposerOpen(true); }}
                                            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border border-dashed border-ink-accentA text-ink-accent hover:bg-ink-accentA hover:border-ink-accentA transition-colors"
                                        >
                                            Tạo tóm tắt
                                        </button>
                                    </div>
                                )}

                                {/* Chapter Tree List */}
                                <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                                    {space.chapters.length === 0 ? (
                                        <div className="p-6 border-2 border-dashed border-ink-border rounded-ink-md text-center">
                                            <div className="w-10 h-10 rounded-full bg-ink-accentA text-ink-accent flex items-center justify-center mx-auto mb-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                                </svg>
                                            </div>
                                            <p className="text-xs font-semibold text-ink-text mb-1">Chưa có chương nào</p>
                                            <p className="text-xs text-ink-textDim mb-4">Bắt đầu bằng cách tạo chương đầu tiên.</p>
                                            <Button
                                                onClick={() => {
                                                    setChapterForm({ title: 'Chương 1: Tổng quan', orderIndex: 0 });
                                                    setShowAddChapter(true);
                                                }}
                                                size="sm"
                                                className="w-full bg-ink-accent text-white"
                                            >
                                                + Tạo chương đầu tiên
                                            </Button>
                                        </div>
                                    ) : (
                                        space.chapters.map((chapter: Chapter, chIdx: number) => {
                                            const isChapterSelected = selectedItem?.id === chapter.id && 'lessons' in selectedItem;
                                            return (
                                                <div
                                                    key={chapter.id}
                                                    className={`border rounded-ink-md transition-all overflow-hidden bg-ink-panel ${
                                                        isChapterSelected
                                                            ? 'border-ink-accent ring-2 ring-ink-accentA shadow-ink-sm'
                                                            : 'border-ink-border hover:border-ink-borderHi'
                                                    }`}
                                                >
                                                    {/* Chapter Header */}
                                                    <div
                                                        onClick={() => handleChapterSelect(chapter)}
                                                        className="px-3.5 py-2.5 cursor-pointer bg-ink-page/60 hover:bg-ink-pageDim/80 transition-colors flex items-center justify-between gap-2"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-xs font-bold text-ink-accent flex-shrink-0">
                                                                C{chIdx + 1}
                                                            </span>
                                                            <span className="text-xs font-semibold text-ink-text truncate">
                                                                {chapter.title}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                disabled={chIdx === 0}
                                                                onClick={() => handleMoveChapter(chapter.id, -1)}
                                                                className="p-1 text-ink-textDim hover:text-ink-text disabled:opacity-30 rounded hover:bg-ink-border"
                                                                title="Chuyển lên"
                                                            >
                                                                ↑
                                                            </button>
                                                            <button
                                                                disabled={chIdx === space.chapters.length - 1}
                                                                onClick={() => handleMoveChapter(chapter.id, 1)}
                                                                className="p-1 text-ink-textDim hover:text-ink-text disabled:opacity-30 rounded hover:bg-ink-border"
                                                                title="Chuyển xuống"
                                                            >
                                                                ↓
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setAddingLessonChapterId(addingLessonChapterId === chapter.id ? null : chapter.id);
                                                                    setNewLessonTitle('');
                                                                }}
                                                                className="text-xs font-medium text-ink-accent hover:text-ink-text p-1 hover:bg-ink-accentA rounded transition-colors"
                                                                title="Thêm bài học"
                                                            >
                                                                + Bài học
                                                            </button>
                                                            <button
                                                                onClick={() => setChapterToDelete(chapter.id)}
                                                                className="text-ink-textDim hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors text-xs"
                                                                title="Xóa chương"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Quick Add Lesson Input */}
                                                    {addingLessonChapterId === chapter.id && (
                                                        <div className="p-2.5 bg-ink-accentA border-t border-b border-ink-accentA space-y-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Tên bài học mới…"
                                                                value={newLessonTitle}
                                                                onChange={(e) => setNewLessonTitle(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleQuickAddLesson(chapter.id);
                                                                }}
                                                                className="w-full px-2.5 py-1.5 bg-ink-panel border border-ink-borderHi rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ink-accent"
                                                                autoFocus
                                                            />
                                                            <div className="flex items-center justify-between gap-2">
                                                                <select
                                                                    value={newLessonType}
                                                                    onChange={(e) => setNewLessonType(e.target.value as 'VIDEO' | 'QUIZ')}
                                                                    className="px-2 py-1 bg-ink-panel border border-ink-borderHi rounded-lg text-xs text-ink-text"
                                                                >
                                                                    <option value="VIDEO">📹 Video</option>
                                                                    <option value="QUIZ">📝 Quiz</option>
                                                                </select>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => setAddingLessonChapterId(null)}
                                                                        disabled={creatingLesson}
                                                                        className="px-2 py-1 text-xs text-ink-textMuted hover:text-ink-text disabled:opacity-50"
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                    <Button
                                                                        onClick={() => handleQuickAddLesson(chapter.id)}
                                                                        disabled={creatingLesson}
                                                                        size="sm"
                                                                        className="text-xs py-1 h-7 bg-ink-accent text-white"
                                                                    >
                                                                        {creatingLesson ? 'Đang tạo…' : 'Tạo'}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Lessons List */}
                                                    <div className="p-1 space-y-1">
                                                        {chapter.lessons.length === 0 ? (
                                                            <p className="text-[11px] text-ink-textDim italic px-3 py-1.5 text-center">
                                                                Chưa có bài học trong chương này
                                                            </p>
                                                        ) : (
                                                            chapter.lessons.map((lesson: Lesson, lIdx: number) => {
                                                                const isLessonSelected = selectedItem?.id === lesson.id && !('lessons' in selectedItem);
                                                                return (
                                                                    <div
                                                                        key={lesson.id}
                                                                        onClick={() => selectLesson(lesson)}
                                                                        className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                                                                            isLessonSelected
                                                                                ? 'bg-ink-accentA text-ink-text font-semibold'
                                                                                : 'hover:bg-ink-pageDim/80 text-ink-text'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                            {/* Porting motif TYPE_META từ vibe-demo/edit-space: badge mực
                                                                                nhạt cùng màu accent cho mọi loại bài, chỉ đổi icon — thay
                                                                                emoji 📹/📝 cũ, đồng bộ ngôn ngữ hình khối với các badge
                                                                                loại bài khác trong hệ thống. */}
                                                                            <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-ink-sm bg-ink-accentA text-ink-accent">
                                                                                {lesson.type === 'VIDEO' ? <Play size={10} /> : <HelpCircle size={10} />}
                                                                            </span>
                                                                            <span className="truncate">{lesson.title}</span>
                                                                        </div>

                                                                        {/* Action buttons on hover */}
                                                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                                            <button
                                                                                disabled={lIdx === 0}
                                                                                onClick={() => handleMoveLesson(chapter.id, lesson.id, -1)}
                                                                                className="p-1 text-ink-textDim hover:text-ink-text disabled:opacity-30 rounded hover:bg-ink-border"
                                                                                title="Lên"
                                                                            >
                                                                                ↑
                                                                            </button>
                                                                            <button
                                                                                disabled={lIdx === chapter.lessons.length - 1}
                                                                                onClick={() => handleMoveLesson(chapter.id, lesson.id, 1)}
                                                                                className="p-1 text-ink-textDim hover:text-ink-text disabled:opacity-30 rounded hover:bg-ink-border"
                                                                                title="Xuống"
                                                                            >
                                                                                ↓
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setLessonToDelete({ chapterId: chapter.id, lessonId: lesson.id })}
                                                                                className="p-1 text-ink-textDim hover:text-red-600 rounded hover:bg-red-50"
                                                                                title="Xóa"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Add Chapter Section */}
                                <div className="mt-4 pt-3 border-t border-ink-pageDim">
                                    {showAddChapter ? (
                                        <div className="space-y-2 bg-ink-page p-3 rounded-ink-md border border-ink-border">
                                            <input
                                                type="text"
                                                placeholder="Tên chương mới…"
                                                value={chapterForm.title}
                                                onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleCreateChapter();
                                                }}
                                                className="w-full px-3 py-2 bg-ink-panel border border-ink-borderHi rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ink-accent"
                                                autoFocus
                                            />
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setShowAddChapter(false)}
                                                    className="px-2.5 py-1 text-xs text-ink-textMuted hover:text-ink-text"
                                                >
                                                    Hủy
                                                </button>
                                                <Button
                                                    onClick={handleCreateChapter}
                                                    disabled={chapterCreating}
                                                    size="sm"
                                                    className="text-xs py-1 h-8 bg-ink-accent text-white"
                                                >
                                                    {chapterCreating ? 'Đang tạo…' : 'Xác nhận tạo'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setChapterForm({ title: '', orderIndex: space.chapters.length });
                                                setShowAddChapter(true);
                                            }}
                                            className="w-full py-2.5 px-3 border border-dashed border-ink-borderHi hover:border-ink-accent hover:bg-ink-accentA rounded-ink-md text-xs font-semibold text-ink-accent transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                            </svg>
                                            <span>Thêm chương mới</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Main Editor Panel */}
                        <div className="flex-1">
                            <div className="bg-ink-panel rounded-ink-lg border border-ink-border shadow-ink-sm p-6 min-h-[500px]">
                                {editState === 'idle' && selectedItem && 'lessons' in selectedItem ? (
                                    /* Chapter Edit Form */
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-ink-pageDim pb-4">
                                            <div>
                                                <span className="text-xs font-semibold text-ink-accent uppercase tracking-wide">
                                                    Chỉnh sửa chương
                                                </span>
                                                <h3 className="text-lg font-bold text-ink-text mt-1">
                                                    {selectedItem.title}
                                                </h3>
                                            </div>
                                            <span className="text-xs text-ink-textDim">
                                                {selectedItem.lessons.length} bài học
                                            </span>
                                        </div>

                                        <div className="space-y-4 max-w-lg">
                                            <div>
                                                <label className="block text-xs font-semibold text-ink-text mb-1.5">
                                                    Tên chương
                                                </label>
                                                <input
                                                    type="text"
                                                    value={chapterForm.title}
                                                    onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                                    className="w-full px-3.5 py-2.5 border border-ink-borderHi rounded-ink-md text-sm focus:outline-none focus:ring-2 focus:ring-ink-accent"
                                                />
                                            </div>

                                            <div className="flex items-center gap-3 pt-2">
                                                <Button
                                                    onClick={handleUpdateChapter}
                                                    disabled={savingChapter}
                                                    className="bg-ink-accent hover:bg-ink-accent text-white"
                                                >
                                                    {savingChapter ? 'Đang lưu…' : 'Cập nhật tên chương'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setChapterToDelete(selectedItem.id)}
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                >
                                                    Xóa chương này
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : editState === 'editingVideo' ? (
                                    /* Video Lesson Form */
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-ink-pageDim pb-4">
                                            <div>
                                                {parentChapterOfSelected && (
                                                    <p className="text-xs text-ink-textDim mb-1.5">
                                                        {parentChapterOfSelected.title} <span className="mx-1">›</span> {lessonForm.title || 'Bài học mới'}
                                                    </p>
                                                )}
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-accent bg-ink-accentA px-2.5 py-0.5 rounded-full mb-1">
                                                    📹 Bài học Video
                                                </span>
                                                <h3 className="text-lg font-bold text-ink-text">
                                                    {lessonForm.title || 'Chi tiết bài học'}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            {/* Inputs Column */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-ink-text mb-1.5">
                                                        Tên bài học
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={lessonForm.title}
                                                        onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                                        placeholder="Nhập tên bài học…"
                                                        className="w-full px-3.5 py-2.5 border border-ink-borderHi rounded-ink-md text-sm focus:outline-none focus:ring-2 focus:ring-ink-accent"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-ink-text mb-1.5">
                                                        Đường dẫn Video (YouTube)
                                                    </label>
                                                    <input
                                                        type="url"
                                                        value={lessonForm.videoUrl}
                                                        onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                                                        placeholder="https://www.youtube.com/watch?v=…"
                                                        className="w-full px-3.5 py-2.5 border border-ink-borderHi rounded-ink-md text-sm focus:outline-none focus:ring-2 focus:ring-ink-accent"
                                                    />
                                                    {lessonForm.videoUrl && !extractYoutubeId(lessonForm.videoUrl) ? (
                                                        <p className="text-[11px] text-red-600 mt-1 font-medium">
                                                            Không phải link YouTube hợp lệ.
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] text-ink-textDim mt-1">
                                                            Hỗ trợ link YouTube tiêu chuẩn hoặc link ngắn (youtu.be).
                                                        </p>
                                                    )}
                                                </div>

                                                <Button
                                                    onClick={handleSaveLesson}
                                                    disabled={savingLesson || !lessonForm.title.trim()}
                                                    className="bg-ink-accent hover:bg-ink-accent text-white"
                                                >
                                                    {savingLesson ? 'Đang lưu…' : 'Lưu bài học'}
                                                </Button>
                                            </div>

                                            {/* Preview Column */}
                                            <div>
                                                <label className="block text-xs font-semibold text-ink-text mb-1.5">
                                                    Xem trước Video Player
                                                </label>
                                                {lessonForm.videoUrl && extractYoutubeId(lessonForm.videoUrl) ? (
                                                    <div className="aspect-video bg-black rounded-ink-lg overflow-hidden shadow-ink-sm border border-ink-border">
                                                        <iframe
                                                            src={`https://www.youtube.com/embed/${extractYoutubeId(lessonForm.videoUrl)}`}
                                                            className="w-full h-full"
                                                            allowFullScreen
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="aspect-video bg-ink-pageDim rounded-ink-lg border-2 border-dashed border-ink-border flex flex-col items-center justify-center p-6 text-center text-ink-textDim">
                                                        <svg className="w-12 h-12 mb-2 text-ink-borderHi" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.897L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                                        </svg>
                                                        <p className="text-xs font-medium">Chưa có link YouTube</p>
                                                        <p className="text-[11px] mt-1 text-ink-textDim">Dán link YouTube ở cột bên trái để hiển thị xem trước tại đây.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* AI trong editor — bổ sung gap: chỉ hiện khi bài học có sourceId
                                            (tạo từ link, có transcript để AI đọc). Luôn optional, luôn do user
                                            chủ động bấm — không có gì tự chạy khi mở editor/thêm lesson mới. */}
                                        {lessonForm.sourceId && (
                                            <div className="border-t border-ink-pageDim pt-6">
                                                <h4 className="text-xs font-bold text-ink-text uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-ink-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                                    </svg>
                                                    Dùng AI cho bài này
                                                </h4>
                                                <p className="text-[11px] text-ink-textDim mb-3">
                                                    AI đọc nội dung video này để tóm tắt hoặc tạo sẵn 1 bài quiz — chỉ chạy khi bạn bấm,
                                                    kết quả quiz sẽ tự tạo ngay thành 1 bài học mới trong chương này.
                                                </p>

                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={handleGenerateAISummary}
                                                        disabled={aiLoading !== null}
                                                        className="flex-1"
                                                    >
                                                        {aiLoading === 'summary' ? 'Đang tóm tắt…' : (aiSummary ? 'Tóm tắt lại' : 'AI tóm tắt bài này')}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => lessonForm.sourceId && handleGenerateAndCreateAIQuizLesson(lessonForm.sourceId)}
                                                        disabled={aiLoading !== null}
                                                        className="flex-1"
                                                    >
                                                        {aiLoading === 'quiz' ? 'Đang tạo quiz…' : (aiQuizDraft ? 'Tạo quiz lại' : 'AI tạo quiz 10 câu')}
                                                    </Button>
                                                </div>

                                                {aiError && (
                                                    <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                                                        {aiError}
                                                        {aiErrorCode === 'AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID' && (
                                                            <button
                                                                onClick={() => lessonForm.sourceId && handleGenerateAndCreateAIQuizLesson(lessonForm.sourceId, 'CREDITS')}
                                                                disabled={aiLoading !== null}
                                                                className="mt-2 block px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                                                            >
                                                                Trả phí để nền tảng tạo giúp
                                                            </button>
                                                        )}
                                                        {aiErrorCode === 'AI_INSUFFICIENT_CREDITS' && (
                                                            <a href="/billing" className="mt-2 block px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-amber-600 text-white hover:bg-amber-700 w-fit">
                                                                Mua thêm credit
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                {aiSummary && (
                                                    <div className="mt-3 p-3 rounded-lg bg-ink-page border border-ink-pageDim">
                                                        <p className="text-xs font-semibold text-ink-textMuted mb-1.5">Tóm tắt</p>
                                                        <MarkdownText text={aiSummary} className="text-sm text-ink-text" />
                                                    </div>
                                                )}

                                                {aiQuizDraft && (
                                                    // vd-ink-in — bản nháp AI vừa sinh ra, chưa lưu; viền nét đứt
                                                    // border-ink-pencil bên dưới đánh dấu đây là "bản thảo" (motif
                                                    // pencilLn của theme.ts), khác với câu hỏi đã lưu (viền liền).
                                                    <div className="mt-3 vd-ink-in">
                                                        {aiQuizServedFromCache && (
                                                            <p className="text-[11px] text-ink-accent mb-1.5">
                                                                ℹ️ Video này đã có bản quiz AI tạo trước đó (dùng lại, không tốn thêm
                                                                lượt gọi AI) — nếu bài quiz khác trong chương cũng chọn video này làm
                                                                nguồn, câu hỏi sẽ giống hệt nhau.
                                                            </p>
                                                        )}
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-xs font-semibold text-ink-textMuted">
                                                                Xem trước quiz do AI tạo ({aiQuizDraft.length} câu)
                                                            </p>
                                                            <Button
                                                                onClick={handleCreateQuizLessonFromAIDraft}
                                                                disabled={creatingAIQuizLesson}
                                                                className="vd-focusable bg-emerald-600 hover:bg-emerald-700 text-white"
                                                            >
                                                                {creatingAIQuizLesson ? 'Đang tạo…' : 'Tạo bài quiz mới từ đây'}
                                                            </Button>
                                                        </div>
                                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                                            {aiQuizDraft.map((q, idx) => (
                                                                <div key={idx} className="border border-dashed border-ink-pencil rounded-ink-md p-4 bg-ink-page/50">
                                                                    <p className="text-xs font-bold text-ink-text mb-2">
                                                                        Câu {idx + 1}: {q.content}
                                                                    </p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                        {q.options.map((opt, optIdx) => (
                                                                            <div
                                                                                key={optIdx}
                                                                                className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                                                                                    opt.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()
                                                                                        ? 'bg-emerald-100/70 text-emerald-800 font-semibold border border-emerald-300'
                                                                                        : 'bg-ink-panel text-ink-textMid border border-ink-border'
                                                                                }`}
                                                                            >
                                                                                <span>{opt}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : editState === 'editingQuiz' ? (
                                    /* Quiz Lesson Form */
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-ink-pageDim pb-4">
                                            <div>
                                                {parentChapterOfSelected && (
                                                    <p className="text-xs text-ink-textDim mb-1.5">
                                                        {parentChapterOfSelected.title} <span className="mx-1">›</span> {lessonForm.title || 'Bài học mới'}
                                                    </p>
                                                )}
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-accent bg-ink-accentA px-2.5 py-0.5 rounded-full mb-1">
                                                    📝 Bài học Quiz Trắc nghiệm
                                                </span>
                                                <h3 className="text-lg font-bold text-ink-text">
                                                    {lessonForm.title || 'Chi tiết bài học Quiz'}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {/* 2 zone cạnh nhau thay vì xếp trên-dưới (quyết định 2026-09-04):
                                                "Tên bài học + Lưu" bên trái, "Dùng AI tạo quiz" bên phải — 2 việc
                                                độc lập nhau (đổi tên vs sinh quiz), không có lý do phải đọc xong
                                                cái này mới thấy cái kia. Cùng pattern grid xl:grid-cols-2 panel
                                                VIDEO đang dùng (input trái, preview phải). */}
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-ink-text mb-1.5">
                                                            Tên bài học
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={lessonForm.title}
                                                            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                                            placeholder="Nhập tên bài học Quiz…"
                                                            className="w-full px-3.5 py-2.5 border border-ink-borderHi rounded-ink-md text-sm focus:outline-none focus:ring-2 focus:ring-ink-accent"
                                                        />
                                                    </div>

                                                    <Button
                                                        onClick={handleSaveLesson}
                                                        disabled={savingLesson || !lessonForm.title.trim()}
                                                        className="bg-ink-accent hover:bg-ink-accent text-white"
                                                    >
                                                        {savingLesson ? 'Đang lưu…' : 'Lưu tên bài học'}
                                                    </Button>
                                                </div>

                                                {/* Bổ sung: lesson QUIZ tự nó không có sourceId (tạo tay hoặc rỗng),
                                                    nên cho chọn 1 video làm nguồn để AI sinh quiz — trước đây chỉ có
                                                    mỗi đường upload Excel thủ công ở đây. Nguồn lấy từ TOÀN BỘ space
                                                    (không chỉ chương hiện tại) vì user có thể muốn dùng video ở chương
                                                    khác làm nguồn cho quiz này — luôn hiện dropdown (kể cả khi chỉ có
                                                    1 video) để rõ ràng là chọn được, không phải cố định. */}
                                                {(() => {
                                                    const videoCandidates = space.chapters
                                                        .flatMap(ch => ch.lessons.map(l => ({ ...l, chapterTitle: ch.title })))
                                                        .filter((l): l is Lesson & { sourceId: number; chapterTitle: string } => l.type === 'VIDEO' && !!l.sourceId);
                                                    if (videoCandidates.length === 0) return null;
                                                    const inSameChapter = videoCandidates.filter(l => l.chapterTitle === parentChapterOfSelected?.title);
                                                    const defaultSourceId = inSameChapter[0]?.sourceId ?? videoCandidates[0].sourceId;
                                                    const selectedSourceId = aiQuizSourceLessonId ?? defaultSourceId;
                                                    const selectedVideo = videoCandidates.find(l => l.sourceId === selectedSourceId) ?? videoCandidates[0];
                                                    const multiChapter = new Set(videoCandidates.map(l => l.chapterTitle)).size > 1;
                                                    return (
                                                        <div>
                                                            <h4 className="text-xs font-bold text-ink-text uppercase tracking-wider mb-2">
                                                                Dùng AI tạo quiz cho bài “{lessonForm.title || 'chưa đặt tên'}”
                                                            </h4>
                                                            <p className="text-[11px] text-ink-textDim mb-2">
                                                                Chọn 1 video làm nguồn để AI đọc và sinh quiz. Kết quả hiện ra thành bản
                                                                nháp trong khu vực “Câu hỏi” bên dưới — bấm “Lưu vào bài quiz này” mới
                                                                thật sự thay thế câu hỏi hiện có, <strong>không đụng tới video hay bài quiz nào khác</strong>.
                                                            </p>
                                                            <div className="relative mb-2">
                                                                <select
                                                                    value={selectedSourceId}
                                                                    onChange={(e) => setAiQuizSourceLessonId(Number(e.target.value))}
                                                                    className="w-full appearance-none pl-3 pr-9 py-2.5 text-xs font-medium border border-ink-borderHi rounded-ink-md bg-ink-panel text-ink-text hover:border-ink-accent focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-ink-accent transition-colors cursor-pointer"
                                                                >
                                                                    {videoCandidates.map((l) => (
                                                                        <option key={l.id} value={l.sourceId}>
                                                                            {multiChapter ? `${l.chapterTitle} › ${l.title}` : l.title}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <svg
                                                                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-textDim"
                                                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                                                >
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                                                                </svg>
                                                            </div>
                                                            <p className="text-[11px] text-ink-textMuted mb-2">
                                                                Nguồn hiện chọn: <span className="font-semibold text-ink-text">{selectedVideo.title}</span>
                                                            </p>
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => handleGenerateAIQuiz(selectedSourceId)}
                                                                disabled={aiLoading !== null}
                                                                className="w-full"
                                                            >
                                                                {aiLoading === 'quiz' ? 'Đang tạo quiz…' : (aiQuizDraft ? 'Tạo quiz lại' : 'AI tạo quiz 10 câu')}
                                                            </Button>

                                                            {aiError && (
                                                                <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                                                                    {aiError}
                                                                    {aiErrorCode === 'AI_CUSTOM_RECIPE_REQUIRES_BYOK_OR_PAID' && (
                                                                        <button
                                                                            onClick={() => handleGenerateAIQuiz(selectedSourceId, 'CREDITS')}
                                                                            disabled={aiLoading !== null}
                                                                            className="mt-2 block px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                                                                        >
                                                                            Trả phí để nền tảng tạo giúp
                                                                        </button>
                                                                    )}
                                                                    {aiErrorCode === 'AI_INSUFFICIENT_CREDITS' && (
                                                                        <a href="/billing" className="mt-2 block px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-amber-600 text-white hover:bg-amber-700 w-fit">
                                                                            Mua thêm credit
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {aiQuizDraft && aiQuizServedFromCache && (
                                                                <p className="mt-2 text-[11px] text-ink-accent">
                                                                    ℹ️ Video “{selectedVideo.title}” đã có bản quiz AI tạo trước đó
                                                                    (dùng lại, không tốn thêm lượt gọi AI) — nếu bài quiz khác trong
                                                                    chương cũng chọn video này, câu hỏi sẽ giống hệt nhau.
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Câu hỏi — gộp làm 1 khu vực duy nhất (quyết định 2026-09-04): trước
                                                đó "Câu hỏi hiện có" (đã lưu) và "Xem trước quiz AI" (bản nháp chưa
                                                lưu) là 2 danh sách gần giống hệt nhau xếp chồng lên nhau, dễ nhầm
                                                cái nào mới là dữ liệu thật — đặc biệt rối khi vừa tạo quiz từ nút
                                                "AI tạo quiz 10 câu" ở panel video rồi nhảy thẳng vào đây, câu hỏi
                                                AI vừa tạo hiện sẵn ở "Câu hỏi hiện có" phía trên. Giờ chỉ hiện 1
                                                trong 2: có bản nháp thì ưu tiên hiện bản nháp (viền nét đứt, có nút
                                                Lưu/Hủy); không thì hiện câu hỏi đã lưu. */}
                                            <div className="border-t border-ink-pageDim pt-4">
                                                {aiQuizDraft ? (
                                                    <>
                                                        <div className="flex items-center justify-between mb-3 gap-2">
                                                            <h4 className="text-xs font-bold text-ink-text uppercase tracking-wider">
                                                                Bản nháp quiz AI ({aiQuizDraft.length} câu) — chưa lưu
                                                            </h4>
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setAiQuizDraft(null); setAiQuizServedFromCache(false); }}
                                                                    className="text-xs font-semibold text-ink-textDim hover:text-ink-text hover:underline"
                                                                >
                                                                    Hủy bản nháp
                                                                </button>
                                                                <Button
                                                                    onClick={handleSaveAIQuizDraftIntoCurrentLesson}
                                                                    disabled={savingAIQuizIntoCurrentLesson}
                                                                    className="vd-focusable bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                >
                                                                    {savingAIQuizIntoCurrentLesson ? 'Đang lưu…' : 'Lưu vào bài quiz này'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                                            {aiQuizDraft.map((q, idx) => (
                                                                <div key={idx} className="border border-dashed border-ink-pencil rounded-ink-md p-4 bg-ink-page/50">
                                                                    <p className="text-xs font-bold text-ink-text mb-2">
                                                                        Câu {idx + 1}: {q.content}
                                                                    </p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                        {q.options.map((opt, optIdx) => (
                                                                            <div
                                                                                key={optIdx}
                                                                                className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                                                                                    opt.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()
                                                                                        ? 'bg-emerald-100/70 text-emerald-800 font-semibold border border-emerald-300'
                                                                                        : 'bg-ink-panel text-ink-textMid border border-ink-border'
                                                                                }`}
                                                                            >
                                                                                <span>{opt}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                ) : loadingLessonDetail ? (
                                                    <p className="text-xs text-ink-textDim">Đang tải câu hỏi hiện có…</p>
                                                ) : existingQuizQuestions && existingQuizQuestions.length > 0 ? (
                                                    <>
                                                        <h4 className="text-xs font-bold text-ink-text uppercase tracking-wider mb-3">
                                                            Câu hỏi hiện có ({existingQuizQuestions.length})
                                                        </h4>
                                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                                            {existingQuizQuestions.map((q, idx) => {
                                                                const correctIdx = getCorrectOptionIndex(q);
                                                                return (
                                                                    <div key={q.id ?? idx} className="border border-ink-border rounded-ink-md p-4 bg-ink-page/50">
                                                                        <p className="text-xs font-bold text-ink-text mb-2">
                                                                            Câu {idx + 1}: {getQuestionText(q)}
                                                                        </p>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                            {q.options.map((opt, optIdx) => (
                                                                                <div
                                                                                    key={optIdx}
                                                                                    className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                                                                                        optIdx === correctIdx
                                                                                            ? 'bg-emerald-100/70 text-emerald-800 font-semibold border border-emerald-300'
                                                                                            : 'bg-ink-panel text-ink-textMid border border-ink-border'
                                                                                    }`}
                                                                                >
                                                                                    <span>{opt}</span>
                                                                                    {optIdx === correctIdx && (
                                                                                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                                                                                            ĐÚNG
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-ink-textDim">Chưa có câu hỏi nào trong bài học này.</p>
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-1.5 gap-2">
                                                    <label className="block text-xs font-semibold text-ink-text">
                                                        Tải lên bộ câu hỏi từ Excel (.xlsx) — sẽ thay thế toàn bộ câu hỏi hiện có
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={handleDownloadQuizTemplate}
                                                        className="shrink-0 text-xs font-semibold text-ink-accent hover:text-ink-accent hover:underline whitespace-nowrap"
                                                    >
                                                        ⬇ Tải file mẫu
                                                    </button>
                                                </div>
                                                <div className="border-2 border-dashed border-ink-border hover:border-ink-accent bg-ink-page/50 rounded-ink-lg p-6 text-center transition-colors">
                                                    <input
                                                        type="file"
                                                        accept=".xlsx"
                                                        onChange={(e) => setQuizFile(e.target.files?.[0] || null)}
                                                        className="hidden"
                                                        id="quiz-file-upload"
                                                    />
                                                    <label htmlFor="quiz-file-upload" className="cursor-pointer block">
                                                        <div className="w-10 h-10 rounded-full bg-ink-accentA text-ink-accent flex items-center justify-center mx-auto mb-2">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                                            </svg>
                                                        </div>
                                                        <span className="text-xs font-semibold text-ink-accent hover:underline">
                                                            {quizFile ? quizFile.name : 'Bấm để chọn tệp Excel (.xlsx)'}
                                                        </span>
                                                        <p className="text-[11px] text-ink-textDim mt-1">
                                                            Tệp chứa các cột: Câu hỏi, Đáp án A, B, C, D, Đáp án đúng.
                                                        </p>
                                                    </label>
                                                </div>

                                                {quizUploadedCount !== null && (
                                                    <p className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                                        <span>✓</span> Đã lưu {quizUploadedCount} câu hỏi vào bài học này
                                                    </p>
                                                )}
                                            </div>

                                            {quizFile && (
                                                <div className="flex gap-3 pt-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={handleParseQuiz}
                                                        disabled={isProcessing}
                                                        className="flex-1"
                                                    >
                                                        {isProcessing ? 'Đang đọc tệp…' : 'Xem trước câu hỏi'}
                                                    </Button>
                                                    {parsedQuestions && (
                                                        <Button
                                                            onClick={handleUploadQuiz}
                                                            disabled={isProcessing}
                                                            className="vd-focusable flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        >
                                                            {isProcessing ? 'Đang tải lên…' : 'Xác nhận Tải lên'}
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Quiz Questions Preview */}
                                        {isReviewing && parsedQuestions && (
                                            // vd-ink-in — vừa parse xong từ Excel, chưa "Xác nhận Tải lên";
                                            // các card câu hỏi bên dưới dùng viền nét đứt border-ink-pencil
                                            // (motif pencilLn) để đánh dấu đây vẫn là bản thảo, chưa lưu.
                                            <div className="mt-6 pt-6 border-t border-ink-pageDim vd-ink-in">
                                                <h4 className="text-xs font-bold text-ink-text uppercase tracking-wider mb-3">
                                                    Xem trước danh sách câu hỏi ({parsedQuestions.questions.length})
                                                </h4>
                                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                                    {parsedQuestions.questions.map((q, idx) => (
                                                        <div key={idx} className="border border-dashed border-ink-pencil rounded-ink-md p-4 bg-ink-page/50">
                                                            <p className="text-xs font-bold text-ink-text mb-2">
                                                                Câu {idx + 1}: {q.text}
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {q.options.map((opt, optIdx) => (
                                                                    <div
                                                                        key={optIdx}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                                                                            optIdx === q.correctId
                                                                                ? 'bg-emerald-100/70 text-emerald-800 font-semibold border border-emerald-300'
                                                                                : 'bg-ink-panel text-ink-textMid border border-ink-border'
                                                                        }`}
                                                                    >
                                                                        <span>{opt}</span>
                                                                        {optIdx === q.correctId && (
                                                                            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                                                                                ĐÚNG
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Empty State when no item is selected */
                                    <div className="h-full flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-12 h-12 rounded-full bg-ink-pageDim text-ink-textDim flex items-center justify-center mb-3">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
                                            </svg>
                                        </div>
                                        <h3 className="text-sm font-bold text-ink-text mb-1">
                                            Chọn một bài học hoặc chương để chỉnh sửa
                                        </h3>
                                        <p className="text-xs text-ink-textDim max-w-sm">
                                            Bấm vào danh sách bên trái để xem và cập nhật chi tiết nội dung.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Tab 2: Settings & Share Link */
                    <div className="max-w-3xl mx-auto space-y-6">
                        {/* Space Metadata Card */}
                        <div className="bg-ink-panel rounded-ink-lg border border-ink-border shadow-ink-sm p-6">
                            <h2 className="text-base font-bold text-ink-text mb-4 pb-3 border-b border-ink-pageDim flex items-center gap-2">
                                <svg className="w-5 h-5 text-ink-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                Thông tin cơ bản Space
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-ink-text mb-1.5">
                                        Tên Space
                                    </label>
                                    <input
                                        type="text"
                                        value={metaTitle}
                                        onChange={(e) => setMetaTitle(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-ink-borderHi rounded-ink-md text-sm focus:outline-none focus:ring-2 focus:ring-ink-accent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-ink-text mb-1.5">
                                        Mô tả tổng quan Space
                                    </label>
                                    <textarea
                                        value={metaDesc}
                                        onChange={(e) => setMetaDesc(e.target.value)}
                                        rows={4}
                                        className="w-full px-3.5 py-2.5 border border-ink-borderHi rounded-ink-md text-sm focus:outline-none focus:ring-2 focus:ring-ink-accent resize-none"
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        onClick={handleSaveSettings}
                                        disabled={savingMeta}
                                        className="bg-ink-accent hover:bg-ink-accent text-white"
                                    >
                                        {savingMeta ? 'Đang lưu…' : 'Cập nhật thông tin'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Share Link Card */}
                        <div className="bg-ink-panel rounded-ink-lg border border-ink-border shadow-ink-sm p-6">
                            <h2 className="text-base font-bold text-ink-text mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5 text-ink-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                                </svg>
                                Link chia sẻ Space (Public Share)
                            </h2>
                            <p className="text-xs text-ink-textMuted mb-4 leading-relaxed">
                                Tạo đường dẫn ổn định cho Space. Bất kỳ ai có link này đều có thể xem trước nội dung và bấm &quot;Sao chép về học&quot; để lưu Space vào tài khoản cá nhân của họ.
                            </p>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl || 'Bấm nút để lấy link chia sẻ…'}
                                    className="flex-1 px-3.5 py-2.5 bg-ink-page border border-ink-border rounded-ink-md text-xs font-mono text-ink-textMid focus:outline-none"
                                />
                                <Button
                                    onClick={handleCopyShareLink}
                                    disabled={generatingShare}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                                >
                                    {generatingShare ? 'Đang tạo…' : 'Sao chép Link'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
