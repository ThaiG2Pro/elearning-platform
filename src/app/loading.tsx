import { Skeleton } from '@/components/ui/skeleton';

// WP1.5.11: there was no loading.tsx anywhere in `src/app` — Next.js's
// route-level Suspense boundary had nothing to render, so navigation between
// server-rendered segments showed a blank page until data was ready.
export default function RootLoading() {
    return (
        <div className="min-h-screen bg-ink-page px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-4xl mx-auto space-y-4">
                <Skeleton className="h-8 w-1/3 bg-ink-pageDim" />
                <Skeleton className="h-40 rounded-ink-md bg-ink-pageDim" />
                <Skeleton className="h-4 w-2/3 bg-ink-pageDim" />
                <Skeleton className="h-4 w-1/2 bg-ink-pageDim" />
            </div>
        </div>
    );
}
