'use strict';
(() => {
  const content = JSON.parse(document.getElementById('site-content').textContent);
  const button = document.getElementById('language');
  const pageTitles = {'blog-article':'blogTitle',events:'eventsTitle',projects:'projectsTitle',methods:'methodsTitle',publications:'publicationsTitle',blog:'blogTitle',contact:'contactTitle'};
  let language = 'en';
  // Public collection endpoint only; no dashboard token or API credential.
  let analyticsLastPath = null;
  let analyticsQueue = [];
  let analyticsReady = false;
  let analyticsReferrer = '';
  try {
    const source = new URL(document.referrer);
    if (source.origin !== location.origin) analyticsReferrer = source.origin;
  } catch (_) {}
  function flushAnalytics() {
    if (!analyticsReady || !window.goatcounter || !window.goatcounter.count) return;
    const pending = analyticsQueue;
    analyticsQueue = [];
    pending.forEach(item => { try { window.goatcounter.count(item); } catch (_) {} });
  }
  function trackView(view) {
    const article = currentBlog();
    const path = view === 'home' ? '/' : '/#' + (view === 'blog-article' && article ? 'blog/'+article.slug : view);
    if (analyticsLastPath === path) return;
    analyticsLastPath = path;
    analyticsQueue.push({path, title: view === 'home' ? content.en.pageTitle : article && view === 'blog-article' ? article.title.en : content.en[pageTitles[view]], referrer: analyticsReferrer});
    if (analyticsQueue.length > 30) analyticsQueue.shift();
    flushAnalytics();
  }
  if (location.hostname === 'mstrhao.github.io') {
    window.goatcounter = {no_onload: true, no_events: true};
    const analyticsScript = document.createElement('script');
    analyticsScript.src = 'https://gc.zgo.at/count.js';
    analyticsScript.async = true;
    analyticsScript.setAttribute('data-goatcounter', 'https://mstrhao.goatcounter.com/count');
    analyticsScript.addEventListener('load', () => { analyticsReady = true; flushAnalytics(); });
    analyticsScript.addEventListener('error', () => { analyticsQueue = []; });
    document.head.append(analyticsScript);
  }

  try { const saved = localStorage.getItem('hao-zhou-language'); if (saved === 'en' || saved === 'zh') language = saved; else if (navigator.language.toLowerCase().startsWith('zh')) language = 'zh'; } catch (_) {}
  function currentBlog() { return (content.blogPosts || []).find(post => location.hash === '#blog/' + post.slug); }
  function render(lang) {
    language = lang;
    const text = content[lang];
    const view = document.body.dataset.view;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    const article = currentBlog();
    document.querySelectorAll('[data-blog-slug]').forEach(el => { el.hidden = !article || el.dataset.blogSlug !== article.slug; });
    document.title = article && view === 'blog-article' ? article.title[lang] + ' | ' + text.name : pageTitles[view] ? text[pageTitles[view]] + ' | ' + text.name : text.pageTitle;
    document.querySelector('meta[name="description"]').content = text.intro;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = text[el.dataset.i18n]; });
    document.querySelector('.other-name').lang = lang === 'zh' ? 'en' : 'zh-CN';
    document.querySelector('nav').setAttribute('aria-label', lang === 'zh' ? '主导航' : 'Main navigation');
    document.querySelector('.wordmark').setAttribute('aria-label', lang === 'zh' ? '周浩主页' : 'Hao Zhou home');
    button.textContent = text.switchText;
    button.setAttribute('aria-label', text.switchLabel);
    button.lang = lang === 'zh' ? 'en' : 'zh-CN';
    button.hidden = false;
    renderEvents();
    renderRecentEvents();
  }
  function route() {
    const hash = location.hash.slice(1);
    const view = currentBlog() ? 'blog-article' : hash.startsWith('blog/') ? 'blog' : Object.prototype.hasOwnProperty.call(pageTitles, hash) && hash !== 'blog-article' ? hash : 'home';
    document.body.dataset.view = view;
    document.querySelectorAll('nav a').forEach(link => {
      const active = link.getAttribute('href') === (view === 'home' ? '/' : view === 'blog-article' ? '#blog' : '#' + view);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    render(language);
    trackView(view);
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
  document.querySelectorAll('.pdf-link').forEach(link => link.addEventListener('click', () => {
    const paper = content.publications.find(item => item.pdf === link.getAttribute('href'));
    if (!paper) return;
    analyticsQueue.push({path: 'pdf-download-click/' + paper.pdf.split('/').pop().replace(/\.pdf$/, ''), title: 'PDF download click: ' + paper.title, event: true, no_session: true, referrer: analyticsReferrer});
    if (analyticsQueue.length > 30) analyticsQueue.shift();
    flushAnalytics();
  }));

  // Deliberately curated public entries only; no calendar sync or user data input.
  const eventCategories = {'public-event':'eventsPublic',science:'eventsScience',history:'eventsSocial',milestone:'eventsMilestone'};
  const eventEntries = content.events || [];
  const eventZone = content.eventsTimeZone || 'Asia/Shanghai';
  const currentParts = new Intl.DateTimeFormat('en-CA',{timeZone:eventZone,year:'numeric',month:'2-digit'}).formatToParts(new Date());
  const currentYear = Number(currentParts.find(p => p.type === 'year').value);
  let eventView = 'month';
  let eventMonth = Number(currentParts.find(p => p.type === 'month').value);
  const eventYear = document.getElementById('events-year');
  eventYear.value = String(currentYear);
  const eventSearch = document.getElementById('events-search');
  const eventCategory = document.getElementById('events-category');
  const monthSelect = document.getElementById('events-month');
  function element(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function eventDate(entry) {
    if (entry.start) return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-GB',{timeZone:eventZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(entry.start));
    const [year,month,day] = entry.date.split('-');
    return language === 'zh' ? year+'年'+(month ? Number(month)+'月' : '')+(day ? Number(day)+'日' : '') : entry.date;
  }
  function eventCard(entry) {
    const article = element('article', undefined, 'event-entry');
    article.append(element('p', eventDate(entry)+' · '+content[language][eventCategories[entry.category]],'publication-meta'));
    article.append(element('h3', entry.title[language]));
    article.append(element('p', entry.description[language]));
    if (entry.location) article.append(element('p',entry.location[language],'events-note'));
    (entry.sources || []).forEach(source => {
      const a = element('a', source.label || content[language].eventsSource,'event-source');
      a.href = source.url; a.rel = 'noreferrer'; article.append(a);
    });
    return article;
  }
  function renderRecentEvents() {
    const todayParts = new Intl.DateTimeFormat('en-CA',{timeZone:eventZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const today = ['year','month','day'].map(key=>todayParts.find(p=>p.type===key).value).join('-');
    const entries = eventEntries.filter(entry=>entry.category==='public-event' && entry.date.length===10 && entry.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||(a.start||'').localeCompare(b.start||'')).slice(0,3);
    const target=document.getElementById('recent-events');target.replaceChildren();
    if(!entries.length) target.append(element('p',content[language].recentNone));
    entries.forEach(entry=>target.append(element('p',eventDate(entry)+' · '+entry.title[language])));
  }
  function renderEvents() {
    const text = content[language];
    document.querySelector('.events-views').setAttribute('aria-label',language === 'zh' ? '显示方式' : 'View');
    document.getElementById('events-list-view').setAttribute('aria-pressed',String(eventView === 'list'));
    document.getElementById('events-month-view').setAttribute('aria-pressed',String(eventView === 'month'));
    document.getElementById('events-month-label').hidden = eventView !== 'month';
    document.querySelector('.events-month-nav').hidden = eventView !== 'month';
    eventYear.placeholder = text.eventsYearHint;
    monthSelect.replaceChildren();
    for (let m=1;m<=12;m++) {
      const option=element('option',language === 'zh' ? m+'月' : new Intl.DateTimeFormat('en',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2000,m-1,1))));
      option.value=String(m); option.selected=m === eventMonth; monthSelect.append(option);
    }
    const requestedYear = Number(eventYear.value);
    const yearValid = Number.isInteger(requestedYear) && requestedYear >= 1 && requestedYear <= 9999;
    const selectedYear = yearValid ? requestedYear : currentYear;
    const query = eventSearch.value.trim().toLocaleLowerCase();
    const filtered = eventEntries.filter(entry => (!eventCategory.value || entry.category === eventCategory.value) && (!eventYear.value || !yearValid || Number(entry.date.slice(0,4)) === requestedYear) && (!query || [entry.title.en,entry.title.zh,entry.description.en,entry.description.zh].some(s=>s.toLocaleLowerCase().includes(query)))).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
    const target=document.getElementById('events-results'); target.replaceChildren();
    if (eventView === 'list') {
      if (!filtered.length) target.append(element('p', eventEntries.length ? text.eventsNoMatch : text.eventsEmpty,'blog-empty'));
      filtered.forEach(entry=>target.append(eventCard(entry)));
      return;
    }
    // UTC calendar math avoids DST and browser-local timezone shifts; setFullYear supports years 1–99.
    const first=new Date(0); first.setUTCFullYear(selectedYear,eventMonth-1,1); first.setUTCHours(0,0,0,0);
    const last=new Date(first); last.setUTCMonth(eventMonth,0);
    const table=element('table',undefined,'events-calendar');
    table.append(element('caption',language === 'zh' ? selectedYear+'年'+eventMonth+'月' : monthSelect.options[eventMonth-1].textContent+' '+selectedYear));
    const head=element('thead'), headings=element('tr');
    (language === 'zh' ? ['一','二','三','四','五','六','日'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']).forEach(day=>{const cell=element('th',day);cell.scope='col';headings.append(cell);});
    head.append(headings);table.append(head);
    const body=element('tbody'); const offset=(first.getUTCDay()+6)%7;
    const inMonth=filtered.filter(entry=>entry.date.length===10 && Number(entry.date.slice(0,4))===selectedYear && Number(entry.date.slice(5,7))===eventMonth);
    for(let i=0;i<Math.ceil((offset+last.getUTCDate())/7)*7;i++) {
      if(i%7===0) body.append(element('tr'));
      const cell=element('td');const day=i-offset+1;
      if(day>=1 && day<=last.getUTCDate()) {
        cell.append(element('span',String(day),'calendar-day'));
        inMonth.filter(entry=>Number(entry.date.slice(8,10))===day).forEach(entry=>{const link=element('a',entry.title[language]);link.href='#event-'+entry.id;link.addEventListener('click',event=>{event.preventDefault();document.getElementById('event-'+entry.id)?.scrollIntoView({block:'center'});});cell.append(link);});
      }
      body.lastElementChild.append(cell);
    }
    table.append(body);target.append(table);
    if(!inMonth.length) target.append(element('p', eventEntries.length ? text.eventsNoMatch : text.eventsEmpty,'blog-empty'));
    inMonth.forEach(entry=>{const card=eventCard(entry);card.id='event-'+entry.id;target.append(card);});
  }
  function shiftEventMonth(delta) {
    const value = Number(eventYear.value);
    const year = Number.isInteger(value) && value >= 1 && value <= 9999 ? value : currentYear;
    const total = (year-1)*12+eventMonth-1+delta;
    if(total < 0 || total >= 9999*12) return;
    eventYear.value = String(Math.floor(total/12)+1); eventMonth = total%12+1; renderEvents();
  }
  document.getElementById('events-previous').addEventListener('click',()=>shiftEventMonth(-1));
  document.getElementById('events-next').addEventListener('click',()=>shiftEventMonth(1));
  document.getElementById('events-list-view').addEventListener('click',()=>{eventView='list';renderEvents();});
  document.getElementById('events-month-view').addEventListener('click',()=>{eventView='month';if(!eventYear.value)eventYear.value=String(currentYear);renderEvents();});
  [eventSearch,eventYear,eventCategory].forEach(control=>control.addEventListener('input',renderEvents));
  monthSelect.addEventListener('change',()=>{eventMonth=Number(monthSelect.value);renderEvents();});
  document.getElementById('events-reset').addEventListener('click',()=>{eventSearch.value='';eventYear.value=eventView==='month'?String(currentYear):'';eventCategory.value='';renderEvents();});

  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
  route();
})();
