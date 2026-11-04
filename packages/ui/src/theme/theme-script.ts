export const THEME_KEY = 'elo.theme';

/**
 * Inline in <head>: applies the theme before the first paint, without a flash (light is
 * the default). Marks `data-lite` on limited devices or with data saving on; the CSS then
 * swaps the blurred glass for a plain background. There is no manual setting.
 */
export const themeInitScript = `try{var d=document.documentElement;var t=localStorage.getItem('${THEME_KEY}');d.dataset.theme=t==='dark'?'dark':'light';var n=navigator,c=n.connection||{};if((n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=2)||c.saveData)d.dataset.lite='1'}catch(e){document.documentElement.dataset.theme='light'}`;
