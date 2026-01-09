from wagtail.models import Page


class Post(Page):
    parent_page_types = ["home.HomePage"]
