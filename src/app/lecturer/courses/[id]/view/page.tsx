'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourseStructure, getLessonPreview } from '@/lib/lecturer';
import { CourseStructure, LessonPreview, Chapter, Lesson } from '@/types/lecturer.types';
import YoutubePlayer from '@/components/YoutubePlayer';

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
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleBack}
                                className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                                </svg>
                                Quay lại
                            </button>
                            <div className="w-px h-5 bg-slate-200"/>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">Xem trước</span>
                            <h1 className="text-sm font-semibold text-slate-800 truncate">{course.title}</h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex gap-6">
                    {/* Sidebar */}
                    <div className="w-72 flex-shrink-0">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-20">
                            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Nội dung khóa học</h2>
                            <div className="space-y-3">
                                {course.chapters.map((chapter: Chapter) => (
                                    <div key={chapter.id}>
                                        <p className="text-xs font-semibold text-slate-700 mb-1.5 px-2">{chapter.title}</p>
                                        <div className="space-y-0.5">
                                            {chapter.lessons.map((lesson: Lesson) => (
                                                <button
                                                    key={lesson.id}
                                                    onClick={() => handleLessonClick(lesson)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${selectedLesson?.id === lesson.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                                >
                                                    {lesson.title}
                                                    <span className="ml-1 text-slate-400">({lesson.type})</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        {loadingContent ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                            </div>
                        ) : selectedLesson ? (
                            <div>
                                <h3 className="text-base font-semibold text-slate-900 mb-4">{selectedLesson.title}</h3>
                                {selectedLesson.type === 'VIDEO' && (selectedLesson.videoUrl || selectedLesson.content) && (
                                    <div className="mb-4">
                                        {(() => {
                                            const lessonVideoUrl = selectedLesson.videoUrl || selectedLesson.content || '';
                                            const getYouTubeVideoId = (url: string): string | null => {
                                                const reg1 = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/;
                                                const reg2 = /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/;
                                                const reg3 = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/;
                                                const m = reg1.exec(url) || reg2.exec(url) || reg3.exec(url);
                                                return m ? m[1] : null;
                                            };
                                            const isYouTubeUrl = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');

                                            if (isYouTubeUrl(lessonVideoUrl)) {
                                                const vid = getYouTubeVideoId(lessonVideoUrl);
                                                return vid ? (
                                                    <YoutubePlayer
                                                        videoId={vid}
                                                        initialPos={0}
                                                        onProgress={() => { }}
                                                        onDuration={() => { }}
                                                        onFlush={() => { }}
                                                    />
                                                ) : (
                                                    <div className="text-sm text-slate-400">Không thể lấy video YouTube</div>
                                                );
                                            }

                                            return (
                                                <video
                                                    controls
                                                    className="w-full aspect-video rounded-xl"
                                                    src={lessonVideoUrl}
                                                >
                                                    Trình duyệt của bạn không hỗ trợ video.
                                                </video>
                                            );
                                        })()}
                                    </div>
                                )}
                                {selectedLesson.type === 'QUIZ' && selectedLesson.quizQuestions && (
                                    <div className="space-y-4">
                                        {selectedLesson.quizQuestions.map((question: any) => {
                                            const qText = question.content || question.text || 'Câu hỏi';
                                            const parseCorrectIndex = () => {
                                                if (typeof question.correctIndex === 'number') return question.correctIndex;
                                                if (typeof question.correctId === 'number') return question.correctId;
                                                if (typeof question.correctId === 'string') {
                                                    const m = question.correctId.match(/option_(\d+)/);
                                                    if (m) return parseInt(m[1], 10);
                                                }
                                                if (typeof question.answerKey === 'string') {
                                                    const map: any = { A: 0, B: 1, C: 2, D: 3 };
                                                    const k = question.answerKey.trim().toUpperCase();
                                                    if (map[k] !== undefined) return map[k];
                                                }
                                                return -1;
                                            };
                                            const correctIdx = parseCorrectIndex();

                                            return (
                                                <div key={question.id} className="border border-slate-200 rounded-xl p-4">
                                                    <p className="text-sm font-medium text-slate-800 mb-3">{qText}</p>
                                                    <div className="space-y-1.5">
                                                        {Array.isArray(question.options) ? question.options.map((option: string, index: number) => (
                                                            <div
                                                                key={index}
                                                                className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${index === correctIdx
                                                                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                                                                    : 'bg-slate-50 text-slate-600'
                                                                    }`}
                                                            >
                                                                {index === correctIdx && (
                                                                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                                                                )}
                                                                {option}
                                                                {index === correctIdx && (
                                                                    <span className="text-xs text-emerald-500 ml-1">Đáp án đúng</span>
                                                                )}
                                                            </div>
                                                        )) : <div className="text-sm text-slate-400">Không có đáp án</div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {selectedLesson.type === 'TEXT' && (
                                    <div className="prose max-w-none text-sm text-slate-700">
                                        <div dangerouslySetInnerHTML={{ __html: selectedLesson.content }} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                                <p className="text-sm text-slate-400">Chọn một bài học để xem nội dung</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoursePreviewPage;
