'use client';

import type { MediaView } from '@elo/core/api/views/media.view';
import { plainText } from '@elo/core/text/plain-text';
import { Button } from '@elo/ui/components/forms/button';
import { Input, Spinner } from '@elo/ui/components/forms/fields';
import { Badge } from '@elo/ui/components/feedback/badge';
import { Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { IMAGE_PICKER_TEXTS as T } from '#/_lib/messages/media';
import { MEDIA_PAGE_SIZE } from './media-constants';

/**
 * The restaurant's images as a grid: search by name, a first page and "show more".
 * Images in use cannot be deleted; deleting is only asked for here and confirmed by the caller.
 */
export function MediaLibrary({
    items,
    value,
    onPick,
    onRemove
}: {
    items: MediaView[] | null;
    value: string;
    onPick: (item: MediaView) => void;
    onRemove: (item: MediaView) => void;
}) {
    const [query, setQuery] = useState('');
    const [visible, setVisible] = useState(MEDIA_PAGE_SIZE);

    const search = (text: string) => {
        setQuery(text);
        setVisible(MEDIA_PAGE_SIZE);
    };

    const q = plainText(query.trim());
    const found = q
        ? (items ?? []).filter((i) => plainText(i.name).includes(q))
        : (items ?? []);
    const shown = found.slice(0, visible);
    const left = found.length - shown.length;

    return (
        <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium">{T.library}</h3>
                {items && items.length > 0 && (
                    <span className="text-xs tabular-nums text-muted">
                        {T.count(items.length)}
                    </span>
                )}
            </div>
            {items === null && <Spinner />}
            {items?.length === 0 && <p className="text-sm text-muted">{T.empty}</p>}
            {items && items.length > MEDIA_PAGE_SIZE && (
                <div className="mb-2">
                    <Input
                        type="search"
                        icon={<Search size={16} />}
                        value={query}
                        onChange={(e) => search(e.target.value)}
                        // The picker sits inside the product form; Enter here must not submit it.
                        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                        placeholder={T.search}
                        aria-label={T.search}
                    />
                </div>
            )}
            {q && found.length === 0 && <p className="text-sm text-muted">{T.noMatch}</p>}
            {shown.length > 0 && (
                <div className="max-h-[min(26rem,55vh)] overflow-y-auto overscroll-contain rounded-md">
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {shown.map((i) => (
                            <li key={i.id} className="group relative">
                                <button
                                    type="button"
                                    onClick={() => onPick(i)}
                                    aria-label={T.use(i.name)}
                                    aria-pressed={value === i.url}
                                    className={`block aspect-square w-full overflow-hidden rounded-md border-2 transition ${value === i.url ? 'border-brand' : 'border-transparent hover:border-brand/50'}`}
                                >
                                    <img
                                        src={i.thumbUrl}
                                        alt=""
                                        loading="lazy"
                                        className="h-full w-full object-cover"
                                    />
                                </button>
                                {i.inUse ? (
                                    <span className="pointer-events-none absolute bottom-1 left-1">
                                        <Badge tone="brand">{T.inUse}</Badge>
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        aria-label={T.remove(i.name)}
                                        onClick={() => onRemove(i)}
                                        className="absolute right-1 top-1 grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-black/60 text-white transition focus-visible:opacity-100 [@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:opacity-100"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                    {left > 0 && (
                        <div className="mt-3 flex justify-center">
                            <Button
                                type="button"
                                variant="soft"
                                onClick={() => setVisible((n) => n + MEDIA_PAGE_SIZE)}
                            >
                                {T.showMore(left)}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
