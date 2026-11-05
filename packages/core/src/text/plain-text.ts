const COMBINING_MARKS = /[̀-ͯ]/g;

/** Lowercase text without accents, for searches that ignore both. */
export const plainText = (text: string) =>
    text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
