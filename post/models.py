from django.db import models

from django import forms

from wagtail.admin.panels import FieldPanel, ObjectList, TabbedInterface
from wagtail.models import Page

from wagtailyoast.edit_handlers import YoastPanel


class Post(Page):
    parent_page_types = ["home.HomePage"]

    body = models.TextField(
        blank=True,
        help_text="Raw HTML body (e.g. <h2>, <p>).",
    )
    keywords = models.CharField(
        max_length=255,
        blank=True,
        help_text="Focus keyphrase used for SEO analysis.",
    )

    content_panels = Page.content_panels + [
        FieldPanel("body", widget=forms.Textarea(attrs={"rows": 18})),
    ]

    promote_panels = Page.promote_panels + [
        FieldPanel("keywords"),
    ]

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
