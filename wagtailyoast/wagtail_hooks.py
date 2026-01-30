import json
from django.conf import settings
from django.contrib.staticfiles import finders
from django.utils.html import format_html, format_html_join, mark_safe
from django.templatetags.static import static
from wagtail import hooks

import os

from . import context


_YOAST_DIST_VERSION_FILES = (
    "wagtailyoast/dist/css/styles.css",
    "wagtailyoast/dist/js/yoastanalysis.js",
    "wagtailyoast/dist/js/yoastworker.js",
)


def _yoast_dist_version() -> int | str:
    """Version for cache-busting Yoast assets.

    Uses the newest mtime across key built assets (CSS + JS). Falls back to the
    package/context version if those files cannot be found.
    """
    newest = 0.0

    for static_path in _YOAST_DIST_VERSION_FILES:
        filesystem_path = finders.find(static_path)
        if not filesystem_path or not os.path.exists(filesystem_path):
            continue
        try:
            newest = max(newest, os.path.getmtime(filesystem_path))
        except OSError:
            continue

    if newest:
        return int(newest)

    return context.VERSION or ""


def _asset_suffix(static_path: str) -> str:
    """Cache-busting suffix for static assets.

    In development, use the file mtime so rebuilt assets are picked up without
    requiring a version bump or manual cache clearing.
    """
    if getattr(settings, "DEBUG", False) or getattr(settings, "WY_DEBUG", False):
        if static_path in _YOAST_DIST_VERSION_FILES:
            version = _yoast_dist_version()
            if version:
                return f"?v={version}"

        filesystem_path = finders.find(static_path)
        if filesystem_path and os.path.exists(filesystem_path):
            return f"?v={int(os.path.getmtime(filesystem_path))}"

    if context.VERSION:
        return f"?v={context.VERSION}"

    return ""


@hooks.register('insert_editor_js')
def yoast_panel_js():
    """
    Add Yoast javascript files : Analysis and Worker
    :return: HTML <scripts>
    """
    cxt = json.dumps({
        'version': _yoast_dist_version(),
        'locale': context.LOCALE,
        'staticUrl': context.STATIC_URL,
        'debug': getattr(settings, 'WY_DEBUG', False),
    })
    js_files = [
        'wagtailyoast/dist/js/yoastanalysis.js',
    ]
    js_includes = format_html_join(
        '\n',
        '<script src="{0}"></script>',
        (((static(filename) + _asset_suffix(filename)),) for filename in js_files)
    )
    js_exec = format_html(
        "<script>{}</script>",
        mark_safe(
            "document.addEventListener('DOMContentLoaded', function() {"
            "  const panel = new Yoast.Panel(%s);"
            "  panel.init();"
            "});" % cxt)
    )
    return js_includes + js_exec


@hooks.register('insert_editor_css')
def yoast_panel_css():
    """
    Add Yoast styles CSS files
    :return: HTML <link>
    """
    css_files = [
        'wagtailyoast/dist/css/styles.css',
    ]
    css_includes = format_html_join(
        '\n',
        '<link href="{0}" rel="stylesheet" type="text/css">',
        (((static(filename) + _asset_suffix(filename)),) for filename in css_files)
    )
    return css_includes
