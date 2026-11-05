'use client';

import { Button } from '@elo/ui/components/forms/button';
import { Sheet } from '@elo/ui/components/overlays/sheet';
import { ImageIcon, X } from 'lucide-react';
import { useState } from 'react';
import { IMAGE_FIELD_TEXTS as T } from '#/_lib/messages/media';
import { ImagePicker } from './image-picker';
import { LIBRARY_URL_PREFIX } from './media-constants';

/** Form image field: thumbnail, a button to pick from the library and a button to remove it. */
export function ImageField({
    label,
    token,
    value,
    onChange,
    wide = false
}: {
    label: string;
    token: string;
    value: string;
    onChange: (url: string) => void;
    wide?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const thumb = value.startsWith(LIBRARY_URL_PREFIX)
        ? value.replace(/\.webp$/, '-sm.webp')
        : value;
    return (
        <div>
            <span className="mb-1.5 block text-sm font-medium">{label}</span>
            <div className="flex items-center gap-3">
                <div
                    className={`grid shrink-0 place-items-center overflow-hidden rounded-md border border-line/60 bg-brand/5 text-muted ${wide ? 'h-16 w-28' : 'h-16 w-16'}`}
                >
                    {value ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <ImageIcon size={22} aria-label={T.none} />
                    )}
                </div>
                <Button type="button" variant="soft" onClick={() => setOpen(true)}>
                    {value ? T.change : T.choose}
                </Button>
                {value && (
                    <button
                        type="button"
                        aria-label={T.remove(label)}
                        onClick={() => onChange('')}
                        className="grid shrink-0 h-10 w-10 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger"
                    >
                        <X size={17} />
                    </button>
                )}
            </div>
            <Sheet open={open} onClose={() => setOpen(false)} title={label}>
                <div className="mt-4">
                    <ImagePicker
                        token={token}
                        value={value}
                        onChange={(url) => {
                            onChange(url);
                            // Picking from the library or uploading closes the window; typing a link does not.
                            if (url.startsWith(LIBRARY_URL_PREFIX)) setOpen(false);
                        }}
                    />
                </div>
            </Sheet>
        </div>
    );
}
