'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

/** Texts the components show. The app supplies them; the package defines only the keys. */
export interface UiTexts {
    account: string;
    back: string;
    breadcrumb: string;
    chartTotal: string;
    chartValue: string;
    close: string;
    closeMenu: string;
    closeNotice: string;
    collapse: string;
    collapseSidebar: string;
    date: string;
    datePlaceholder: string;
    discard: string;
    expandSidebar: string;
    hidePassword: string;
    loadFailed: string;
    loading: string;
    mainNavigation: string;
    moneyPlaceholder: string;
    moreActions: string;
    next: string;
    nextPage: string;
    openCalendar: string;
    openMenu: string;
    opensInNewTab: string;
    pages: string;
    previous: string;
    previousPage: string;
    saveChanges: string;
    showPassword: string;
    signOut: string;
    theme: string;
    time: string;
    timePlaceholder: string;
    unsavedChanges: string;
    useDarkTheme: string;
    useLightTheme: string;
}

const UiTextsContext = createContext<UiTexts | null>(null);

export function UiTextsProvider({
    texts,
    children
}: {
    texts: UiTexts;
    children: ReactNode;
}) {
    return <UiTextsContext.Provider value={texts}>{children}</UiTextsContext.Provider>;
}

export function useUiTexts(): UiTexts {
    const texts = useContext(UiTextsContext);
    if (!texts) throw new Error('UiTextsProvider is missing');
    return texts;
}
