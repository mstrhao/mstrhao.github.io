'use strict';
(() => {
  const content = JSON.parse(document.getElementById('site-content').textContent);
  const button = document.getElementById('language');
  let language = 'en';
  try { const saved = localStorage.getItem('hao-zhou-language'); if (saved === 'en' || saved === 'zh') language = saved; else if (navigator.language.toLowerCase().startsWith('zh')) language = 'zh'; } catch (_) {}
  function render(lang, preservePosition = false) {
    const section = [...document.querySelectorAll('main section')].reverse().find(el => el.getBoundingClientRect().top <= 80);
    const offset = section ? section.getBoundingClientRect().top : 0;
    language = lang;
    const text = content[lang];
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = text.pageTitle;
    document.querySelector('meta[name="description"]').content = text.intro;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = text[el.dataset.i18n]; });
    document.querySelector('.other-name').lang = lang === 'zh' ? 'en' : 'zh-CN';
    document.querySelector('nav').setAttribute('aria-label', lang === 'zh' ? '主导航' : 'Main navigation');
    document.querySelector('.wordmark').setAttribute('aria-label', lang === 'zh' ? '周浩主页' : 'Hao Zhou home');
    button.textContent = text.switchText;
    button.setAttribute('aria-label', text.switchLabel);
    button.lang = lang === 'zh' ? 'en' : 'zh-CN';
    button.hidden = false;
    if (preservePosition && section) window.scrollBy(0, section.getBoundingClientRect().top - offset);
  }
  button.addEventListener('click', () => {
    render(language === 'en' ? 'zh' : 'en', true);
    try { localStorage.setItem('hao-zhou-language', language); } catch (_) {}
  });
  render(language);
})();
