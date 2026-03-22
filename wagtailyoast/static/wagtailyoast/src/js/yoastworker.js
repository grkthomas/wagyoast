import { AnalysisWebWorker } from 'yoastseo';

const innerHosts = new Set();
const anchorHrefRegex = /href=(["'])([^"']+)\1/i;

function getFromAnchorTag(anchorTag) {
	const urlMatch = anchorHrefRegex.exec(anchorTag);
	return urlMatch === null ? '' : urlMatch[2];
}

function getParsedUrl(value) {
	try {
		return new URL(value, self.location.origin);
	} catch (e) {
		return null;
	}
}

function getProtocol(value) {
	return getParsedUrl(value)?.protocol ?? null;
}

function getHostname(value) {
	return getParsedUrl(value)?.hostname ?? '';
}

function protocolIsHttpScheme(protocol) {
	return protocol === 'http:' || protocol === 'https:';
}

function isRelativeFragmentURL(value) {
	return typeof value === 'string' && value.startsWith('#');
}

function isInternalLink(value, host) {
	if (!value || !host) {
		return false;
	}

		if (value.indexOf('//') === -1 && value.indexOf('/') === 0) {
		return true;
	}

	const parsedUrl = getParsedUrl(value);
	if (!parsedUrl) {
		return false;
	}

	return parsedUrl.hostname === host;
}

function getAnchorsFromText(text) {
	const matches = text.match(/<a[\s]+(?:[^>]+)>((?:.|[\n\r\u2028\u2029])*?)<\/a>/ig);
	return matches === null ? [] : matches;
}

function checkNofollow(anchorHtml) {
	const relMatch = anchorHtml.match(/\brel=(['"])([^'"]*)\1/i);
	if (!relMatch) {
		return 'Dofollow';
	}

	return relMatch[2].toLowerCase().split(/\s+/).includes('nofollow')
		? 'Nofollow'
		: 'Dofollow';
}

function rememberInnerHosts(innerUrls) {
	innerHosts.clear();
	const normalizedUrls = [];
	const candidates = Array.isArray(innerUrls) ? innerUrls : [innerUrls];

	candidates.forEach((innerUrl) => {
		if (!innerUrl) {
			return;
		}

		try {
			const normalized = new URL(innerUrl, self.location.origin);
			if (normalized.hostname) {
				innerHosts.add(normalized.hostname.toLowerCase());
			}
			normalizedUrls.push(normalized.toString());
		} catch (e) {
			// Ignore invalid values so a single bad URL does not disable the rest.
		}
	});

	return normalizedUrls;
}

function isConfiguredInternalLink(anchorUrl, permalink) {
	if (!anchorUrl) {
		return false;
	}

	const protocol = getProtocol(anchorUrl);
	if ((protocol && !protocolIsHttpScheme(protocol)) || isRelativeFragmentURL(anchorUrl)) {
		return false;
	}

	if (isInternalLink(anchorUrl, getHostname(permalink))) {
		return true;
	}

	if (innerHosts.size === 0) {
		return false;
	}

	try {
		const parsed = new URL(anchorUrl, self.location.origin);
		return innerHosts.has(parsed.hostname.toLowerCase());
	} catch (e) {
		return false;
	}
}

function getLinkType(anchor, permalink) {
	const anchorUrl = getFromAnchorTag(anchor);
	const protocol = getProtocol(anchorUrl);

	if ((protocol && !protocolIsHttpScheme(protocol)) || isRelativeFragmentURL(anchorUrl)) {
		return 'other';
	}

	return isConfiguredInternalLink(anchorUrl, permalink) ? 'internal' : 'external';
}

function getLinkStatistics(paper) {
	const anchors = getAnchorsFromText(paper.getText());
	const permalink = paper.getPermalink();
	const linkCount = {
		total: anchors.length,
		totalNaKeyword: 0,
		keyword: {
			totalKeyword: 0,
			matchedAnchors: [],
		},
		internalTotal: 0,
		internalDofollow: 0,
		internalNofollow: 0,
		externalTotal: 0,
		externalDofollow: 0,
		externalNofollow: 0,
		otherTotal: 0,
		otherDofollow: 0,
		otherNofollow: 0,
	};

	anchors.forEach((anchor) => {
		const linkType = getLinkType(anchor, permalink);
		const linkFollow = checkNofollow(anchor);
		linkCount[`${linkType}Total`] += 1;
		linkCount[`${linkType}${linkFollow}`] += 1;
	});

	return linkCount;
}

// Run Yoast Worker

const worker = new AnalysisWebWorker(self);
worker._researcher.addResearch('getLinkStatistics', getLinkStatistics);
worker.register();
worker.registerMessageHandler(
	'setInnerUrls',
	({ innerUrls = [] } = {}) => ({
		innerUrls: rememberInnerHosts(innerUrls),
	}),
	'wagtailyoast',
);
