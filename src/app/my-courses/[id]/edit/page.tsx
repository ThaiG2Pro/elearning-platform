'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    getCourseStructure,
    createSection,
    updateSection,
    deleteSection,
    createLesson,
    deleteLesson,
    parseQuizFile,
    uploadQuizFile,
    updateCourseContent,
    updateCourseMetadata,
    getOrCreateShareLink,
} from '@/lib/management';
import {
    CourseStructure,
    Chapter,
    Lesson,
    LessonEdit,
    ChapterEdit,
    QuizParseResponse
} from '@/types/management.types';
import { Button } from '@/components/ui/button';
import Toast from '@/components/Toast';

type EditState = 'idle' | 'editingVideo' | 'editingQuiz' | 'processing' | 'reviewing';

const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/)([^&\s?/]+)/);
    return match ? match[1] : null;
};

export default function CourseEditPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = parseInt(params.id as string);

    // Main States
    const [activeTab, setActiveTab] = useState<'curriculum' | 'settings'>('curriculum');
    const [course, setCourse] = useState<CourseStructure | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Selection & Edit States
    const [editState, setEditState] = useState<EditState>('idle');
    const [selectedItem, setSelectedItem] = useState<Chapter | Lesson | null>(null);
    const [parsedQuestions, setParsedQuestions] = useState<QuizParseResponse | null>(null);

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
        content: '',
        videoUrl: '',
        orderIndex: 0,
        type: 'VIDEO'
    });
    const [showAddChapter, setShowAddChapter] = useState(false);
    const [chapterCreating, setChapterCreating] = useState(false);
    const [addingLessonChapterId, setAddingLessonChapterId] = useState<number | null>(null);
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [newLessonType, setNewLessonType] = useState<'VIDEO' | 'QUIZ'>('VIDEO');
    const [quizFile, setQuizFile] = useState<File | null>(null);
    const [quizUploadedCount, setQuizUploadedCount] = useState<number | null>(null);

    const isProcessing = editState === 'processing';
    const isReviewing = editState === 'reviewing';
    const skipNextSync = useRef(false);

    // Fetch Course Structure
    const fetchCourseStructure = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const courseData = await getCourseStructure(courseId);
            setCourse(courseData);
            setMetaTitle(courseData.title || '');
            setMetaDesc(courseData.description || '');

            // Auto-select first lesson or first chapter if available
            if (courseData.chapters.length > 0) {
                const firstChapter = courseData.chapters[0];
                if (firstChapter.lessons.length > 0) {
                    const firstLesson = firstChapter.lessons[0];
                    setSelectedItem(firstLesson);
                    setLessonForm({
                        id: firstLesson.id,
                        title: firstLesson.title,
                        content: '',
                        videoUrl: firstLesson.videoUrl || (firstLesson as any).contentUrl || '',
                        orderIndex: firstLesson.orderIndex ?? 0,
                        type: firstLesson.type
                    });
                    setEditState(firstLesson.type === 'VIDEO' ? 'editingVideo' : 'editingQuiz');
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
    }, [courseId]);

    useEffect(() => {
        fetchCourseStructure();
    }, [fetchCourseStructure]);

    // Build Content Payload for Bulk Save
    const buildContentPayload = () => {
        return {
            sections: course?.chapters.map(ch => ({
                id: ch.id,
                title: ch.title,
                orderIndex: ch.orderIndex,
                lessons: ch.lessons
                    .filter(l => l.title && l.id)
                    .map(l => ({
                        id: l.id,
                        title: l.title,
                        type: l.type,
                        orderIndex: l.orderIndex ?? 0,
                        contentUrl: l.videoUrl || (l as any).contentUrl || undefined,
                    }))
            })) || []
        };
    };

    // Bulk Save Handler
    const handleSave = async () => {
        if (!course) return;
        setSaving(true);
        try {
            const payload = buildContentPayload();
            await updateCourseContent(courseId, payload);
            setHasUnsavedChanges(false);
            setToast({ message: 'Đã lưu cấu trúc khóa học thành công!', type: 'success' });
        } catch (err: any) {
            setError(err.message);
            setToast({ message: 'Không thể lưu khóa học: ' + err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Share Link Handler
    const handleCopyShareLink = async () => {
        try {
            setGeneratingShare(true);
            const res = await getOrCreateShareLink(courseId);
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
            await updateCourseMetadata(courseId, { title: metaTitle, description: metaDesc });
            setCourse(prev => prev ? { ...prev, title: metaTitle, description: metaDesc } : null);
            setToast({ message: 'Đã cập nhật thông tin khóa học!', type: 'success' });
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

    // Lesson Select
    const handleLessonSelect = (lesson: Lesson) => {
        skipNextSync.current = true;
        setSelectedItem(lesson);
        setQuizUploadedCount(null);
        if (lesson.type === 'VIDEO') {
            setEditState('editingVideo');
        } else if (lesson.type === 'QUIZ') {
            setEditState('editingQuiz');
        }
        setLessonForm({
            id: lesson.id,
            title: lesson.title,
            content: '',
            videoUrl: lesson.videoUrl || (lesson as any).contentUrl || '',
            orderIndex: lesson.orderIndex ?? 0,
            type: lesson.type
        });
    };

    // Create Chapter
    const handleCreateChapter = async () => {
        if (!course) return;
        setChapterCreating(true);
        try {
            const nextChapterIndex = course.chapters.length + 1;
            const titleToUse = chapterForm.title.trim() || `Chương ${nextChapterIndex}`;
            const res = await createSection(courseId, {
                title: titleToUse,
                orderIndex: nextChapterIndex
            });
            const newChapter: Chapter = {
                id: (res as any).id ?? (res as any).sectionId,
                title: titleToUse,
                orderIndex: nextChapterIndex,
                lessons: [],
            };
            setCourse(prev => prev ? {
                ...prev,
                chapters: [...prev.chapters, newChapter]
            } : null);
            setChapterForm({ title: '', orderIndex: 0 });
            setShowAddChapter(false);
            setSelectedItem(newChapter);
            setToast({ message: `Đã thêm Chương ${nextChapterIndex}!`, type: 'success' });
            setHasUnsavedChanges(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setChapterCreating(false);
        }
    };

    // Update Chapter
    const handleUpdateChapter = async () => {
        if (!chapterForm.id) return;
        try {
            setSaving(true);
            await updateSection(chapterForm.id, {
                title: chapterForm.title,
                orderIndex: chapterForm.orderIndex
            });
            setCourse(prev => prev ? {
                ...prev,
                chapters: prev.chapters.map(ch =>
                    ch.id === chapterForm.id ? { ...ch, title: chapterForm.title, orderIndex: chapterForm.orderIndex } : ch
                )
            } : null);
            setToast({ message: 'Đã cập nhật tên chương!', type: 'success' });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Delete Chapter
    const handleDeleteChapter = async (chapterId: number) => {
        if (!confirm('Xoá chương này và tất cả bài học bên trong? Không thể hoàn tác.')) return;
        try {
            await deleteSection(chapterId);
            setCourse(prev => prev ? {
                ...prev,
                chapters: prev.chapters.filter(ch => ch.id !== chapterId)
            } : null);
            setSelectedItem(null);
            setToast({ message: 'Đã xóa chương!', type: 'info' });
            setHasUnsavedChanges(true);
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Quick Add Lesson to Chapter
    const handleQuickAddLesson = async (chapterId: number) => {
        const targetChapter = course?.chapters.find(c => c.id === chapterId);
        if (!targetChapter) return;

        const nextIndex = targetChapter.lessons.length + 1;
        const titleToUse = newLessonTitle.trim() || `Bài ${nextIndex}`;

        try {
            const res = await createLesson(chapterId, {
                title: titleToUse,
                content: '',
                videoUrl: '',
                orderIndex: nextIndex,
                type: newLessonType
            });
            const newLesson: Lesson = {
                id: Number((res as any).lessonId ?? (res as any).id),
                title: titleToUse,
                type: newLessonType,
                orderIndex: nextIndex,
                videoUrl: '',
            };
            setCourse(prev => prev ? {
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
            handleLessonSelect(newLesson);
            setToast({ message: 'Đã thêm bài học mới!', type: 'success' });
            setHasUnsavedChanges(true);
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Delete Lesson
    const handleDeleteLesson = async (chapterId: number, lessonId: number) => {
        if (!confirm('Xoá bài học này? Không thể hoàn tác.')) return;
        try {
            await deleteLesson(lessonId);
            setCourse(prev => prev ? {
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
            setHasUnsavedChanges(true);
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Move Lesson
    const handleMoveLesson = (chapterId: number, lessonId: number, direction: -1 | 1) => {
        setCourse(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                chapters: prev.chapters.map(ch => {
                    if (ch.id !== chapterId) return ch;
                    const index = ch.lessons.findIndex(l => l.id === lessonId);
                    const targetIndex = index + direction;
                    if (index < 0 || targetIndex < 0 || targetIndex >= ch.lessons.length) return ch;
                    const lessons = [...ch.lessons];
                    [lessons[index], lessons[targetIndex]] = [lessons[targetIndex], lessons[index]];
                    lessons.forEach((l, i) => { l.orderIndex = i; });
                    return { ...ch, lessons };
                })
            };
        });
        setHasUnsavedChanges(true);
    };

    // In-memory sync of lessonForm edits into course state
    useEffect(() => {
        if (skipNextSync.current) {
            skipNextSync.current = false;
            return;
        }

        if (!selectedItem || (selectedItem as Chapter).lessons) return;
        const lesson = selectedItem as Lesson;
        if (!lesson.id) return;

        setCourse(prev => prev ? {
            ...prev,
            chapters: prev.chapters.map(ch => ({
                ...ch,
                lessons: ch.lessons.map(l => l.id === lesson.id ? {
                    ...l,
                    title: lessonForm.title,
                    videoUrl: lessonForm.videoUrl,
                    orderIndex: lessonForm.orderIndex,
                    type: lessonForm.type as Lesson['type'],
                } : l)
            }))
        } : null);
        setHasUnsavedChanges(true);
    }, [lessonForm.title, lessonForm.videoUrl, lessonForm.orderIndex, lessonForm.type, selectedItem]);

    // Parse Quiz
    const handleParseQuiz = async () => {
        if (!quizFile) return;
        setEditState('processing');
        try {
            const result = await parseQuizFile(quizFile);
            setParsedQuestions(result);
            setEditState('reviewing');
        } catch (err: any) {
            setError(err.message);
            setEditState('editingQuiz');
        }
    };

    // Upload Quiz
    const handleUploadQuiz = async () => {
        if (!quizFile || !selectedItem || (selectedItem as Lesson).type !== 'QUIZ') return;
        const lesson = selectedItem as Lesson;
        setEditState('processing');
        try {
            const result = await uploadQuizFile(lesson.id, quizFile);
            setQuizUploadedCount(result.uploadedCount);
            setQuizFile(null);
            setParsedQuestions(null);
            setEditState('editingQuiz');
            setToast({ message: `Đã tải lên ${result.uploadedCount} câu hỏi Quiz!`, type: 'success' });
        } catch (err: any) {
            setError(err.message);
            setEditState('editingQuiz');
        }
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
            default:
                return errorCode || 'Lỗi hệ thống.';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-9 w-9 border-2 border-indigo-600 border-t-transparent"/>
                    <p className="text-xs text-slate-500 font-medium">Đang tải trình chỉnh sửa khóa học…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
                    <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-2">Đã có lỗi xảy ra</h3>
                    <p className="text-sm text-slate-600 mb-6">{getErrorMessage(error)}</p>
                    <Button onClick={() => router.push('/')} className="w-full">
                        Quay lại trang chủ
                    </Button>
                </div>
            </div>
        );
    }

    if (!course) return null;

    const totalLessons = course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Toast Notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Left: Back & Title */}
                        <div className="flex items-center gap-4 min-w-0">
                            <button
                                onClick={() => router.push('/')}
                                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium focus:outline-none"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                                </svg>
                                <span>Trang chủ</span>
                            </button>

                            <div className="w-px h-5 bg-slate-200 hidden sm:block"/>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md leading-none">
                                        {course.title}
                                    </h1>
                                    {hasUnsavedChanges ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                            Chưa lưu
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Đã lưu
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {course.chapters.length} chương • {totalLessons} bài học
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
                                title="Sao chép link chia sẻ khóa học"
                            >
                                {generatingShare ? (
                                    <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"/>
                                ) : (
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                                    </svg>
                                )}
                                <span>Chia sẻ</span>
                            </Button>

                            {/* View Learning Page */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/courses/${courseId}/learn`)}
                                className="inline-flex items-center gap-1.5"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span>Vào học</span>
                            </Button>

                            {/* Save Button */}
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
                            >
                                {saving ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                        <span>Đang lưu…</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                                        </svg>
                                        <span>Lưu thay đổi</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Sub-Header Tabs */}
                    <div className="flex border-t border-slate-100 gap-6">
                        <button
                            onClick={() => setActiveTab('curriculum')}
                            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                                activeTab === 'curriculum'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
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
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            Cài đặt & Chia sẻ
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Body */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
                {activeTab === 'curriculum' ? (
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Sidebar: Course Tree */}
                        <div className="w-full lg:w-80 flex-shrink-0">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sticky top-36">
                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Nội dung khóa học
                                    </h2>
                                    <span className="text-xs text-slate-400 font-medium">
                                        {course.chapters.length} chương
                                    </span>
                                </div>

                                {/* Chapter Tree List */}
                                <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                                    {course.chapters.length === 0 ? (
                                        <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                                </svg>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-700 mb-1">Chưa có chương nào</p>
                                            <p className="text-xs text-slate-400 mb-4">Bắt đầu bằng cách tạo chương đầu tiên.</p>
                                            <Button
                                                onClick={() => {
                                                    setChapterForm({ title: 'Chương 1: Tổng quan', orderIndex: 0 });
                                                    setShowAddChapter(true);
                                                }}
                                                size="sm"
                                                className="w-full bg-indigo-600 text-white"
                                            >
                                                + Tạo chương đầu tiên
                                            </Button>
                                        </div>
                                    ) : (
                                        course.chapters.map((chapter: Chapter, chIdx: number) => {
                                            const isChapterSelected = selectedItem?.id === chapter.id && 'lessons' in selectedItem;
                                            return (
                                                <div
                                                    key={chapter.id}
                                                    className={`border rounded-xl transition-all overflow-hidden bg-white ${
                                                        isChapterSelected
                                                            ? 'border-indigo-400 ring-2 ring-indigo-50/50 shadow-xs'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {/* Chapter Header */}
                                                    <div
                                                        onClick={() => handleChapterSelect(chapter)}
                                                        className="px-3.5 py-2.5 cursor-pointer bg-slate-50/60 hover:bg-slate-100/80 transition-colors flex items-center justify-between gap-2"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-xs font-bold text-indigo-600 flex-shrink-0">
                                                                C{chIdx + 1}
                                                            </span>
                                                            <span className="text-xs font-semibold text-slate-800 truncate">
                                                                {chapter.title}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => {
                                                                    setAddingLessonChapterId(addingLessonChapterId === chapter.id ? null : chapter.id);
                                                                    setNewLessonTitle('');
                                                                }}
                                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded transition-colors"
                                                                title="Thêm bài học"
                                                            >
                                                                + Bài học
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteChapter(chapter.id)}
                                                                className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors text-xs"
                                                                title="Xóa chương"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Quick Add Lesson Input */}
                                                    {addingLessonChapterId === chapter.id && (
                                                        <div className="p-2.5 bg-indigo-50/50 border-t border-b border-indigo-100 space-y-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Tên bài học mới…"
                                                                value={newLessonTitle}
                                                                onChange={(e) => setNewLessonTitle(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleQuickAddLesson(chapter.id);
                                                                }}
                                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                autoFocus
                                                            />
                                                            <div className="flex items-center justify-between gap-2">
                                                                <select
                                                                    value={newLessonType}
                                                                    onChange={(e) => setNewLessonType(e.target.value as 'VIDEO' | 'QUIZ')}
                                                                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
                                                                >
                                                                    <option value="VIDEO">📹 Video</option>
                                                                    <option value="QUIZ">📝 Quiz</option>
                                                                </select>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => setAddingLessonChapterId(null)}
                                                                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                    <Button
                                                                        onClick={() => handleQuickAddLesson(chapter.id)}
                                                                        size="sm"
                                                                        className="text-xs py-1 h-7 bg-indigo-600 text-white"
                                                                    >
                                                                        Tạo
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Lessons List */}
                                                    <div className="p-1 space-y-1">
                                                        {chapter.lessons.length === 0 ? (
                                                            <p className="text-[11px] text-slate-400 italic px-3 py-1.5 text-center">
                                                                Chưa có bài học trong chương này
                                                            </p>
                                                        ) : (
                                                            chapter.lessons.map((lesson: Lesson, lIdx: number) => {
                                                                const isLessonSelected = selectedItem?.id === lesson.id && !('lessons' in selectedItem);
                                                                return (
                                                                    <div
                                                                        key={lesson.id}
                                                                        onClick={() => handleLessonSelect(lesson)}
                                                                        className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                                                                            isLessonSelected
                                                                                ? 'bg-indigo-50/90 text-indigo-900 font-semibold'
                                                                                : 'hover:bg-slate-100/80 text-slate-700'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                            <span className="text-slate-400 text-[11px]">
                                                                                {lesson.type === 'VIDEO' ? '📹' : '📝'}
                                                                            </span>
                                                                            <span className="truncate">{lesson.title}</span>
                                                                        </div>

                                                                        {/* Action buttons on hover */}
                                                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                                            <button
                                                                                disabled={lIdx === 0}
                                                                                onClick={() => handleMoveLesson(chapter.id, lesson.id, -1)}
                                                                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200"
                                                                                title="Lên"
                                                                            >
                                                                                ↑
                                                                            </button>
                                                                            <button
                                                                                disabled={lIdx === chapter.lessons.length - 1}
                                                                                onClick={() => handleMoveLesson(chapter.id, lesson.id, 1)}
                                                                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200"
                                                                                title="Xuống"
                                                                            >
                                                                                ↓
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteLesson(chapter.id, lesson.id)}
                                                                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
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
                                <div className="mt-4 pt-3 border-t border-slate-100">
                                    {showAddChapter ? (
                                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <input
                                                type="text"
                                                placeholder="Tên chương mới…"
                                                value={chapterForm.title}
                                                onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleCreateChapter();
                                                }}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                autoFocus
                                            />
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setShowAddChapter(false)}
                                                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                                                >
                                                    Hủy
                                                </button>
                                                <Button
                                                    onClick={handleCreateChapter}
                                                    disabled={chapterCreating}
                                                    size="sm"
                                                    className="text-xs py-1 h-8 bg-indigo-600 text-white"
                                                >
                                                    {chapterCreating ? 'Đang tạo…' : 'Xác nhận tạo'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setChapterForm({ title: '', orderIndex: course.chapters.length });
                                                setShowAddChapter(true);
                                            }}
                                            className="w-full py-2.5 px-3 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl text-xs font-semibold text-indigo-600 transition-colors flex items-center justify-center gap-1.5"
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
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 min-h-[500px]">
                                {editState === 'idle' && selectedItem && 'lessons' in selectedItem ? (
                                    /* Chapter Edit Form */
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div>
                                                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                                                    Chỉnh sửa chương
                                                </span>
                                                <h3 className="text-lg font-bold text-slate-900 mt-1">
                                                    {selectedItem.title}
                                                </h3>
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {selectedItem.lessons.length} bài học
                                            </span>
                                        </div>

                                        <div className="space-y-4 max-w-lg">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                    Tên chương
                                                </label>
                                                <input
                                                    type="text"
                                                    value={chapterForm.title}
                                                    onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>

                                            <div className="flex items-center gap-3 pt-2">
                                                <Button
                                                    onClick={handleUpdateChapter}
                                                    disabled={saving}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                                >
                                                    Cập nhật tên chương
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleDeleteChapter(selectedItem.id)}
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
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div>
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full mb-1">
                                                    📹 Bài học Video
                                                </span>
                                                <h3 className="text-lg font-bold text-slate-900">
                                                    {lessonForm.title || 'Chi tiết bài học'}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            {/* Inputs Column */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                        Tên bài học
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={lessonForm.title}
                                                        onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                                        placeholder="Nhập tên bài học…"
                                                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                        Đường dẫn Video (YouTube)
                                                    </label>
                                                    <input
                                                        type="url"
                                                        value={lessonForm.videoUrl}
                                                        onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                                                        placeholder="https://www.youtube.com/watch?v=…"
                                                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                    <p className="text-[11px] text-slate-400 mt-1">
                                                        Hỗ trợ link YouTube tiêu chuẩn hoặc link ngắn (youtu.be).
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                        Mô tả / Ghi chú cho bài học
                                                    </label>
                                                    <textarea
                                                        value={lessonForm.content}
                                                        onChange={(e) => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
                                                        rows={4}
                                                        placeholder="Nhập ghi chú hoặc hướng dẫn cho người học…"
                                                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Preview Column */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                    Xem trước Video Player
                                                </label>
                                                {lessonForm.videoUrl && extractYoutubeId(lessonForm.videoUrl) ? (
                                                    <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-xs border border-slate-200">
                                                        <iframe
                                                            src={`https://www.youtube.com/embed/${extractYoutubeId(lessonForm.videoUrl)}`}
                                                            className="w-full h-full"
                                                            allowFullScreen
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="aspect-video bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                                                        <svg className="w-12 h-12 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.897L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                                        </svg>
                                                        <p className="text-xs font-medium">Chưa có link YouTube</p>
                                                        <p className="text-[11px] mt-1 text-slate-400">Dán link YouTube ở cột bên trái để hiển thị xem trước tại đây.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : editState === 'editingQuiz' ? (
                                    /* Quiz Lesson Form */
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div>
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full mb-1">
                                                    📝 Bài học Quiz Trắc nghiệm
                                                </span>
                                                <h3 className="text-lg font-bold text-slate-900">
                                                    {lessonForm.title || 'Chi tiết bài học Quiz'}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="space-y-4 max-w-xl">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                    Tên bài học
                                                </label>
                                                <input
                                                    type="text"
                                                    value={lessonForm.title}
                                                    onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                                    placeholder="Nhập tên bài học Quiz…"
                                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                    Tải lên bộ câu hỏi từ Excel (.xlsx)
                                                </label>
                                                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 rounded-2xl p-6 text-center transition-colors">
                                                    <input
                                                        type="file"
                                                        accept=".xlsx"
                                                        onChange={(e) => setQuizFile(e.target.files?.[0] || null)}
                                                        className="hidden"
                                                        id="quiz-file-upload"
                                                    />
                                                    <label htmlFor="quiz-file-upload" className="cursor-pointer block">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                                            </svg>
                                                        </div>
                                                        <span className="text-xs font-semibold text-indigo-600 hover:underline">
                                                            {quizFile ? quizFile.name : 'Bấm để chọn tệp Excel (.xlsx)'}
                                                        </span>
                                                        <p className="text-[11px] text-slate-400 mt-1">
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
                                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        >
                                                            {isProcessing ? 'Đang tải lên…' : 'Xác nhận Tải lên'}
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Quiz Questions Preview */}
                                        {isReviewing && parsedQuestions && (
                                            <div className="mt-6 pt-6 border-t border-slate-100">
                                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                                                    Xem trước danh sách câu hỏi ({parsedQuestions.questions.length})
                                                </h4>
                                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                                    {parsedQuestions.questions.map((q, idx) => (
                                                        <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                                                            <p className="text-xs font-bold text-slate-800 mb-2">
                                                                Câu {idx + 1}: {q.text}
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {q.options.map((opt, optIdx) => (
                                                                    <div
                                                                        key={optIdx}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                                                                            optIdx === q.correctId
                                                                                ? 'bg-emerald-100/70 text-emerald-800 font-semibold border border-emerald-300'
                                                                                : 'bg-white text-slate-600 border border-slate-200'
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
                                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
                                            </svg>
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-700 mb-1">
                                            Chọn một bài học hoặc chương để chỉnh sửa
                                        </h3>
                                        <p className="text-xs text-slate-400 max-w-sm">
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
                        {/* Course Metadata Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                            <h2 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                Thông tin cơ bản khóa học
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Tên khóa học
                                    </label>
                                    <input
                                        type="text"
                                        value={metaTitle}
                                        onChange={(e) => setMetaTitle(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Mô tả tổng quan khóa học
                                    </label>
                                    <textarea
                                        value={metaDesc}
                                        onChange={(e) => setMetaDesc(e.target.value)}
                                        rows={4}
                                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        onClick={handleSaveSettings}
                                        disabled={savingMeta}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        {savingMeta ? 'Đang lưu…' : 'Cập nhật thông tin'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Share Link Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                                </svg>
                                Link chia sẻ khóa học (Public Share)
                            </h2>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Tạo đường dẫn ổn định cho khóa học. Bất kỳ ai có link này đều có thể xem trước nội dung và bấm &quot;Sao chép về học&quot; để lưu khóa học vào tài khoản cá nhân của họ.
                            </p>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl || 'Bấm nút để lấy link chia sẻ…'}
                                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 focus:outline-none"
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
