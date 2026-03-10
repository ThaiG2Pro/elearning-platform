'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    getCourseStructure,
    createSection,
    updateSection,
    deleteSection,
    createLesson,
    parseQuizFile,
    uploadQuizFile,
    publishCourse,
    updateCourseContent,
} from '@/lib/lecturer';
import {
    CourseStructure,
    Chapter,
    Lesson,
    LessonEdit,
    ChapterEdit,
    QuizParseResponse
} from '@/types/lecturer.types';

type EditState = 'idle' | 'editingVideo' | 'editingQuiz' | 'processing' | 'reviewing' | 'readOnly';

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
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [editState, setEditState] = useState<EditState>('idle');
    const [selectedItem, setSelectedItem] = useState<Chapter | Lesson | null>(null);
    const [parsedQuestions, setParsedQuestions] = useState<QuizParseResponse | null>(null);
    const isEditable = editState !== 'readOnly';
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

    useEffect(() => {
        fetchCourseStructure();
    }, [courseId]);

    const fetchCourseStructure = async () => {
        setLoading(true);
        setError(null);
        try {
            const courseData = await getCourseStructure(courseId);
            setCourse(courseData);
            // Check if course is read-only
            if (['PENDING', 'ACTIVE'].includes((courseData.status || '').toUpperCase())) {
                setEditState('readOnly');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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

    const handlePublish = async () => {
        if (!course) return;
        setEditState('processing');
        try {
            const validation = await publishCourse(courseId);
            if (validation.errors && validation.errors.length > 0) {
                setValidationErrors(validation.errors);
                setEditState('idle');
            } else {
                alert('Course published successfully!');
                router.push('/lecturer/courses');
            }
        } catch (err: any) {
            setError(err.message);
            setEditState('idle');
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
    }, [lessonForm.title, lessonForm.content, lessonForm.videoUrl]);

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
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Quay lại
                    </button>
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
                        {editState !== 'readOnly' && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSave}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"/>
                                            Đang lưu...
                                        </>
                                    ) : 'Lưu'}
                                </button>
                                <button
                                    onClick={handlePublish}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Gửi duyệt
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-800 font-medium mb-2">Khóa học chưa đủ điều kiện gửi duyệt:</p>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-0.5">
                            {validationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Body */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex gap-6">
                    {/* Sidebar - Tree Structure */}
                    <div className="w-72 flex-shrink-0">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cấu trúc khóa học</h2>

                            {/* Add Chapter */}
                            {editState !== 'readOnly' && (
                                <div className="mb-4 p-3 border border-slate-200 rounded-lg bg-slate-50">
                                    <p className="text-xs font-medium text-slate-600 mb-2">Thêm chương mới</p>
                                    <input
                                        type="text"
                                        placeholder="Tên chương"
                                        value={chapterForm.title}
                                        onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full mb-2 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                    <button
                                        onClick={handleCreateChapter}
                                        className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                                    >
                                        Thêm chương
                                    </button>
                                </div>
                            )}

                            <div className="space-y-2">
                                {course.chapters.length === 0 ? (
                                    <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center">
                                        <p className="text-xs font-medium text-slate-600 mb-1">Chưa có chương nào</p>
                                        <p className="text-xs text-slate-400 mb-3">Thêm chương để bắt đầu xây dựng nội dung.</p>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={handleCreateChapter}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                                disabled={chapterCreating}
                                            >
                                                {chapterCreating ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                                        Đang tạo...
                                                    </span>
                                                ) : 'Thêm chương đầu tiên'}
                                            </button>
                                            <button
                                                onClick={() => setChapterForm(prev => ({ ...prev, title: 'Chương 1' }))}
                                                className="px-3 py-1 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                                            >
                                                Gợi ý: &quot;Chương 1&quot;
                                            </button>
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
                                                    {editState !== 'readOnly' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteChapter(chapter.id); }}
                                                            className="text-slate-400 hover:text-red-500 transition-colors text-base leading-none"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pl-3 pr-2 py-1 space-y-0.5 bg-slate-50/50">
                                                {chapter.lessons.map((lesson: Lesson) => (
                                                    <div
                                                        key={lesson.id}
                                                        className={`px-2 py-1.5 cursor-pointer rounded-md transition-colors ${selectedItem?.id === lesson.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-white text-slate-600'}`}
                                                        onClick={() => handleLessonSelect(lesson)}
                                                    >
                                                        <span className="text-xs">{lesson.title}</span>
                                                        <span className="text-xs text-slate-400 ml-1">({lesson.type})</span>
                                                    </div>
                                                ))}

                                                {/* Add Lesson */}
                                                {editState !== 'readOnly' && selectedItem?.id === chapter.id && (
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
                                                        <button
                                                            onClick={handleCreateLesson}
                                                            className="w-full px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition-colors"
                                                        >
                                                            Thêm bài học
                                                        </button>
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
                                    <button
                                        onClick={handleUpdateChapter}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                        disabled={!isEditable}
                                    >
                                        Cập nhật chương
                                    </button>
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
                                            <button
                                                onClick={handleParseQuiz}
                                                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? 'Đang xử lý...' : 'Xem trước'}
                                            </button>
                                            {parsedQuestions && (
                                                <button
                                                    onClick={handleUploadQuiz}
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                                    disabled={isProcessing}
                                                >
                                                    {isProcessing ? 'Đang tải lên...' : 'Tải lên'}
                                                </button>
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

                        {editState === 'readOnly' && (
                            <div className="flex flex-col items-center justify-center h-48 text-center">
                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                    </svg>
                                </div>
                                <p className="text-sm text-slate-500">Khóa học này đang chờ duyệt hoặc đã được duyệt.<br/>Không thể chỉnh sửa.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseEditPage;
