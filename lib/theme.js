// Preferência de tema do site. "auto" segue o tema do Windows/navegador
// (prefers-color-scheme); "light" e "dark" forçam um tema.
// Convenção: "auto" = <html> sem atributo data-theme; "light"/"dark" = data-theme="light|dark".

export const THEME_STORAGE_KEY = "winportal-theme";
export const THEMES = ["auto", "light", "dark"];

// Executado no <head> antes da pintura para evitar "flash" do tema errado.
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;
