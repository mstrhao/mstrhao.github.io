'use strict';
(() => {
  const content = JSON.parse(document.getElementById('site-content').textContent);
  const button = document.getElementById('language');
  const pageTitles = {projects:'projectsTitle',methods:'methodsTitle',publications:'publicationsTitle',blog:'blogTitle',contact:'contactTitle'};
  let language = 'en';
  try { const saved = localStorage.getItem('hao-zhou-language'); if (saved === 'en' || saved === 'zh') language = saved; else if (navigator.language.toLowerCase().startsWith('zh')) language = 'zh'; } catch (_) {}
  function render(lang) {
    language = lang;
    const text = content[lang];
    const view = document.body.dataset.view;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = pageTitles[view] ? text[pageTitles[view]] + ' | ' + text.name : text.pageTitle;
    document.querySelector('meta[name="description"]').content = text.intro;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = text[el.dataset.i18n]; });
    document.querySelector('.other-name').lang = lang === 'zh' ? 'en' : 'zh-CN';
    document.querySelector('nav').setAttribute('aria-label', lang === 'zh' ? '主导航' : 'Main navigation');
    document.querySelector('.wordmark').setAttribute('aria-label', lang === 'zh' ? '周浩主页' : 'Hao Zhou home');
    button.textContent = text.switchText;
    button.setAttribute('aria-label', text.switchLabel);
    button.lang = lang === 'zh' ? 'en' : 'zh-CN';
    button.hidden = false;
  }
  function route() {
    const hash = location.hash.slice(1);
    const view = Object.prototype.hasOwnProperty.call(pageTitles, hash) ? hash : 'home';
    document.body.dataset.view = view;
    document.querySelectorAll('nav a').forEach(link => {
      const active = link.getAttribute('href') === (view === 'home' ? '/' : '#' + view);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    render(language);
    if (view === 'home' && hash === 'research') document.getElementById('research').scrollIntoView();
    else window.scrollTo(0,0);
  }
  button.addEventListener('click', () => {
    render(language === 'en' ? 'zh' : 'en');
    try { localStorage.setItem('hao-zhou-language', language); } catch (_) {}
  });
  document.querySelectorAll('a[href="/"]').forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.pushState({}, '', '/');
    route();
  }));
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
  route();
})();
