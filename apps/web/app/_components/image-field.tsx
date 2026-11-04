'use client';

import { Button } from '@elo/ui/components/forms/button';
import { Sheet } from '@elo/ui/components/overlays/sheet';
import { ImageIcon, X } from 'lucide-react';
import { useState } from 'react';
import { ImagePicker } from './image-picker';

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
    const thumb = value.startsWith('/api/media/')
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
                        <ImageIcon size={22} aria-label="Sem imagem" />
                    )}
                </div>
                <Button type="button" variant="soft" onClick={() => setOpen(true)}>
                    {value ? 'Trocar' : 'Escolher imagem'}
                </Button>
                {value && (
                    <button
                        type="button"
                        aria-label={`Tirar ${label.toLowerCase()}`}
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
                            if (url.startsWith('/api/media/')) setOpen(false);
                        }}
                    />
                </div>
            </Sheet>
        </div>
    );
}
