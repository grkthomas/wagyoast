import json

from django.conf import settings
from django import forms
from wagtail.admin.panels import ObjectList
from wagtail.admin.panels import FieldPanel, MultiFieldPanel

WY_DEBUG = getattr(settings, "WY_DEBUG", False)

class YoastPanel(ObjectList):
    class BoundPanel(ObjectList.BoundPanel):
        template_name = "wagtailyoast/edit_handlers/yoast_panel.html"

    def __init__(
        self,
        keywords="keywords",
        title="seo_title",
        search_description="search_description",
        slug="slug",
        heading="Yoast",
        hide_results=None,
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

        self.title_field = title
        self.search_description = search_description
        self.slug = slug

        # Normalize hide_results into a dict like:
        # {"seo": ["keywordDensity"], "readability": ["passiveVoice", ...]}
        self.hide_results = {"seo": [], "readability": []}

        if hide_results:
            if isinstance(hide_results, dict):
                self.hide_results["seo"] = list(hide_results.get("seo", []))
                self.hide_results["readability"] = list(hide_results.get("readability", []))
            else:
                seo = getattr(hide_results, "seo", None)
                readability = getattr(hide_results, "readability", None)
                if seo:
                    self.hide_results["seo"] = list(seo)
                if readability:
                    self.hide_results["readability"] = list(readability)

        self.hide_results_json = json.dumps(self.hide_results)

        self.debug = WY_DEBUG

        children = [
            MultiFieldPanel([
                FieldPanel(
                    keywords,
                    widget=forms.TextInput(attrs={'id': 'yoast_keywords'})
                ),
            ], heading="Page")
        ]
        super().__init__(children=children, heading=heading)

    def clone_kwargs(self):
        kwargs = super().clone_kwargs()
        kwargs['title'] = self.title_field
        kwargs['search_description'] = self.search_description
        kwargs['slug'] = self.slug
        return kwargs
