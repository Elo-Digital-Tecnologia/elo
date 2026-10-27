export const THEME_KEY = 'elo.theme';

/** Inline no <head>: aplica o tema salvo antes da pintura, sem flash. Claro é o padrão. */
export const themeInitScript = `try{var t=localStorage.getItem('${THEME_KEY}');document.documentElement.dataset.theme=t==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}`;
