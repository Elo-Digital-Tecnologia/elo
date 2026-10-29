export const THEME_KEY = 'elo.theme';

/**
 * Inline no <head>: aplica o tema antes da pintura, sem flash (claro é o padrão).
 * Marca `data-lite` em aparelhos limitados ou com economia de dados;
 * o CSS então troca o vidro com blur por um fundo simples. Não há ajuste manual.
 */
export const themeInitScript = `try{var d=document.documentElement;var t=localStorage.getItem('${THEME_KEY}');d.dataset.theme=t==='dark'?'dark':'light';var n=navigator,c=n.connection||{};if((n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=2)||c.saveData)d.dataset.lite='1'}catch(e){document.documentElement.dataset.theme='light'}`;
