"""Build a dependency-free, bilingual site from content.json. Python 3 only."""
import json, html
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
    publications.append(f'<article class="publication"><p class="publication-meta">{esc(paper["year"])} <span aria-hidden="true">/</span> {status}</p><h3 lang="en"><a href="{esc(paper["url"])}">{esc(paper["title"])}</a></h3>{author_html}<a class="text-link" href="{esc(paper["url"])}"><span data-i18n="{key}">{esc(data["en"][key])}</span> <span aria-hidden="true">↗</span></a></article>')
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
template = template.replace('{{email}}', html.escape(data['email'], quote=True))
template = template.replace('{{github}}', html.escape(data['github'], quote=True))
template = template.replace('{{draft_hidden}}', '' if data['draft'] else 'hidden')
template = template.replace('{{data}}', json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))
(root/'index.html').write_text(template)
print('Built index.html')
