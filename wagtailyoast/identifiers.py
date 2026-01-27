
"""Yoast assessment identifiers.

These strings correspond to the `_identifier` field returned by the Yoast analysis
results consumed by the admin UI (see `wagtailyoast/static/wagtailyoast/src/js`).

The source of truth for what the bundled analyzer can emit is the built JS
artifacts:

- `wagtailyoast/static/wagtailyoast/dist/js/yoastanalysis.js`
- `wagtailyoast/static/wagtailyoast/dist/js/yoastworker.js`

This module centralizes the identifiers so Python code can validate, filter, or
map results consistently.
"""

from __future__ import annotations

from typing import Final


# Readability analysis identifiers.
READABILITY_IDENTIFIERS: Final[list[str]] = [
	"fleschReadingEase",
	"subheadingsTooLong",
	"textParagraphTooLong",
	"textSentenceLength",
	"metaDescriptionSentenceLength",
	"textTransitionWords",
	"passiveVoice",
	"textPresence",
	"sentenceBeginnings",
	"wordComplexity",
]


# SEO analysis identifiers.
SEO_IDENTIFIERS: Final[list[str]] = [
	"introductionKeyword",
	"keyphraseLength",
	"keyphraseDistribution",
	"keywordDensity",
	"keywordStopWords",
	"functionWordsInKeyphrase",
	"metaDescriptionLength",
	"metaDescriptionKeyword",
	"titleWidth",
	"titleKeyword",
	"singleH1",
	"subheadingsKeyword",
	"textLength",
	"textImages",
	"textCompetingLinks",
	"internalLinks",
	"externalLinks",
	"taxonomyTextLength",
	"urlKeyword",
	"urlLength",
	"urlStopWords",
]


ALL_IDENTIFIERS: Final[list[str]] = [
	*READABILITY_IDENTIFIERS,
	*SEO_IDENTIFIERS,
]


READABILITY_IDENTIFIER_SET: Final[frozenset[str]] = frozenset(READABILITY_IDENTIFIERS)
SEO_IDENTIFIER_SET: Final[frozenset[str]] = frozenset(SEO_IDENTIFIERS)
ALL_IDENTIFIER_SET: Final[frozenset[str]] = frozenset(ALL_IDENTIFIERS)

