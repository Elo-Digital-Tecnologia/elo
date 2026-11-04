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
            className="glass glass-strong sticky bottom-4 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 !rounded-2xl p-3 pl-5"
        >
            <p
                className={`min-w-0 flex-1 text-sm ${note && !note.ok ? 'font-medium text-danger' : note ? 'font-medium text-success' : 'font-medium'}`}
            >
                {note ? note.text : t.unsavedChanges}
            </p>
            {dirty && (
                <div className="flex gap-2">
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
