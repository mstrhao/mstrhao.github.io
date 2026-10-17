const words={
 en:{title:'Comments',empty:'No approved comments yet.',loading:'Loading comments…',unavailable:'Comments are currently unavailable.',nickname:'Nickname',body:'Comment',send:'Submit for review',pending:'Submitted for review. Your comment will appear only after approval.',error:'Could not confirm submission. It may have been received; please wait before retrying.',rate:'Too many submissions. Please try again later.',notice:'Nickname and comment are stored by Supabase and become public only after approval. Please do not include private information. Submissions are limited per article and site-wide. Hosting providers may retain request logs.',more:'Load more',invalid:'Enter a nickname (1–60 characters) and comment (1–2000 characters).'},
 zh:{title:'评论',empty:'暂无已审核的评论。',loading:'正在加载评论…',unavailable:'评论功能暂不可用。',nickname:'昵称',body:'评论',send:'提交审核',pending:'已提交审核，通过后才会公开显示。',error:'无法确认是否提交成功，评论可能已收到；请稍后再试。',rate:'提交过于频繁，请稍后再试。',notice:'昵称和评论由 Supabase 存储，仅在审核通过后公开。请勿填写私人信息。提交受文章和全站总量限制。托管服务商可能保留请求日志。',more:'加载更多',invalid:'请填写昵称（1–60 字符）和评论（1–2000 字符）。'}
};
export function validConfig(c) {
 return !!(c && c.enabled===true && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.url) && typeof c.publishableKey==='string' && c.publishableKey.startsWith('sb_publishable_'));
}
// Caller explicitly invokes show after each route/language render. No global route guessing.
export function createCommentsController(root,config,fetcher=fetch) {
 let controller, generation=0, snapshot=null, visible=null;
 const drafts=new Map(); // Memory only: no local/session storage or analytics.
 const stateFor=slug=>{if(!drafts.has(slug))drafts.set(slug,{nickname:'',body:'',busy:false,outcome:''});return drafts.get(slug);};
 const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 function stop(){snapshot?.();snapshot=null;visible=null;generation++;controller?.abort();root.replaceChildren();}
 function show(slug,language='en') {
  stop(); if(!slug)return;
  const t=words[language]||words.en; const state=stateFor(slug); root.append(el('h2',t.title));
  if(!validConfig(config)){root.append(el('p',t.unavailable));return;}
  controller=new AbortController(); const signal=controller.signal, version=generation;
  const active=()=>version===generation&&!signal.aborted;
  const list=el('div'),status=el('p',t.loading),more=el('button',t.more);
  status.setAttribute('role','status');more.type='button';more.hidden=true;
  root.append(list,status,more);
  let offset=0, loading=false;
  async function load(){
   if(loading)return; loading=true;more.disabled=true;
   try{
    const url=new URL(config.url+'/rest/v1/blog_comments');
    url.search=new URLSearchParams({select:'id,article_slug,nickname,body,created_at',article_slug:'eq.'+slug,order:'created_at.asc,id.asc',limit:'50',offset:String(offset)}).toString();
    const res=await fetcher(url,{headers:{apikey:config.publishableKey},signal});
    if(!res.ok)throw Error();const rows=await res.json(); if(!Array.isArray(rows))throw Error(); if(!active())return;
    rows.forEach(row=>{const article=el('article');article.append(el('strong',row.nickname),el('p',row.body));list.append(article);});
    offset+=rows.length;status.textContent=offset?'':t.empty;more.hidden=rows.length<50;
   }catch(_){if(active())status.textContent=t.unavailable;}finally{if(active()){loading=false;more.disabled=false;}}
  }
  more.addEventListener('click',load);void load();
  const form=el('form'),nick=el('input'),body=el('textarea'),submit=el('button',t.send),notice=el('p',t.notice),submission=el('p');
  nick.required=body.required=true;nick.maxLength=120;body.maxLength=4000;nick.autocomplete='off';
  const nl=el('label',t.nickname),bl=el('label',t.body);nl.append(nick);bl.append(body);
  submit.type='submit';submission.setAttribute('role','status');form.append(notice,nl,bl,submit,submission);root.append(form);
  function refresh(){
   nick.value=state.nickname;body.value=state.body;
   nick.disabled=body.disabled=submit.disabled=state.busy;
   submission.textContent=state.outcome ? t[state.outcome] : '';
  }
  snapshot=()=>{if(!state.busy){state.nickname=nick.value;state.body=body.value;}};
  visible={slug,refresh};refresh();
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(state.busy)return;
   state.nickname=nick.value;state.body=body.value;
   const nickname=state.nickname.trim(),text=state.body.trim();
   if(!nickname||!text||[...nickname].length>60||[...text].length>2000){state.outcome='invalid';refresh();return;}
   state.busy=true;state.outcome='';refresh();
   try{
    // Route changes abort GETs only. Keep one POST alive and shared across language renders.
    // Timeout is uncertain receipt; no automatic retry. This is not server-side idempotency.
    const res=await fetcher(config.url+'/functions/v1/submit-comment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({article_slug:slug,nickname,body:text}),signal:AbortSignal.timeout(15000)});
    if(res.status===202){state.outcome='pending';state.nickname='';state.body='';}
    else state.outcome=res.status===429?'rate':'error';
   }catch(_){state.outcome='error';}
   finally{state.busy=false;if(visible?.slug===slug)visible.refresh();}
  });
 }
 return {show,destroy:stop};
}
