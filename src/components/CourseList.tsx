import { Course } from '@/types/course.types';
import CourseCard from './CourseCard';

interface CourseListProps {
    courses: Course[];
    loading?: boolean;
    onCourseClick?: (courseId: number) => void;
}

export default function CourseList({ courses, loading, onCourseClick }: CourseListProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                        <div className="w-full aspect-video bg-gray-300"></div>
                        <div className="p-4">
                            <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!courses || courses.length === 0) {
        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Không có khóa học</h3>
                <p className="text-gray-500">Hiện tại chưa có khóa học phù hợp. Hãy thử thay đổi bộ lọc hoặc tạo một khóa học mới.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
