'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    getCourseStructure,
    createSection,
    updateSection,
    deleteSection,
    createLesson,
    parseQuizFile,
    uploadQuizFile,
    publishCourse
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
    const [quizFile, setQuizFile] = useState<File | null>(null);

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
            if (courseData.status === 'Pending' || courseData.status === 'Active') {
                setEditState('readOnly');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!course) return;
        // Save logic would be implemented here
        // For now, just show success
        alert('Changes saved successfully!');
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
        setSelectedItem(lesson);
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
            videoUrl: '',
            orderIndex: 0,
            type: lesson.type
        });
    };

    const handleCreateChapter = async () => {
        if (!course) return;
        try {
            const newChapter = await createSection(courseId, {
                title: chapterForm.title,
                orderIndex: chapterForm.orderIndex
            });
            setCourse(prev => prev ? {
                ...prev,
                chapters: [...prev.chapters, newChapter]
            } : null);
            setChapterForm({ title: '', orderIndex: 0 });
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleUpdateChapter = async () => {
        if (!chapterForm.id) return;
        try {
            const updatedChapter = await updateSection(chapterForm.id, {
                title: chapterForm.title,
                orderIndex: chapterForm.orderIndex
            });
            setCourse(prev => prev ? {
                ...prev,
                chapters: prev.chapters.map(ch =>
                    ch.id === updatedChapter.id ? updatedChapter : ch
                )
            } : null);
        } catch (err: any) {
            setError(err.message);
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
            const newLesson = await createLesson(chapter.id, {
                title: lessonForm.title,
                content: lessonForm.content,
                videoUrl: lessonForm.videoUrl,
                orderIndex: lessonForm.orderIndex,
                type: lessonForm.type
            });
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
            await uploadQuizFile(lesson.id, quizFile);
            alert('Quiz uploaded successfully!');
            setQuizFile(null);
            setParsedQuestions(null);
            setEditState('editingQuiz');
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{getErrorMessage(error)}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-600">Không tìm thấy khóa học</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => router.back()}
                                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                                ← Quay lại
                            </button>
                            <h1 className="text-xl font-semibold text-gray-900">{course.title}</h1>
                        </div>
                        {editState !== 'readOnly' && (
                            <div className="flex space-x-4">
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Lưu
                                </button>
                                <button
                                    onClick={handlePublish}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    Gửi duyệt
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <h3 className="text-red-800 font-medium mb-2">Khóa học chưa đủ điều kiện gửi duyệt:</h3>
                        <ul className="list-disc list-inside text-red-700">
                            {validationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Body */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex gap-8">
                    {/* Sidebar - Tree Structure */}
                    <div className="w-80 bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cấu trúc khóa học</h2>

                        {/* Add Chapter */}
                        {editState !== 'readOnly' && (
                            <div className="mb-4 p-4 border rounded-md">
                                <h3 className="font-medium mb-2">Thêm chương mới</h3>
                                <input
                                    type="text"
                                    placeholder="Tên chương"
                                    value={chapterForm.title}
                                    onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full mb-2 px-3 py-2 border rounded-md"
                                />
                                <button
                                    onClick={handleCreateChapter}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Thêm chương
                                </button>
                            </div>
                        )}

                        <div className="space-y-4">
                            {course.chapters.map((chapter: Chapter) => (
                                <div key={chapter.id} className="border rounded-md">
                                    <div
                                        className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedItem?.id === chapter.id ? 'bg-blue-50' : ''
                                            }`}
                                        onClick={() => handleChapterSelect(chapter)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{chapter.title}</span>
                                            {editState !== 'readOnly' && (
                                                <button
                                                    onClick={() => handleDeleteChapter(chapter.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="ml-4 space-y-1">
                                        {chapter.lessons.map((lesson: Lesson) => (
                                            <div
                                                key={lesson.id}
                                                className={`p-2 cursor-pointer hover:bg-gray-50 rounded ${selectedItem?.id === lesson.id ? 'bg-blue-50' : ''
                                                    }`}
                                                onClick={() => handleLessonSelect(lesson)}
                                            >
                                                <span>{lesson.title} ({lesson.type})</span>
                                            </div>
                                        ))}

                                        {/* Add Lesson */}
                                        {editState !== 'readOnly' && selectedItem?.id === chapter.id && (
                                            <div className="p-2 border-t">
                                                <input
                                                    type="text"
                                                    placeholder="Tên bài học"
                                                    value={lessonForm.title}
                                                    onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                                    className="w-full mb-2 px-2 py-1 border rounded text-sm"
                                                />
                                                <select
                                                    value={lessonForm.type}
                                                    onChange={(e) => setLessonForm(prev => ({ ...prev, type: e.target.value as 'VIDEO' | 'QUIZ' | 'TEXT' }))}
                                                    className="w-full mb-2 px-2 py-1 border rounded text-sm"
                                                >
                                                    <option value="VIDEO">Video</option>
                                                    <option value="QUIZ">Quiz</option>
                                                    <option value="TEXT">Text</option>
                                                </select>
                                                <button
                                                    onClick={handleCreateLesson}
                                                    className="w-full px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                                >
                                                    Thêm bài học
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Edit Panel */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
                        {editState === 'idle' && selectedItem && 'title' in selectedItem && (
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Chỉnh sửa chương</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Tên chương</label>
                                        <input
                                            type="text"
                                            value={chapterForm.title}
                                            onChange={(e) => setChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-3 py-2 border rounded-md"
                                            disabled={!isEditable}
                                        />
                                    </div>
                                    <button
                                        onClick={handleUpdateChapter}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        disabled={!isEditable}
                                    >
                                        Cập nhật chương
                                    </button>
                                </div>
                            </div>
                        )}

                        {editState === 'editingVideo' && (
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Chỉnh sửa bài học Video</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Tên bài học</label>
                                        <input
                                            type="text"
                                            value={lessonForm.title}
                                            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-3 py-2 border rounded-md"
                                            disabled={!isEditable}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Liên kết YouTube</label>
                                        <input
                                            type="url"
                                            value={lessonForm.videoUrl}
                                            onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                                            className="w-full px-3 py-2 border rounded-md"
                                            disabled={!isEditable}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Mô tả nội dung</label>
                                        <textarea
                                            value={lessonForm.content}
                                            onChange={(e) => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
                                            rows={4}
                                            className="w-full px-3 py-2 border rounded-md"
                                            disabled={!isEditable}
                                        />
                                    </div>
                                    {lessonForm.videoUrl && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Xem trước video</label>
                                            <div className="aspect-video">
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${lessonForm.videoUrl.split('v=')[1]}`}
                                                    className="w-full h-full rounded-md"
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
                                <h3 className="text-xl font-semibold mb-4">Chỉnh sửa bài học Quiz</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Tên bài học</label>
                                        <input
                                            type="text"
                                            value={lessonForm.title}
                                            onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-3 py-2 border rounded-md"
                                            disabled={!isEditable}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Chọn tệp Excel (.xlsx)</label>
                                        <input
                                            type="file"
                                            accept=".xlsx"
                                            onChange={(e) => setQuizFile(e.target.files?.[0] || null)}
                                            className="w-full px-3 py-2 border rounded-md"
                                            disabled={!isEditable}
                                        />
                                    </div>
                                    {quizFile && (
                                        <div className="flex space-x-4">
                                            <button
                                                onClick={handleParseQuiz}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? 'Đang xử lý...' : 'Xem trước'}
                                            </button>
                                            {parsedQuestions && (
                                                <button
                                                    onClick={handleUploadQuiz}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
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
                                        <h4 className="text-lg font-medium mb-4">Xem trước câu hỏi</h4>
                                        <div className="space-y-4 max-h-96 overflow-y-auto">
                                            {parsedQuestions.questions.map((question, index) => (
                                                <div key={index} className="border rounded-md p-4">
                                                    <p className="font-medium mb-2">{question.text}</p>
                                                    <div className="space-y-1">
                                                        {question.options.map((option, optIndex) => (
                                                            <div
                                                                key={optIndex}
                                                                className={`p-2 rounded ${optIndex === question.correctId
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-gray-50'
                                                                    }`}
                                                            >
                                                                {option}
                                                                {optIndex === question.correctId && (
                                                                    <span className="ml-2 text-green-600">✓ Đáp án đúng</span>
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
                            <div className="text-center py-12">
                                <p className="text-gray-600">Khóa học này đang chờ duyệt hoặc đã được duyệt. Không thể chỉnh sửa.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseEditPage;
