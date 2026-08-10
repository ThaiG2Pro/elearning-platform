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
} from '@/lib/management';
import {
    CourseStructure,
    Chapter,
    Lesson,
    LessonEdit,
    ChapterEdit,
    QuizParseResponse
} from '@/types/management.types';
// WP1.5.8: standardize on the shared Button component instead of each
// action re-implementing its own Tailwind classes — this page previously
// mixed bg-blue-600 and bg-indigo-600 for equivalent primary actions.
import { Button } from '@/components/ui/button';

// WP1.5.10: 'readOnly' dropped — no code path ever set it (courses are always
// editable by their owner now, there is no approval workflow that locks them).
type EditState = 'idle' | 'editingVideo' | 'editingQuiz' | 'processing' | 'reviewing';

const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/(?:v=|youtu\.be\/)([^&\s?/]+)/);
    return match ? match[1] : null;
};

const CourseEditPage = () => {
    const params = useParams();
    const router = useRouter();
    const courseId = parseInt(params.id as string);

    const [course, setCourse] = useState<CourseStructure | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editState, setEditState] = useState<EditState>('idle');
    const [selectedItem, setSelectedItem] = useState<Chapter | Lesson | null>(null);
    const [parsedQuestions, setParsedQuestions] = useState<QuizParseResponse | null>(null);
    // WP1.5.10: always true now — courses have no approval lock anymore, but
    // this flag is kept (rather than inlined) so the JSX below reads the same.
    const isEditable = true;
    const isProcessing = editState === 'processing';
    const isReviewing = editState === 'reviewing';

    // Form states
    const [chapterForm, setChapterForm] = useState<ChapterEdit>({ title: '', orderIndex: 0 });
    const [lessonForm, setLessonForm] = useState<LessonEdit>({
        title: '',
        content: '',
        videoUrl: '',
        orderIndex: 0,
        type: 'VIDEO'
    });
    const [chapterCreating, setChapterCreating] = useState(false);
    const [quizFile, setQuizFile] = useState<File | null>(null);
    const [quizUploadedCount, setQuizUploadedCount] = useState<number | null>(null);

    const fetchCourseStructure = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const courseData = await getCourseStructure(courseId);
            setCourse(courseData);
            // Personal-organizer model: the owner can always edit their course,
            // there is no approval-driven read-only lock anymore.
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchCourseStructure();
    }, [fetchCourseStructure]);

    const buildContentPayload = () => {
        // Map course state to backend BulkDto structure
        return {
            sections: course?.chapters.map(ch => ({
                id: ch.id,
                title: ch.title,
                orderIndex: ch.orderIndex,
                lessons: ch.lessons
                    .filter(l => l.title && l.id)  // skip incomplete lessons
                    .map(l => ({
                        id: l.id,
                        title: l.title,
                        type: l.type,
                        orderIndex: l.orderIndex ?? 0,
                        // BE syncCourseContent reads `contentUrl`; l.videoUrl is the FE field name
                        contentUrl: l.videoUrl || (l as any).contentUrl || undefined,
                    }))
            })) || []
        };
    };

    const handleSave = async () => {
        if (!course) return;
        setSaving(true);
        try {
            const payload = buildContentPayload();
            await updateCourseContent(courseId, payload);
            // Optionally show feedback
            // alert('Changes saved successfully!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };



    const handleChapterSelect = (chapter: Chapter) => {
        setSelectedItem(chapter);
        setChapterForm({ id: chapter.id, title: chapter.title, orderIndex: chapter.orderIndex });
        setEditState('idle');
    };

    const handleLessonSelect = (lesson: Lesson) => {
        skipNextSync.current = true; // Prevent sync from firing on initial form load
        setSelectedItem(lesson);
        setQuizUploadedCount(null); // Reset quiz count when switching lessons
        if (lesson.type === 'VIDEO') {
            setEditState('editingVideo');
        } else if (lesson.type === 'QUIZ') {
            setEditState('editingQuiz');
        }
        // Load lesson details (would need additional API call)
        setLessonForm({
            id: lesson.id,
            title: lesson.title,
            content: '',
            videoUrl: lesson.videoUrl || (lesson as any).contentUrl || '',
            orderIndex: lesson.orderIndex ?? 0,
            type: lesson.type
        });
    };

    const handleCreateChapter = async () => {
        if (!course) return;
        setChapterCreating(true);
        try {
            const res = await createSection(courseId, {
                title: chapterForm.title || 'Chương 1',
                orderIndex: chapterForm.orderIndex
            });
            // Construct a proper Chapter object (API may return { sectionId, id, title, lessons })
            const newChapter: Chapter = {
                id: (res as any).id ?? (res as any).sectionId,
                title: chapterForm.title || 'Chương 1',
                orderIndex: chapterForm.orderIndex,
                lessons: [],
            };
            setCourse(prev => prev ? {
                ...prev,
                chapters: [...prev.chapters, newChapter]
            } : null);
            setChapterForm({ title: '', orderIndex: 0 });
            // select new chapter for editing
            setSelectedItem(newChapter);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setChapterCreating(false);
        }
    };

    const handleUpdateChapter = async () => {
        if (!chapterForm.id) return;
        try {
            setSaving(true);
            await updateSection(chapterForm.id, {
                title: chapterForm.title,
                orderIndex: chapterForm.orderIndex
            });
            // API returns only a success message; update state from form data
            setCourse(prev => prev ? {
                ...prev,
                chapters: prev.chapters.map(ch =>
                    ch.id === chapterForm.id ? { ...ch, title: chapterForm.title, orderIndex: chapterForm.orderIndex } : ch
                )
            } : null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteChapter = async (chapterId: number) => {
        if (!confirm('Are you sure you want to delete this chapter and all its lessons?')) return;
        try {
            await deleteSection(chapterId);
            setCourse(prev => prev ? {
                ...prev,
                chapters: prev.chapters.filter(ch => ch.id !== chapterId)
            } : null);
            setSelectedItem(null);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleCreateLesson = async () => {
        if (!selectedItem || !(selectedItem as Chapter).lessons) return;
        const chapter = selectedItem as Chapter;
        try {
            const res = await createLesson(chapter.id, {
                title: lessonForm.title,
                content: lessonForm.content,
                videoUrl: lessonForm.videoUrl,
                orderIndex: lessonForm.orderIndex,
                type: lessonForm.type
            });
            // API returns { lessonId } — construct a proper Lesson from form data
            const newLesson: Lesson = {
                id: Number((res as any).lessonId ?? (res as any).id),
                title: lessonForm.title,
                type: lessonForm.type as 'VIDEO' | 'QUIZ',
                orderIndex: lessonForm.orderIndex,
                videoUrl: lessonForm.videoUrl || undefined,
            };
            setCourse(prev => prev ? {
                ...prev,
                chapters: prev.chapters.map(ch =>
                    ch.id === chapter.id ? {
                        ...ch,
                        lessons: [...ch.lessons, newLesson]
                    } : ch
                )
            } : null);
            setLessonForm({
                title: '',
                content: '',
                videoUrl: '',
                orderIndex: 0,
                type: 'VIDEO'
            });
        } catch (err: any) {
            setError(err.message);
        }
    };

    // WP1.5.11: deleteLesson had a working API but nothing in this page ever
    // called it — the only way to "remove" a lesson was to blank its title so
    // the save payload's `.filter(l => l.title && l.id)` silently dropped it.
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
        } catch (err: any) {
            setError(err.message);
        }
    };

    // WP1.5.11: no way to reorder lessons besides hand-typing orderIndex.
    // Swap with the neighbor in-memory; persisted on the next "Lưu khóa học"
    // like every other in-place edit on this page.
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
    };

    // Sync lessonForm edits back into course state (in-memory only — no DB write).
    // handleSave() persists everything at once when the user clicks Save.
    const skipNextSync = useRef(false);

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
    }, [lessonForm.title, lessonForm.videoUrl, lessonForm.orderIndex, lessonForm.type, selectedItem]);

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
        } catch (err: any) {
            setError(err.message);
            setEditState('editingQuiz');
        }
    };

    const [saving, setSaving] = useState(false);

    const getErrorMessage = (errorCode: string) => {
        switch (errorCode) {
            case 'ACCESS_DENIED':
                return 'Bạn không có quyền chỉnh sửa nội dung này.';
            case 'INVALID_FILE_FORMAT':
                return 'Định dạng tệp không hợp lệ. Vui lòng sử dụng tệp Excel.';
            case 'FILE_TOO_LARGE':
                return 'Dung lượng tệp vượt quá giới hạn cho phép.';
            case 'INCOMPLETE_CONTENT':
                return 'Khóa học chưa đủ điều kiện gửi duyệt.';
            case 'SECTION_NOT_FOUND':
                return 'Dữ liệu chương không tồn tại hoặc đã bị xóa.';
            default:
                return 'Lỗi hệ thống.';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-sm text-red-600 mb-4">{getErrorMessage(error)}</p>
                    <Button onClick={() => router.back()}>
                        Quay lại
                    </Button>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-sm text-slate-500">Không tìm thấy khóa học</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => router.back()}
                                className="flex-shrink-0 text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                                </svg>
                                Quay lại
                            </button>
                            <div className="w-px h-5 bg-slate-200"/>
                            <h1 className="text-sm font-semibold text-slate-800 truncate">{course.title}</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                        Đang lưu...
                                    </>
                                ) : 'Lưu khóa học'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>



            {/* Body */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex gap-6">
                    {/* Sidebar - Tree Structure */}
                    <div className="w-72 flex-shrink-0">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cấu trúc khóa học</h2>

                            {/* Add Chapter */}
                            {isEditable && (
                                <div className="mb-4 p-3 border border-slate-200 rounded-lg bg-slate-50">
                                    <p className="text-xs font-medium text-slate-600 mb-2">Thêm chương mới</p>
                                    <input
                                        type="text"
                                        placeholder="Tên chương"
                                        value={chapterForm.title}
                                        onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full mb-2 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                    <Button onClick={handleCreateChapter} size="sm" className="w-full">
                                        Thêm chương
                                    </Button>
                                </div>
                            )}

                            <div className="space-y-2">
                                {course.chapters.length === 0 ? (
                                    <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center">
                                        <p className="text-xs font-medium text-slate-600 mb-1">Chưa có chương nào</p>
                                        <p className="text-xs text-slate-400 mb-3">Thêm chương để bắt đầu xây dựng nội dung.</p>
                                        <div className="flex flex-col gap-2">
                                            <Button onClick={handleCreateChapter} size="sm" disabled={chapterCreating}>
                                                {chapterCreating ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                                        Đang tạo...
                                                    </span>
                                                ) : 'Thêm chương đầu tiên'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setChapterForm(prev => ({ ...prev, title: 'Chương 1' }))}
                                            >
                                                Gợi ý: &quot;Chương 1&quot;
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    course.chapters.map((chapter: Chapter) => (
                                        <div key={chapter.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                            <div
                                                className={`px-3 py-2 cursor-pointer transition-colors ${selectedItem?.id === chapter.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-slate-50'}`}
                                                onClick={() => handleChapterSelect(chapter)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-slate-700">{chapter.title}</span>
                                                    {isEditable && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 text-slate-400 hover:text-red-500 hover:bg-transparent text-base leading-none"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteChapter(chapter.id); }}
                                                        >
                                                            ×
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pl-3 pr-2 py-1 space-y-0.5 bg-slate-50/50">
                                                {chapter.lessons.map((lesson: Lesson, lessonIndex: number) => (
                                                    <div
                                                        key={lesson.id}
                                                        className={`group flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors ${selectedItem?.id === lesson.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-white text-slate-600'}`}
                                                    >
                                                        <button
                                                            onClick={() => handleLessonSelect(lesson)}
                                                            className="flex-1 min-w-0 text-left"
                                                        >
                                                            <span className="text-xs">{lesson.title}</span>
                                                            <span className="text-xs text-slate-400 ml-1">({lesson.type})</span>
                                                        </button>
                                                        {isEditable && (
                                                            <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    variant="ghost" size="icon"
                                                                    className="h-5 w-5 text-slate-400 hover:text-slate-700"
                                                                    disabled={lessonIndex === 0}
                                                                    onClick={(e) => { e.stopPropagation(); handleMoveLesson(chapter.id, lesson.id, -1); }}
                                                                    title="Lên"
                                                                >
                                                                    ↑
                                                                </Button>
                                                                <Button
                                                                    variant="ghost" size="icon"
                                                                    className="h-5 w-5 text-slate-400 hover:text-slate-700"
                                                                    disabled={lessonIndex === chapter.lessons.length - 1}
                                                                    onClick={(e) => { e.stopPropagation(); handleMoveLesson(chapter.id, lesson.id, 1); }}
                                                                    title="Xuống"
                                                                >
                                                                    ↓
                                                                </Button>
                                                                <Button
                                                                    variant="ghost" size="icon"
                                                                    className="h-5 w-5 text-slate-400 hover:text-red-500"
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteLesson(chapter.id, lesson.id); }}
                                                                    title="Xoá bài học"
                                                                >
                                                                    ×
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}

                                                {/* Add Lesson */}
                                                {isEditable && selectedItem?.id === chapter.id && (
                                                    <div className="p-2 border-t border-slate-200 mt-1">
                                                        <input
                                                            type="text"
                                                            placeholder="Tên bài học"
                                                            value={lessonForm.title}
                                                            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                                            className="w-full mb-1.5 px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                        />
                                                        <select
                                                            value={lessonForm.type}
                                                            onChange={(e) => setLessonForm(prev => ({ ...prev, type: e.target.value as 'VIDEO' | 'QUIZ' | 'TEXT' }))}
                                                            className="w-full mb-1.5 px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        >
                                                            <option value="VIDEO">Video</option>
                                                            <option value="QUIZ">Quiz</option>
                                                            <option value="TEXT">Text</option>
                                                        </select>
                                                        <Button onClick={handleCreateLesson} size="sm" className="w-full">
                                                            Thêm bài học
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )))}
                            </div>
                        </div>
                    </div>

                    {/* Edit Panel */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        {editState === 'idle' && selectedItem && 'title' in selectedItem && (
                            <div>
                                <h3 className="text-base font-semibold text-slate-800 mb-4">Chỉnh sửa chương</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Tên chương</label>
                                        <input
                                            type="text"
                                            value={chapterForm.title}
                                            onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50"
                                            disabled={!isEditable}
                                        />
                                    </div>
                                    <Button onClick={handleUpdateChapter} disabled={!isEditable}>
                                        Cập nhật chương
                                    </Button>
                                </div>
                            </div>
                        )}

                        {editState === 'editingVideo' && (
                            <div>
                                <h3 className="text-base font-semibold text-slate-800 mb-4">Chỉnh sửa bài học Video</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Tên bài học</label>
                                        <input
                                            type="text"
                                            value={lessonForm.title}
                                            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50"
                                            disabled={!isEditable}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Liên kết YouTube</label>
                                        <input
                                            type="url"
                                            value={lessonForm.videoUrl}
                                            onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50"
                                            disabled={!isEditable}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Mô tả nội dung</label>
                                        <textarea
                                            value={lessonForm.content}
                                            onChange={(e) => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
                                            rows={4}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:bg-slate-50"
                                            disabled={!isEditable}
                                        />
                                    </div>
                                    {lessonForm.videoUrl && extractYoutubeId(lessonForm.videoUrl) && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1.5">Xem trước video</label>
                                            <div className="aspect-video rounded-xl overflow-hidden border border-slate-200">
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${extractYoutubeId(lessonForm.videoUrl)}`}
                                                    className="w-full h-full"
                                                    allowFullScreen
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {editState === 'editingQuiz' && (
                            <div>
                                <h3 className="text-base font-semibold text-slate-800 mb-4">Chỉnh sửa bài học Quiz</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Tên bài học</label>
                                        <input
                                            type="text"
                                            value={lessonForm.title}
                                            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50"
                                            disabled={!isEditable}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Chọn tệp Excel (.xlsx)</label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".xlsx"
                                                onChange={(e) => setQuizFile(e.target.files?.[0] || null)}
                                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 file:mr-3 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                disabled={!isEditable}
                                            />
                                        </div>
                                        {quizUploadedCount !== null && (
                                            <p className="mt-1.5 text-xs text-emerald-600 font-medium">
                                                ✓ {quizUploadedCount} câu hỏi đã được tải lên
                                            </p>
                                        )}
                                    </div>
                                    {quizFile && (
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={handleParseQuiz} disabled={isProcessing}>
                                                {isProcessing ? 'Đang xử lý...' : 'Xem trước'}
                                            </Button>
                                            {parsedQuestions && (
                                                <Button
                                                    onClick={handleUploadQuiz}
                                                    disabled={isProcessing}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                >
                                                    {isProcessing ? 'Đang tải lên...' : 'Tải lên'}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {isReviewing && parsedQuestions && (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Xem trước câu hỏi</h4>
                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                            {parsedQuestions.questions.map((question, index) => (
                                                <div key={index} className="border border-slate-200 rounded-xl p-4">
                                                    <p className="text-sm font-medium text-slate-800 mb-2">{question.text}</p>
                                                    <div className="space-y-1.5">
                                                        {question.options.map((option, optIndex) => (
                                                            <div
                                                                key={optIndex}
                                                                className={`flex items-center gap-2 p-2 rounded-lg text-sm ${optIndex === question.correctId
                                                                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                                                                    : 'bg-slate-50 text-slate-600'
                                                                    }`}
                                                            >
                                                                {optIndex === question.correctId && (
                                                                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                                                                )}
                                                                {option}
                                                                {optIndex === question.correctId && (
                                                                    <span className="text-xs text-emerald-500 ml-1">Đáp án đúng</span>
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
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseEditPage;
