from django.db import models

from wagtail.admin.panels import FieldPanel, ObjectList, TabbedInterface
from wagtail.admin.rich_text import DraftailRichTextArea
from wagtail.models import Page

from wagtailyoast.edit_handlers import YoastPanel


class Post(Page):

    parent_page_types = ["home.HomePage"]

    body = models.TextField(
        blank=True,
        help_text="Raw HTML body (e.g. <h2>, <p>).",
    )
    content_panels = Page.content_panels + [
        FieldPanel("body", widget=DraftailRichTextArea),
        # Alternative: use a simple textarea instead of the rich text editor. This is useful if you want to use your own custom HTML in the body field, and don't want the rich text editor to mess with it.
        # FieldPanel("body", widget=forms.Textarea(attrs={"rows": 18})),
    ]

    # This is the reccommended way to use the flag 'keywords_hidden' with the mandatory (for the YoastPanel) field 'keywords'.
    keywords_hidden = False
    keywords = models.CharField(
        max_length=255,
        blank=True,
        help_text="Focus keyphrase used for SEO analysis.",
    )
    if keywords_hidden is True:
        promote_panels = Page.promote_panels
    else:
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
                hide_results={
                    "seo" : [
                        "introductionKeyword",
                        # "keyphraseLength9",
                        # "keywordDensity",
                    ]
                },
                keywords_hidden=keywords_hidden,
                inner_urls=[
                    "https://www.hfeu.com",
                    "https://www.hfm.com",
                ],
            ),
            ObjectList(Page.settings_panels, heading="Settings"),
        ]
    )
