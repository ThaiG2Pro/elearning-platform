import Image from 'next/image';
import { Users } from 'lucide-react';
import { Space } from '@/types/space.types';

interface ShowcaseSpotlightProps {
    spaces: Space[];
    onSpaceClick: (spaceId: number) => void;
}

// Mục "Tuyển chọn" (2026-09-14): 1 space lớn mang dải bookmark + danh sách
// gọn bên phải, thay cho lưới 3 cột giống hệt 2 mục dưới. Không lặp badge
// "Tuyển chọn" trên từng item vì cả khối đã là tuyển chọn.
export default function ShowcaseSpotlight({ spaces, onSpaceClick }: ShowcaseSpotlightProps) {
    if (spaces.length === 0) return null;
    const [lead, ...rest] = spaces;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-5">
            <button
                type="button"
                onClick={() => onSpaceClick(lead.id)}
                className="vd-focusable group relative text-left bg-ink-panel border border-ink-border rounded-ink-lg overflow-hidden shadow-ink-sm hover:shadow-ink-md transition-shadow"
            >
                <div
                    className="absolute top-0 right-6 w-[30px] h-11 bg-ink-accent z-[2] flex items-start justify-center pt-2"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}
                    aria-hidden
                >
                    <span className="w-2 h-2 rounded-full bg-white/90" />
                </div>
                <div className="relative w-full aspect-[16/9] bg-ink-room overflow-hidden">
                    {lead.thumbnailUrl && (
                        <Image
                            src={lead.thumbnailUrl}
                            alt=""
                            fill
                            priority
                            sizes="(max-width: 1024px) 100vw, 60vw"
                            className="object-cover"
                        />
                    )}
                </div>
                <div className="px-6 py-5">
                    <h3 className="text-xl font-bold text-ink-text leading-snug line-clamp-2">{lead.title}</h3>
                    {lead.description && (
                        <p className="mt-2 text-sm text-ink-textMuted leading-relaxed line-clamp-2">{lead.description}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-3">
                        {typeof lead.cloneCount === 'number' && lead.cloneCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-textMid">
                                <Users size={14} className="text-ink-textMuted" />
                                <span className="font-mono">{lead.cloneCount}</span> người cùng học
                            </span>
                        ) : <span />}
                        <span className="text-sm font-semibold text-ink-accent group-hover:underline underline-offset-4">Xem Space</span>
                    </div>
                </div>
            </button>

            {rest.length > 0 && (
                <ul className="grid auto-rows-fr bg-ink-panel border border-ink-border rounded-ink-lg shadow-ink-sm overflow-hidden divide-y divide-ink-border">
                    {rest.map((space) => (
                        <li key={space.id} className="flex">
                            <button
                                type="button"
                                onClick={() => onSpaceClick(space.id)}
                                className="vd-focusable w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-ink-page transition-colors"
                            >
                                <div className="relative w-[112px] aspect-video rounded-ink-sm overflow-hidden bg-ink-room shrink-0">
                                    {space.thumbnailUrl && (
                                        <Image src={space.thumbnailUrl} alt="" fill sizes="112px" className="object-cover" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[14.5px] font-semibold text-ink-text leading-snug line-clamp-2">{space.title}</div>
                                    {typeof space.cloneCount === 'number' && space.cloneCount > 0 && (
                                        <div className="mt-1 font-mono text-[11.5px] text-ink-textDim">{space.cloneCount} người cùng học</div>
                                    )}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
