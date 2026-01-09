import os
import json
from importlib.metadata import PackageNotFoundError, version as pkg_version
from django.conf import settings

# =======================================
# Context variables passed for javascript
# =======================================

try:
    #  Production part
    VERSION = pkg_version("wagtailyoast")
except PackageNotFoundError:
    # Develop / editable checkout. We allow VERSION to be empty so that
    # static assets resolve to unversioned filenames.
    version = ""
    package_json_path = os.path.join(getattr(settings, "BASE_DIR", ""), "package.json")
    if package_json_path and os.path.exists(package_json_path):
        with open(package_json_path, "r", encoding="utf-8") as package:
            data = json.load(package)
            version = data.get("version", "")
    VERSION = version

LOCALE = getattr(settings, "WY_LOCALE", "en_US")
STATIC_URL = settings.STATIC_URL
