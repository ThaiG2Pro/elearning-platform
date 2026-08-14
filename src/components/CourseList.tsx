import { Course } from '@/types/course.types';
import CourseCard from './CourseCard';

interface CourseListProps {
    courses: Course[];
    loading?: boolean;
    onCourseClick?: (courseId: number) => void;
}

function CourseCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
            <div className="w-full aspect-video bg-slate-200" />
            <div className="p-4 space-y-2.5">
                <div className="h-4 bg-slate-200 rounded-md w-4/5" />
                <div className="h-3 bg-slate-100 rounded-md w-3/5" />
                <div className="h-3 bg-slate-100 rounded-md w-2/5" />
            </div>
        </div>
    );
}

export default function CourseList({ courses, loading, onCourseClick }: CourseListProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <CourseCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (!courses || courses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-1">Không có Space</h3>
                <p className="text-sm text-slate-500 max-w-xs">Hiện tại chưa có Space phù hợp. Hãy thử thay đổi từ khóa tìm kiếm.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => (
                <CourseCard
                    key={course.id}
                    course={course}
                    onClick={onCourseClick}
                />
            ))}
        </div>
    );
}
