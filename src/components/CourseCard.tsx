import { Course } from '@/types/course.types';

interface CourseCardProps {
    course: Course;
    onClick?: (courseId: number) => void;
}

export default function CourseCard({ course, onClick }: CourseCardProps) {
    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`${course.title} - ${course.description ?? ''}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(course.id); }}
            className="bg-white rounded-lg shadow-sm border border-transparent overflow-hidden cursor-pointer transform transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            onClick={() => onClick?.(course.id)}
        >
            {/* Thumbnail */}
            <div className="w-full aspect-video bg-gray-200 flex items-center justify-center overflow-hidden">
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">{course.title}</h3>
                {course.description ? (
                    <p className="text-gray-600 text-sm line-clamp-2">{course.description}</p>
                ) : (
                    <p className="text-gray-400 text-sm">Không có mô tả</p>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span className="uppercase tracking-wider">{(course as any).status || ''}</span>
                    {typeof (course as any).completionRate === 'number' && (
                        <span>{(course as any).completionRate}% hoàn thành</span>
                    )}
                </div>
            </div>
        </div>
    );
}
