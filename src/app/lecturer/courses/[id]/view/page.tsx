'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourseStructure, getLessonPreview } from '@/lib/lecturer';
import { CourseStructure, LessonPreview, Chapter, Lesson } from '@/types/lecturer.types';

const CoursePreviewPage = () => {
    const params = useParams();
    const router = useRouter();
    const courseId = parseInt(params.id as string);

    const [course, setCourse] = useState<CourseStructure | null>(null);
    const [selectedLesson, setSelectedLesson] = useState<LessonPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingContent, setLoadingContent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCourseStructure();
    }, [courseId]);

    const fetchCourseStructure = async () => {
        setLoading(true);
        setError(null);
        try {
            const courseData = await getCourseStructure(courseId);
            setCourse(courseData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchLessonPreview = async (lessonId: number) => {
        setLoadingContent(true);
        try {
            const lessonData = await getLessonPreview(courseId, lessonId);
            setSelectedLesson(lessonData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoadingContent(false);
        }
    };

    const handleLessonClick = (lesson: Lesson) => {
        fetchLessonPreview(lesson.id);
    };

    const handleBack = () => {
        router.back();
    };

    const getErrorMessage = (errorCode: string) => {
        switch (errorCode) {
            case 'ACCESS_DENIED':
                return 'Bạn không có quyền xem nội dung này';
            case 'COURSE_NOT_FOUND':
                return 'Khóa học không tồn tại';
            case 'LESSON_NOT_FOUND':
                return 'Bài học không tồn tại';
            default:
                return 'Lỗi tải nội dung';
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
                        onClick={handleBack}
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
                                onClick={handleBack}
                                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                                ← Quay lại
                            </button>
                            <h1 className="text-xl font-semibold text-gray-900">{course.title}</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex gap-8">
                    {/* Sidebar */}
                    <div className="w-80 bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nội dung khóa học</h2>
                        <div className="space-y-4">
                            {course.chapters.map((chapter: Chapter) => (
                                <div key={chapter.id}>
                                    <h3 className="font-medium text-gray-800 mb-2">{chapter.title}</h3>
                                    <div className="space-y-1 ml-4">
                                        {chapter.lessons.map((lesson: Lesson) => (
                                            <button
                                                key={lesson.id}
                                                onClick={() => handleLessonClick(lesson)}
                                                className="w-full text-left p-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                            >
                                                {lesson.title} ({lesson.type})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
                        {loadingContent ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : selectedLesson ? (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">{selectedLesson.title}</h3>
                                {selectedLesson.type === 'VIDEO' && selectedLesson.videoUrl && (
                                    <div className="mb-4">
                                        <video
                                            controls
                                            className="w-full max-h-96 rounded-lg"
                                            src={selectedLesson.videoUrl}
                                        >
                                            Trình duyệt của bạn không hỗ trợ video.
                                        </video>
                                    </div>
                                )}
                                {selectedLesson.type === 'QUIZ' && selectedLesson.quizQuestions && (
                                    <div className="space-y-4">
                                        {selectedLesson.quizQuestions.map((question) => (
                                            <div key={question.id} className="border rounded-lg p-4">
                                                <p className="font-medium mb-2">{question.text}</p>
                                                <div className="space-y-1">
                                                    {question.options.map((option, index) => (
                                                        <div
                                                            key={index}
                                                            className={`p-2 rounded ${index === question.correctId
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-gray-50'
                                                                }`}
                                                        >
                                                            {option}
                                                            {index === question.correctId && (
                                                                <span className="ml-2 text-green-600">✓ Đáp án đúng</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {selectedLesson.type === 'TEXT' && (
                                    <div className="prose max-w-none">
                                        <div dangerouslySetInnerHTML={{ __html: selectedLesson.content }} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-64">
                                <p className="text-gray-500">Chọn một bài học để xem nội dung</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoursePreviewPage;
