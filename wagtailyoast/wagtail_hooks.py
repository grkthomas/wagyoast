import json
from django.utils.html import format_html, format_html_join, mark_safe
from django.templatetags.static import static
from wagtail import hooks

from . import context


@hooks.register('insert_editor_js')
def yoast_panel_js():
    """
    Add Yoast javascript files : Analysis and Worker
    :return: HTML <scripts>
    """
    cxt = json.dumps({
        'version': context.VERSION,
        'locale': context.LOCALE,
        'staticUrl': context.STATIC_URL,
    })
    suffix = ('?v=%s' % context.VERSION) if context.VERSION else ''
    js_files = [
        'wagtailyoast/dist/js/yoastanalysis.js',
    ]
    js_includes = format_html_join(
        '\n',
        '<script src="{0}"></script>',
        (((static(filename) + suffix),) for filename in js_files)
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
    suffix = ('?v=%s' % context.VERSION) if context.VERSION else ''
    css_files = [
        'wagtailyoast/dist/css/styles.css',
    ]
    css_includes = format_html_join(
        '\n',
        '<link href="{0}" rel="stylesheet" type="text/css">',
        (((static(filename) + suffix),) for filename in css_files)
    )
    return css_includes
