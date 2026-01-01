import { Course } from '@/types/course.types';

interface CourseCardProps {
    course: Course;
    onClick?: (courseId: number) => void;
}

export default function CourseCard({ course, onClick }: CourseCardProps) {
    return (
        <div
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onClick?.(course.id)}
        >
            {/* Thumbnail */}
            <div className="h-48 bg-gray-200 flex items-center justify-center">
                {course.thumbnailUrl ? (
                    <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="text-gray-400 text-sm">No Image</div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                {course.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">{course.description}</p>
                )}
            </div>
        </div>
    );
}
