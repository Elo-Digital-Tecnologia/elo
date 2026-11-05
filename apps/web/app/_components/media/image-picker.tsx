'use client';

import type { MediaView } from '@elo/core/api/views/media.view';
import { api, apiUpload } from '@elo/client/http/api-client';
import { ApiError } from '@elo/client/http/api-error';
import { HTTP_STATUS } from '@elo/client/http/http-status';
import { ApiErrorCode } from '@elo/core/api/api-error-code';
import { FIELD_RULES, fieldError } from '@elo/core/fields/field-rules';
import {
    IMAGE_UPLOAD_MAX_BYTES,
    MEDIA_PER_RESTAURANT
} from '@elo/core/media/media-limits';
import { Input, Spinner } from '@elo/ui/components/forms/fields';
import { ConfirmModal } from '@elo/ui/components/overlays/confirm';
import { ImagePlus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fieldMessage } from '#/_lib/messages/fields';
import {
    IMAGE_PICKER_TEXTS as T,
    MEDIA_API_ERRORS,
    MEDIA_ERRORS
} from '#/_lib/messages/media';
import { unexpected } from '#/_lib/use-form';
import { LIBRARY_URL_PREFIX } from './media-constants';
import { MediaLibrary } from './media-library';

const reason = (e: unknown) => {
    if (!(e instanceof ApiError)) return unexpected(e);
    if (e.status === HTTP_STATUS.PAYLOAD_TOO_LARGE) return MEDIA_ERRORS.tooLarge;
    return MEDIA_API_ERRORS[e.code] ?? unexpected(e);
};

const isExternal = (url: string) => !!url && !url.startsWith(LIBRARY_URL_PREFIX);

interface PickerProps {
    token: string;
    value: string;
    onChange: (url: string) => void;
    /** What the API refused about the image. */
    error?: string | null;
    /** Shows the link problem without waiting for the input to be left (the form was submitted). */
    showErrors?: boolean;
    /** Tells whether the typed link is being held back for not passing the rule. */
    onLinkError?: (bad: boolean) => void;
}

/**
 * Picks an image from the restaurant's library, or uploads a new one.
 * A typed link is applied only while it passes the API rule.
 */
export function ImagePicker({
    token,
    value,
    onChange,
    error: refused,
    showErrors = false,
    onLinkError
}: PickerProps) {
    const [items, setItems] = useState<MediaView[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [drag, setDrag] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [removing, setRemoving] = useState<MediaView | null>(null);
    const [removeBusy, setRemoveBusy] = useState(false);
    const [removeError, setRemoveError] = useState<string | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const [link, setLink] = useState(isExternal(value) ? value : '');
    const [linkLeft, setLinkLeft] = useState(false);
    /** The last value this picker applied from the link, so only outside changes reset the link. */
    const applied = useRef(value);

    useEffect(() => {
        if (value === applied.current) return;
        applied.current = value;
        setLink(isExternal(value) ? value : '');
        setLinkLeft(false);
    }, [value]);

    const linkError = fieldError(FIELD_RULES.imageUrl, link.trim());
    const linkMessage =
        (linkLeft || showErrors) && linkError ? fieldMessage(linkError) : null;
    const linkBad = !!linkError;
    const details = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        onLinkError?.(linkBad);
        if (linkBad && showErrors && details.current) details.current.open = true;
    }, [linkBad, showErrors, onLinkError]);
    useEffect(() => () => onLinkError?.(false), [onLinkError]);

    const typeLink = (text: string) => {
        setLink(text);
        const next = fieldError(FIELD_RULES.imageUrl, text.trim()) ? '' : text.trim();
        if (next === applied.current) return;
        applied.current = next;
        onChange(next);
    };

    const load = useCallback(async () => {
        try {
            setItems(await api<MediaView[]>('/api/catalog/media', { token }));
        } catch {
            setItems([]);
        }
    }, [token]);
    useEffect(() => {
        void load();
    }, [load]);

    const full = (items?.length ?? 0) >= MEDIA_PER_RESTAURANT;

    const send = async (file?: File | null) => {
        if (!file || busy) return;
        setError(null);
        if (full) return setError(MEDIA_ERRORS.full);
        if (!file.type.startsWith('image/')) return setError(MEDIA_ERRORS.notImage);
        if (file.size > IMAGE_UPLOAD_MAX_BYTES) return setError(MEDIA_ERRORS.tooLarge);
        setBusy(true);
        try {
            const created = await apiUpload<MediaView>('/api/catalog/media', file, token);
            setItems((list) => [created, ...(list ?? [])]);
            onChange(created.url);
        } catch (e) {
            setError(reason(e));
        } finally {
            setBusy(false);
        }
    };

    const askRemove = (item: MediaView) => {
        setRemoveError(null);
        setRemoving(item);
    };

    const remove = async () => {
        const item = removing;
        if (!item) return;
        setRemoveBusy(true);
        setRemoveError(null);
        try {
            await api(`/api/catalog/media/${item.id}`, { method: 'DELETE', token });
            setItems((list) => (list ?? []).filter((i) => i.id !== item.id));
            if (value === item.url) onChange('');
            setRemoving(null);
        } catch (e) {
            const code = e instanceof ApiError ? e.code : null;
            if (code === ApiErrorCode.MEDIA_NOT_FOUND) {
                setItems((list) => (list ?? []).filter((i) => i.id !== item.id));
                setRemoving(null);
                return;
            }
            if (code === ApiErrorCode.IMAGE_IN_USE) {
                const used = { ...item, inUse: true };
                setItems((list) =>
                    (list ?? []).map((i) => (i.id === item.id ? used : i))
                );
                setRemoving(used);
            }
            setRemoveError(reason(e));
        } finally {
            setRemoveBusy(false);
        }
    };

    const external = isExternal(value);

    return (
        <div className="space-y-4">
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!full) setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    void send(e.dataTransfer.files[0]);
                }}
                onPaste={(e) => void send(e.clipboardData.files[0])}
                className={`grid place-items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${drag ? 'border-brand bg-brand/10' : 'border-line/70'}`}
            >
                {busy ? (
                    <Spinner />
                ) : full ? (
                    <>
                        <ImagePlus className="text-muted" size={28} />
                        <p className="text-sm text-muted">{MEDIA_ERRORS.full}</p>
                    </>
                ) : (
                    <>
                        <ImagePlus className="text-brand" size={28} />
                        <p className="text-sm">
                            {T.dropPrefix}{' '}
                            <button
                                type="button"
                                className="font-semibold text-brand underline"
                                onClick={() => input.current?.click()}
                            >
                                {T.dropChoose}
                            </button>
                        </p>
                        <p className="text-xs text-muted">{T.dropHint}</p>
                    </>
                )}
                <input
                    ref={input}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e) => {
                        void send(e.target.files?.[0]);
                        e.target.value = '';
                    }}
                />
            </div>
            {(error ?? refused) && (
                <p role="alert" className="text-sm text-danger">
                    {error ?? refused}
                </p>
            )}

            {value && (
                <div className="flex items-center gap-3 rounded-md border border-line/50 p-2">
                    <img
                        src={value}
                        alt=""
                        className="h-16 w-16 rounded-md object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-muted">
                        {external ? value : T.chosen}
                    </span>
                    <button
                        type="button"
                        aria-label={T.removeChosen}
                        onClick={() => onChange('')}
                        className="grid shrink-0 h-9 w-9 place-items-center rounded-pill text-muted transition hover:bg-danger/10 hover:text-danger"
                    >
                        <X size={17} />
                    </button>
                </div>
            )}

            <MediaLibrary
                items={items}
                value={value}
                onPick={(item) => onChange(item.url)}
                onRemove={askRemove}
            />

            <details ref={details} className="text-sm">
                <summary className="cursor-pointer text-muted">{T.linkSummary}</summary>
                <div className="mt-2">
                    <Input
                        name="imageUrl"
                        inputMode="url"
                        autoCapitalize="none"
                        value={link}
                        onChange={(e) => typeLink(e.target.value)}
                        onBlur={() => setLinkLeft(true)}
                        invalid={!!linkMessage}
                        maxLength={FIELD_RULES.imageUrl.max}
                        placeholder="https://"
                        aria-label={T.linkLabel}
                    />
                    {linkMessage && (
                        <p aria-live="polite" className="mt-1.5 text-xs text-danger">
                            {linkMessage}
                        </p>
                    )}
                </div>
            </details>

            <ConfirmModal
                open={!!removing}
                title={T.removeTitle}
                confirmLabel={T.removeConfirm}
                danger
                loading={removeBusy}
                disabled={!!removing?.inUse}
                error={removeError}
                onConfirm={() => void remove()}
                onClose={() => !removeBusy && setRemoving(null)}
            >
                {removing && (
                    <div className="flex items-center gap-3">
                        <img
                            src={removing.thumbUrl}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-md object-cover"
                        />
                        <span className="min-w-0 truncate font-medium">
                            {removing.name}
                        </span>
                    </div>
                )}
                <p className="text-muted">{T.removeBody}</p>
            </ConfirmModal>
        </div>
    );
}
