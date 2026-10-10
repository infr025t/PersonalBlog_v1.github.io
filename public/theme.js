(() => {
 const root=document.documentElement,systemTheme=matchMedia('(prefers-color-scheme: dark)');
 let preference=null;
 try{const saved=localStorage.getItem('theme');if(saved==='dark'||saved==='light')preference=saved;}catch{}
 const sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>';
 const moon='<path d="M20.8 13.1A9 9 0 0 1 10.9 3.2 9 9 0 1 0 20.8 13.1Z"/>';
 function apply(dark){
  root.dataset.theme=dark?'dark':'light';root.style.colorScheme=dark?'dark':'light';
  document.body?.classList.toggle('dark',dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#151d19':'#f5f7f5');
  const button=document.querySelector('#theme');if(!button)return;
  button.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${dark?moon:sun}</svg>`;
  button.setAttribute('aria-label',dark?'切换到日间模式':'切换到夜间模式');
  button.title=dark?'当前为夜间模式，点击切换到日间':'当前为日间模式，点击切换到夜间';
  button.dataset.mode=dark?'dark':'light';
 }
 apply(preference?preference==='dark':systemTheme.matches);
 function ready(){apply(root.dataset.theme==='dark');document.querySelector('#theme')?.addEventListener('click',()=>{preference=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('theme',preference);}catch{}apply(preference==='dark');});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
 systemTheme.addEventListener('change',event=>{if(!preference)apply(event.matches);});
 window.addEventListener('storage',event=>{if(event.key!=='theme')return;preference=['dark','light'].includes(event.newValue)?event.newValue:null;apply(preference?preference==='dark':systemTheme.matches);});
})();
