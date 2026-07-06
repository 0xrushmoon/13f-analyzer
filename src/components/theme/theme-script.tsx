/** Runs before paint to avoid theme flash and ensure CSS variables apply immediately. */
export function ThemeScript() {
  const script = `(function(){try{var m=document.cookie.match(/theme=(light|dark)/);var t=m?m[1]:'dark';var r=document.documentElement;r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
