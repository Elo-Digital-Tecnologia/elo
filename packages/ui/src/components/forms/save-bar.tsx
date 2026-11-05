'use client';

import { Save } from 'lucide-react';
import { useUiTexts } from '../../texts/ui-texts';
import { Button } from './button';

/**
 * A bar stuck to the bottom of the page while a form has changes that were not saved,
 * so leaving them behind is never silent. It sits inside the `<form>`: the save button
 * submits it. Afterwards it only carries the outcome of the save.
 */
export function SaveBar({
    dirty,
    loading,
    onDiscard,
    message
}: {
    dirty: boolean;
    loading?: boolean;
    onDiscard: () => void;
    message?: { ok: boolean; text: string } | null;
}) {
    const t = useUiTexts();
    const note = message && (!message.ok || !dirty) ? message : null;
    if (!dirty && !note) return null;
    return (
        <div
            role="status"
            aria-live="polite"
            className="glass glass-strong sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex flex-col gap-x-4 gap-y-3 !rounded-2xl p-3 sm:flex-row sm:items-center sm:pl-5"
        >
            <p
                className={`min-w-0 px-2 text-sm sm:flex-1 sm:px-0 ${note && !note.ok ? 'font-medium text-danger' : note ? 'font-medium text-success' : 'font-medium'}`}
            >
                {note ? note.text : t.unsavedChanges}
            </p>
            {dirty && (
                <div className="flex shrink-0 gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={loading}
                        onClick={onDiscard}
                    >
                        {t.discard}
                    </Button>
                    <Button type="submit" loading={loading}>
                        <Save size={16} /> {t.saveChanges}
                    </Button>
                </div>
            )}
        </div>
    );
}
