"""Build a dependency-free, bilingual site from content.json. Python 3 only."""
import json, html, re
from pathlib import Path
root = Path(__file__).resolve().parent
data = json.loads((root/'content.json').read_text())
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
blog_items = []
for i, post in enumerate(data.get('blogPosts', [])):
    title_key, summary_key = f'blogTitle{i}', f'blogSummary{i}'
    for lang in ('en', 'zh'):
        data[lang][title_key] = post['title'][lang]
        data[lang][summary_key] = post['summary'][lang]
    blog_items.append('<article class="blog-post"><p class="publication-meta">'+html.escape(post['date'])+'</p><h3><a href="'+html.escape(post['url'], quote=True)+'" data-i18n="'+title_key+'">'+html.escape(post['title']['en'])+'</a></h3><p data-i18n="'+summary_key+'">'+html.escape(post['summary']['en'])+'</p></article>')
blog = ''.join(blog_items) if blog_items else '<p class="blog-empty" data-i18n="blogEmpty">'+html.escape(data['en']['blogEmpty'])+'</p>'
template = template.replace('{{blog}}', blog)
template = template.replace('{{email}}', html.escape(data['email'], quote=True))
template = template.replace('{{github}}', html.escape(data['github'], quote=True))
template = template.replace('{{draft_hidden}}', '' if data['draft'] else 'hidden')
template = template.replace('{{data}}', json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))
(root/'index.html').write_text(template)
print('Built bilingual hash-routed homepage')
