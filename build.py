"""Build a dependency-free, bilingual site from content.json. Python 3 only."""
import json, html, re
from pathlib import Path
root = Path(__file__).resolve().parent
data = json.loads((root/'content.json').read_text())

# Validate only deliberately curated entries; preserve incomplete historical dates.
from datetime import date, datetime
from urllib.parse import urlparse
from zoneinfo import ZoneInfo
ZoneInfo(data.get('eventsTimeZone', 'Asia/Shanghai'))
seen_events = set()
for event in data.get('events', []):
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', event['id']) or event['id'] in seen_events:
        raise ValueError('Invalid or duplicate public event id')
    seen_events.add(event['id'])
    if event['category'] not in ('public-event', 'science', 'history', 'milestone'):
        raise ValueError('Invalid event category')
    value = event['date']
    if not re.fullmatch(r'[0-9]{4}(?:-[0-9]{2})?(?:-[0-9]{2})?', value):
        raise ValueError('Use year, year-month, or full Gregorian date')
    parts = [int(x) for x in value.split('-')]
    date(*(parts + [1] * (3-len(parts))))
    for field in ('title', 'description'):
        for lang in ('en', 'zh'):
            if not isinstance(event[field][lang], str) or not event[field][lang].strip():
                raise ValueError('Bilingual event text required')
    if event.get('endDate'):
        if len(value) != 10 or not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}',event['endDate']) or date.fromisoformat(event['endDate']) < date.fromisoformat(value):
            raise ValueError('Multi-day events require a valid inclusive end date')
    if event.get('start'):
        moment = datetime.fromisoformat(event['start'])
        if moment.utcoffset() is None or len(value) != 10:
            raise ValueError('Timed events need an explicit offset and exact date')
        zone = ZoneInfo(event['timeZone'])
        if moment.astimezone(ZoneInfo(data['eventsTimeZone'])).date().isoformat() != value:
            raise ValueError('Calendar date must match displayed timezone')
    if event['category'] in ('science','history') and not event.get('sources'):
        raise ValueError('Historical entries require a source')
    for source in event.get('sources', []):
        if urlparse(source['url']).scheme not in ('https','http') or not urlparse(source['url']).netloc:
            raise ValueError('Source must be a public web URL')

seen_topics = set()
published_slugs = {post['slug'] for post in data.get('blogPosts', [])}
for topic in data.get('blogTopics', []):
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', topic['slug']) or topic['slug'] in seen_topics:
        raise ValueError('Invalid or duplicate topic slug')
    seen_topics.add(topic['slug'])
    if len(topic['articles']) != len(set(topic['articles'])) or not set(topic['articles']).issubset(published_slugs):
        raise ValueError('Topics may link only published articles, without duplicates')
    for field in ('title', 'intro'):
        if any(not isinstance(topic[field][lang],str) or not topic[field][lang].strip() for lang in ('en','zh')):
            raise ValueError('Topics require bilingual public copy')

template = (root/'template.html').read_text()
for key, value in data['en'].items():
    template = template.replace('{{'+key+'}}', html.escape(value))
publications = []
for paper in data['publications']:
    esc = lambda x: html.escape(str(x), quote=True)
    is_preprint = paper['kind'] == 'preprint'
    status = '<span data-i18n="preprint">'+esc(data['en']['preprint'])+'</span>' if is_preprint else esc(paper['venue'])
    if paper['kind'] == 'protocol':
        status += ' · <span data-i18n="protocol">'+esc(data['en']['protocol'])+'</span> · '+esc(paper.get('collaboration', ''))
    key = 'paperLink' if is_preprint else 'articleLink'
    authors = esc(paper['authors']).replace('Hao Zhou', '<strong>Hao Zhou</strong>')
    author_html = f'<p class="authors" lang="en">{authors}</p>'
    if paper.get('authorsShort'):
        author_html = f'<p class="authors short-authors" lang="en">{esc(paper["authorsShort"])}</p><details class="author-details"><summary data-i18n="allAuthors">{esc(data["en"]["allAuthors"])}</summary><p class="authors" lang="en">{authors}</p></details>'
    pdf_link = ''
    pdf = paper.get('pdf')
    if pdf:
        # Publish only deliberately supplied, repository-local PDF paths.
        if not isinstance(pdf, str) or not re.fullmatch(r'papers/[A-Za-z0-9][A-Za-z0-9._-]*\.pdf', pdf):
            raise ValueError('Publication pdf must be a safe local papers/*.pdf path')
        if not (root/pdf).is_file():
            raise ValueError(f'Publication PDF is missing: {pdf}')
        pdf_link = f'<a class="text-link pdf-link" href="{esc(pdf)}" download><span data-i18n="pdfLink">{esc(data["en"]["pdfLink"])}</span> <span aria-hidden="true">↓</span></a>'
        license_url = paper.get('pdfLicenseUrl', '')
        if license_url not in ('https://creativecommons.org/licenses/by/4.0/', 'https://creativecommons.org/licenses/by-nc-nd/4.0/'):
            raise ValueError('Missing approved PDF license URL')
        pdf_link += f' <a class="pdf-license" href="{esc(license_url)}">{esc(paper["pdfLicense"])}</a>'
    publications.append(f'<article class="publication"><p class="publication-meta">{esc(paper["year"])} <span aria-hidden="true">/</span> {status}</p><h3 lang="en"><a href="{esc(paper["url"])}">{esc(paper["title"])}</a></h3>{author_html}<a class="text-link" href="{esc(paper["url"])}"><span data-i18n="{key}">{esc(data["en"][key])}</span> <span aria-hidden="true">↗</span></a>{pdf_link}</article>')
template = template.replace('{{publications}}', '\n'.join(publications))
notes = ''
if data['notesAndTools']:
    items = []
    for i, item in enumerate(data['notesAndTools']):
        key = f'noteTitle{i}'
        for lang in ('en', 'zh'): data[lang][key] = item['title'][lang]
        items.append(f'<li><a href="{html.escape(item["url"], quote=True)}" data-i18n="{key}">{html.escape(item["title"]["en"])}</a></li>')
    notes = '<section class="section" id="notes"><h2 data-i18n="notesTitle">'+data['en']['notesTitle']+'</h2><ul class="notes-list">'+''.join(items)+'</ul></section>'
template = template.replace('{{notes}}', notes)
blog_items, articles = [], []
for i, post in enumerate(data.get('blogPosts', [])):
    slug = post['slug']
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
        raise ValueError('Invalid blog slug')
    title_key, summary_key = f'blogTitle{i}', f'blogSummary{i}'
    for lang in ('en', 'zh'):
        data[lang][title_key] = post['title'][lang]
        data[lang][summary_key] = post['summary'][lang]
    esc = lambda x: html.escape(str(x), quote=True)
    blog_items.append(f'<article class="blog-post"><p class="publication-meta">{esc(post["date"])}</p><h3><a href="#blog/{slug}" data-i18n="{title_key}">{esc(post["title"]["en"])}</a></h3><p data-i18n="{summary_key}">{esc(post["summary"]["en"])}</p><a class="text-link" href="#blog/{slug}" data-i18n="readPost">{esc(data["en"]["readPost"])}</a></article>')
    body = []
    for j, paragraph in enumerate(post['body_en']):
        key = f'blog{i}Paragraph{j}'
        for lang in ('en','zh'): data[lang][key] = post['body_'+lang][j]
        body.append(f'<p data-i18n="{key}">{esc(paragraph)}</p>')
    refkey = f'blog{i}References'
    for lang in ('en','zh'): data[lang][refkey] = post['references_heading_'+lang]
    references = []
    for j, ref in enumerate(post.get('references', [])):
        if urlparse(ref['url']).scheme != 'https' or not urlparse(ref['url']).netloc:
            raise ValueError('References need verified HTTPS source links')
        link_label = 'DOI' if ref['url'].startswith('https://doi.org/') else 'Source'
        key = f'blog{i}Reference{j}Note'
        for lang in ('en','zh'): data[lang][key] = ref['reading_note_'+lang]
        references.append(f'<li><span lang="en">{esc(ref["label"])}</span> <a href="{esc(ref["url"])}" rel="noreferrer">{link_label} ↗</a><p data-i18n="{key}">{esc(ref["reading_note_en"])}</p></li>')
    references_html = (f'<section class="blog-references" aria-labelledby="refs-{slug}"><h2 id="refs-{slug}" data-i18n="{refkey}">{esc(post["references_heading_en"])}</h2><ol>'+''.join(references)+'</ol></section>') if references else ''
    articles.append(f'<article class="blog-reading" data-blog-slug="{slug}" hidden><p class="publication-meta">{esc(post["date"])}</p><h1 data-i18n="{title_key}">{esc(post["title"]["en"])}</h1><div class="blog-prose">'+''.join(body)+'</div>'+references_html+'</article>')
blog = ''.join(blog_items) if blog_items else '<p class="blog-empty" data-i18n="blogEmpty">'+data['en']['blogEmpty']+'</p>'
template = template.replace('{{blog}}', blog).replace('{{blogArticles}}', ''.join(articles))
template = template.replace('{{email}}', html.escape(data['email'], quote=True))
template = template.replace('{{github}}', html.escape(data['github'], quote=True))
template = template.replace('{{draft_hidden}}', '' if data['draft'] else 'hidden')
template = template.replace('{{data}}', json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))
(root/'index.html').write_text(template)
print('Built bilingual hash-routed homepage')

