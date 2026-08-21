'use client';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = "Tìm kiếm Space..." }: SearchBarProps) {
    return (
        <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <svg className="w-4 h-4 text-ink-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-ink-panel border border-ink-border rounded-lg text-ink-text placeholder:text-ink-textMuted focus:outline-none focus:ring-2 focus:ring-ink-accent focus:border-transparent transition-shadow"
                aria-label={placeholder}
            />
        </div>
    );
}
