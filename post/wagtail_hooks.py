"""Wagtail hooks for the `post` app.

We want Posts to have the same CRUD experience as other Wagtail `Page` types
(listing via the Pages explorer and editing in the page editor), while still
surfacing a convenient "Posts" entry in the sidebar.

This hook registers a simple admin URL that redirects into Wagtail's built-in
explorer view at the most relevant parent page.
"""

from django.http import HttpResponseRedirect
from django.urls import path, reverse
from django.utils.translation import gettext_lazy as _

from wagtail import hooks
from wagtail.admin.auth import require_admin_access
from wagtail.admin.menu import MenuItem
from wagtail.models import Page, Site

from home.models import HomePage


@require_admin_access
def posts_explorer(request):
	"""Redirect the Posts menu item to Wagtail's Pages explorer.

	We try to locate the site's HomePage (the configured parent for Post pages)
	and open the explorer there. If we can't, we fall back to the site root.
	"""

	site = Site.find_for_request(request)
	if site is not None:
		homepage = HomePage.objects.in_site(site).first()
		parent_page = homepage or site.root_page
	else:
		parent_page = Page.get_first_root_node()

	return HttpResponseRedirect(reverse("wagtailadmin_explore", args=[parent_page.id]))


@hooks.register("register_admin_urls")
def register_posts_admin_urls():
	return [
		path("posts/", posts_explorer, name="post_posts_explorer"),
	]


@hooks.register("register_admin_menu_item")
def register_posts_menu_item():
	return MenuItem(_("Posts"), reverse("post_posts_explorer"), icon_name="doc-full", order=210)

