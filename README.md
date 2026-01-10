
# WagtailYoast (Wagtail 7.1.2) – Integration Guide

![Preview](WagtailYoast.png)

This repository contains a small Wagtail project plus a local app named `wagtailyoast` that adds a Yoast-style SEO + readability analysis panel inside the Wagtail page editor.

This repository is an attempt to update the existing project at https://github.com/Aleksi44/wagtailyoast.

The analysis is powered by the `yoastseo` JavaScript library. It works by:

1. Posting the current edit form to the Wagtail preview endpoint
2. Fetching the preview HTML
3. Running Yoast analysis inside a WebWorker
4. Rendering results in a dedicated “Yoast” tab

The example page type used throughout this guide is the `Post` model (a `Page` subclass).

---

## Versions used (known-good)

These are the versions used while implementing and validating this integration in this workspace:

- Python: 3.12.3
- Django: 5.2.x (`Django>=5.2,<5.3`)
- Wagtail: 7.1.2
- Node.js: v20.19.6
- npm: 10.8.2
- yoastseo (npm): ^1.91.0

If you use different Node/Python versions, it may still work, but the above set is the baseline this project was verified against.

---

## What you get

- A new editor tab labeled “Yoast” for supported page types.
- A “Focus keyphrase” field (stored in the model; used by Yoast keyword analysis).
- SEO + Readability results that update as you type.
- Zero jQuery dependency (modern Wagtail admin safe).

---

## Python dependencies

In this repo the Python requirements are intentionally minimal; Wagtail pulls its own dependencies.

`requirements.txt`:

- `Django>=5.2,<5.3`
- `wagtail==7.1.2`

Install:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Node / npm dependencies

The Yoast analysis runs in the browser, so we bundle JavaScript assets for the Wagtail admin.

`package.json` dependencies:

- Runtime: `yoastseo`
- Dev/build: `esbuild-wasm`, `@esbuild-plugins/node-globals-polyfill`, `@esbuild-plugins/node-modules-polyfill`

Install + build:

```bash
npm install
npm run build:yoast
```

Output:

- `wagtailyoast/static/wagtailyoast/dist/js/yoastanalysis.js`
- `wagtailyoast/static/wagtailyoast/dist/js/yoastworker.js`

You must re-run `npm run build:yoast` whenever:

- you change any code under `wagtailyoast/static/wagtailyoast/src/js/`
- you upgrade `yoastseo` or build tooling

---

## Step-by-step: adding `wagtailyoast` to a fresh Wagtail 7.1.2 project

### 1) Add the app code

This repo vendors the app as a local Django app at:

- `wagtailyoast/`

For a fresh project you have two typical options:

1. **Vendor/copy** the entire `wagtailyoast/` folder into your project root (same level as `manage.py`).
2. Package it and install via pip (not covered here because this repo uses the “vendored app” approach).

### 2) Add `wagtailyoast` to `INSTALLED_APPS`

In your settings (example: `wagyoast/settings/base.py`), add:

```python
INSTALLED_APPS = [
	# ...
	"wagtailyoast",
	# ...
]
```

WagtailYoast uses Wagtail hooks to inject its JS/CSS into the page editor, so it must be installed for the hooks to be registered.

### 3) Configure locale

Add a locale for Yoast analysis:

```python
WY_LOCALE = "en_US"
```

Notes:

- This locale is passed to `yoastseo` when the worker initializes.
- If you don’t set it, the code defaults to `en_US`.

### 4) Ensure static files are enabled

You need normal Django staticfiles support (Wagtail already expects this). The important piece is that `AppDirectoriesFinder` is enabled so Django can find `wagtailyoast/static/...`.

Example (already present in this repo):

```python
STATICFILES_FINDERS = [
	"django.contrib.staticfiles.finders.FileSystemFinder",
	"django.contrib.staticfiles.finders.AppDirectoriesFinder",
]
```

In production you must run:

```bash
python manage.py collectstatic
```

---

## Step-by-step: enable Yoast analysis for a model (example: `Post`)

Yoast analysis is attached to a Wagtail page type by adding a `YoastPanel` to its edit interface.

### 1) Add analyzable fields to your model

Minimal fields used by this implementation:

- `body`: the content that should appear in the preview HTML (Yoast analyzes the preview HTML).
- `keywords`: the “Focus keyphrase”.

In this repo, `Post` is defined in `post/models.py` as:

```python
class Post(Page):
	parent_page_types = ["home.HomePage"]

	body = models.TextField(blank=True)
	keywords = models.CharField(max_length=255, blank=True)
```

Important: YoastPanel also expects these standard `Page` fields to exist:

- `seo_title` (built-in on `Page`)
- `search_description` (built-in on `Page`)
- `slug` (built-in on `Page`)

So you typically do NOT add those yourself; you just point the panel at them.

### 2) Add panels (Content + Promote)

This is the key part that makes the editor usable and makes the Yoast tab appear.

Example used in this repo:

```python
from wagtail.admin.panels import FieldPanel, ObjectList, TabbedInterface
from wagtailyoast.edit_handlers import YoastPanel

class Post(Page):
	# ... fields omitted

	content_panels = Page.content_panels + [
		FieldPanel("body"),
	]

	promote_panels = Page.promote_panels + [
		FieldPanel("keywords"),
	]
```

### 3) Add the “Yoast” tab (recommended and used here)

This project uses a dedicated editor tab because it provides the best UX and it matches how Yoast panels are typically shown.

```python
edit_handler = TabbedInterface(
	[
		ObjectList(content_panels, heading="Content"),
		ObjectList(promote_panels, heading="Promote"),
		YoastPanel(
			keywords="keywords",
			title="seo_title",
			search_description="search_description",
			slug="slug",
			heading="Yoast",
		),
		ObjectList(Page.settings_panels, heading="Settings"),
	]
)
```

Is the Yoast tab necessary?

- Not strictly; you *could* embed the panel elsewhere.
- Practically, yes: a dedicated tab keeps analysis UI separate, prevents layout conflicts, and matches the current templates/JS expectation that the panel container exists as `#yoast_panel`.

### 4) Run migrations

After changing the model:

```bash
python manage.py makemigrations
python manage.py migrate
```
This example uses SQLite

---

## Template requirements (critical)

Yoast analyzes the preview HTML returned by Wagtail’s preview endpoint.

That means:

- If your template doesn’t render the main content, Yoast can’t analyze it.
- The easiest way to confirm is to click “Preview” in the editor and view the rendered HTML.

The example template used here is `post/templates/post/post.html` and it includes:

- `{{ page.title }}`
- `{{ page.search_description }}` (recommended)
- `{{ page.body }}` (required for content analysis)

This repo renders `body` as raw HTML using `|safe`:

```django
{% if page.body %}
  <div class="richtext">{{ page.body|safe }}</div>
{% endif %}
```

Security note:

- Rendering raw HTML from a database field is only safe if you fully trust the editors.
- If you need safer authoring, use Wagtail’s `RichTextField` and render via Wagtail rich-text rendering.

---

## How the admin integration works (so you know what must exist)

### Hooks that load JS/CSS

`wagtailyoast/wagtail_hooks.py` registers:

- `insert_editor_js`: loads `wagtailyoast/dist/js/yoastanalysis.js` and calls `new Yoast.Panel(context).init()` on DOM ready.
- `insert_editor_css`: loads `wagtailyoast/dist/css/styles.css`.

### Panel template (Wagtail 7 requirement)

Wagtail 7’s panel system requires the panel to provide a bound template name.

`wagtailyoast/edit_handlers.py` defines:

- `YoastPanel.BoundPanel.template_name = "wagtailyoast/edit_handlers/yoast_panel.html"`

That template renders the container:

- `<div id="yoast_panel"> ... </div>`

The JS relies on `#yoast_panel` existing, so if you don’t see analysis, the first thing to verify is that the Yoast panel is actually present in the edit interface.

### Worker bundle

- `yoastanalysis.js` runs in the main thread.
- `yoastworker.js` runs in a WebWorker, loaded via `new Worker(url)`.

Do not include `yoastworker.js` as a normal `<script>` tag.

---

## Local development checklist

1) Python setup:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
```

2) JS setup:

```bash
npm install
npm run build:yoast
```

3) Run server:

```bash
python manage.py runserver
```

4) In Wagtail admin:

- Create a `Post` page under the homepage
- Fill in:
  - Title
  - Promote tab: SEO title / Search description (optional but recommended)
  - Promote tab: Focus keyphrase (`keywords`)
  - Content tab: HTML body (`body`)
- Open the “Yoast” tab and confirm results appear

---

## Troubleshooting

### Yoast tab is present but empty

- Confirm your page type’s `edit_handler` includes `YoastPanel(...)`.
- Click the Yoast tab once (the JS also refreshes on tab activation).

### Console shows `#yoast_panel not found`

- You’re either not on a page type that includes `YoastPanel`, or the panel template didn’t render.
- Confirm you are editing a `Post` page (or whichever model you integrated).

### Worker fails to load / 404

- Ensure `npm run build:yoast` produced `wagtailyoast/static/wagtailyoast/dist/js/yoastworker.js`.
- Ensure staticfiles are served in development, or `collectstatic` has been run in production.
- Check `STATIC_URL` and your staticfiles storage/server configuration.

