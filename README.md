# Hao Zhou's bilingual academic homepage

This is a dependency-free static site served by GitHub Pages.

## Editing and building

- `content.json` holds bilingual copy, publication metadata, blog metadata, and public calendar entries.
- `template.html` defines the page layout.
- `partials/blog-list.html` and `partials/blog-articles.html` preserve the published blog's rich layouts, figures, links, and translation keys. Update these alongside the corresponding metadata and translations when adding or editing a post.
- `styles.css` and `app.js` control layout, language selection, navigation, search, and the calendar.
- Run `python3 build.py` to regenerate `index.html`. Commit the generated page together with its source changes.

The build checks calendar data, blog-topic relationships, matching article slugs, bilingual blog translations, and local publication PDFs. Do not edit only `index.html`: a later build would discard those changes.

Before publishing, check English and Chinese, the home/research/publications/blog/contact views, blog search, article navigation, and the public calendar. Keep publication, preprint, study-protocol, and future-direction labels distinct. Existing public data and blog text must be preserved during unrelated layout changes.
