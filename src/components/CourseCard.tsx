import { Course } from '@/types/course.types';

interface CourseCardProps {
    course: Course;
    onClick?: (courseId: number) => void;
}

const statusLabel: Record<string, { label: string; className: string }> = {
    ACTIVE:  { label: 'Đang mở', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PENDING: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    DRAFT:   { label: 'Nháp', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function CourseCard({ course, onClick }: CourseCardProps) {
    const status = statusLabel[(course as any).status] ?? null;

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`${course.title} - ${course.description ?? ''}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(course.id); }}
            className="group bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            onClick={() => onClick?.(course.id)}
        >
            {/* Thumbnail */}
            <div className="w-full aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                {course.thumbnailUrl ? (
                    <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                        </svg>
                        <span className="text-xs">Chưa có ảnh</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 flex-1">{course.title}</h3>
                    {status && (
                        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${status.className}`}>
                            {status.label}
                        </span>
                    )}
                </div>
                {course.description ? (
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{course.description}</p>
                ) : (
                    <p className="text-slate-400 text-xs italic">Không có mô tả</p>
                )}

                {typeof (course as any).completionRate === 'number' && (
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Tiến độ</span>
                            <span className="font-medium">{(course as any).completionRate}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${(course as any).completionRate}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
