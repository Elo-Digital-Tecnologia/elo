/** Placeholder while a menu loads. */
export function MenuSkeleton() {
    return (
        <main className="mx-auto max-w-2xl" aria-busy>
            <div className="skeleton h-36 !rounded-none sm:h-48" />
            <div className="space-y-4 p-4">
                <div className="skeleton h-8 w-2/3" />
                <div className="skeleton h-24" />
                <div className="skeleton h-24" />
                <div className="skeleton h-24" />
            </div>
        </main>
    );
}
