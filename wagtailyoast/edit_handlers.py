import json
import logging

from django.conf import settings
from django import forms
from wagtail.admin.panels import ObjectList
from wagtail.admin.panels import FieldPanel, MultiFieldPanel

from .identifiers import READABILITY_IDENTIFIER_SET, SEO_IDENTIFIER_SET

WY_DEBUG = getattr(settings, "WY_DEBUG", False)

logger = logging.getLogger(__name__)


def _normalize_hide_results_list(value):
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    try:
        return list(value)
    except TypeError:
        return [value]


def _filter_hide_results_identifiers(section_name, values, allowed_set):
    filtered = []
    for item in _normalize_hide_results_list(values):
        if not isinstance(item, str):
            logger.warning(
                "YoastPanel: ignoring non-string hide_results identifier %r in %s",
                item,
                section_name,
            )
            continue
        if item not in allowed_set:
            logger.warning(
                "YoastPanel: ignoring invalid hide_results identifier '%s' in %s",
                item,
                section_name,
            )
            continue
        filtered.append(item)
    return filtered

class YoastPanel(ObjectList):
    class BoundPanel(ObjectList.BoundPanel):
        template_name = "wagtailyoast/edit_handlers/yoast_panel.html"

        @property
        def keywords_field(self):
            try:
                return self.form[self.panel.keywords]
            except Exception:
                return ""

    def __init__(
        self,
        keywords="keywords",
        title="seo_title",
        search_description="search_description",
        slug="slug",
        heading="Yoast",
        hide_results=None,
        keywords_hidden=False,
        *args,
        **kwargs,
    ):
        """
        Panel used by a wagtail Page

        :param keywords: Default keywords of the page.
        :param title: 'Search Engine Friendly' title.
        :param search_description: 'Search Engine Friendly' description.
        :param slug: URL of the page.
        :param heading: Heading of pannel
        """
        #  TODO: Test if fields exist

        self.keywords = keywords
        self.title_field = title
        self.search_description = search_description
        self.slug = slug
        self.keywords_hidden = keywords_hidden

        # Normalize hide_results into a dict like:
        # {"seo": ["keywordDensity"], "readability": ["passiveVoice", ...]}
        self.hide_results = {"seo": [], "readability": []}

        if hide_results:
            if isinstance(hide_results, str):
                try:
                    hide_results = json.loads(hide_results)
                except Exception:
                    logger.warning("YoastPanel: invalid hide_results JSON, ignoring")
                    hide_results = None

            if isinstance(hide_results, dict):
                self.hide_results["seo"] = hide_results.get("seo", [])
                self.hide_results["readability"] = hide_results.get("readability", [])
            elif hide_results is not None:
                seo = getattr(hide_results, "seo", None)
                readability = getattr(hide_results, "readability", None)
                if seo is not None:
                    self.hide_results["seo"] = seo
                if readability is not None:
                    self.hide_results["readability"] = readability

        self.hide_results["seo"] = _filter_hide_results_identifiers(
            "seo", self.hide_results.get("seo"), SEO_IDENTIFIER_SET
        )
        self.hide_results["readability"] = _filter_hide_results_identifiers(
            "readability",
            self.hide_results.get("readability"),
            READABILITY_IDENTIFIER_SET,
        )

        self.hide_results_json = json.dumps(self.hide_results)

        self.debug = WY_DEBUG

        if keywords_hidden == True:
            children = [
                MultiFieldPanel([
                    FieldPanel(
                        keywords,
                        widget=forms.HiddenInput(attrs={'id': 'yoast_keywords'})
                    ),
                ], heading="Evaluation comments"),
            ]
        else:
            children = [
                MultiFieldPanel([
                    FieldPanel(
                        keywords,
                        widget=forms.TextInput(attrs={'id': 'yoast_keywords'})
                    ),
                ], heading="Evaluation comments"),
            ]
        super().__init__(children=children, heading=heading)

    def clone_kwargs(self):
        kwargs = super().clone_kwargs()
        kwargs['keywords'] = self.keywords
        kwargs['title'] = self.title_field
        kwargs['search_description'] = self.search_description
        kwargs['slug'] = self.slug
        kwargs['hide_results'] = self.hide_results_json
        kwargs['keywords_hidden'] = self.keywords_hidden
        return kwargs
