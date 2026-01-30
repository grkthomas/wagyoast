from __future__ import annotations

from django import template

register = template.Library()


@register.filter
def getitem(value, key):
    """Template helper for dynamic lookup: {{ form|getitem:field_name }}."""
    if value is None:
        return ""
    try:
        return value[key]
    except Exception:
        return ""
