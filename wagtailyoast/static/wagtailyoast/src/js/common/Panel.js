import { AnalysisWorkerWrapper, createWorker, Paper } from 'yoastseo';
import WithContext from './WithContext';
import ResultContainers from './ResultContainers';

export default class Panel extends WithContext {
  /**
   * Controller of Yoast Panel
   *
   * @param {object} context The context of wagtailyoast/context.py
   */
  constructor(context) {
    super(context);
    this.workerUrl = `${this.baseUrl}${this.context.staticUrl}wagtailyoast/dist/js/yoastworker${this.context.version}.js`;
    this.worker = new AnalysisWorkerWrapper(createWorker(this.workerUrl));

    this._syncDebounced = Panel.debounce(() => this.syncPanel(), 300);

    // Debug
    // eslint-disable-next-line no-console
    console.debug('[wagtailyoast] constructed', { workerUrl: this.workerUrl, context: this.context });
  }

  static debounce(fn, delayMs) {
    let timeoutId;
    return (...args) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn(...args), delayMs);
    };
  }

  static getCookie(name) {
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (let i = 0; i < cookies.length; i += 1) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(`${name}=`)) {
        return decodeURIComponent(cookie.substring(name.length + 1));
      }
    }
    return null;
  }

  static resolveUrl(urlOrPath) {
    if (!urlOrPath) return null;
    try {
      return new URL(urlOrPath, window.location.origin).toString();
    } catch (e) {
      return null;
    }
  }

  static inferPreviewUrlFromLocation() {
    const path = window.location.pathname;
    if (/\/edit\/?$/.test(path)) {
      return path.replace(/\/edit\/?$/, '/preview/');
    }
    if (/\/add\/?$/.test(path)) {
      return path.replace(/\/add\/?$/, '/preview/');
    }
    return null;
  }

  static findPreviewUrl() {
    const form = document.getElementById('page-edit-form');

    // Newer Wagtail versions often expose URLs via data-* attributes.
    const candidate = form?.dataset?.previewUrl
      || form?.dataset?.wagtailPreviewUrl
      || form?.getAttribute('data-preview-url')
      || form?.getAttribute('data-wagtail-preview-url');
    if (candidate) return Panel.resolveUrl(candidate);

    // Try to discover via a button/link.
    const btn = document.querySelector(
      'button[formaction*="preview"], a[href*="/preview/"]',
    );
    const fromFormAction = btn?.getAttribute('formaction') || btn?.getAttribute('href');
    if (fromFormAction) return Panel.resolveUrl(fromFormAction);

    const inferred = Panel.resolveUrl(Panel.inferPreviewUrlFromLocation());
    // eslint-disable-next-line no-console
    console.debug('[wagtailyoast] preview url (inferred)', inferred);
    return inferred;
  }

  /**
   * Get HTML preview of wagtail page
   *
   * @returns {string}
   */
  static async getPreviewPageContent() {
    const form = document.getElementById('page-edit-form');
    if (!form) {
      throw new Error('wagtailyoast: #page-edit-form not found');
    }
    const previewUrl = Panel.findPreviewUrl();
    if (!previewUrl) {
      throw new Error('wagtailyoast: unable to determine preview URL');
    }

    // eslint-disable-next-line no-console
    console.debug('[wagtailyoast] refreshing preview', { previewUrl });

    const csrfToken = Panel.getCookie('csrftoken');
    const headers = csrfToken ? { 'X-CSRFToken': csrfToken } : {};
    const formData = new FormData(form);

    // Submit edit form data to refresh preview.
    await fetch(previewUrl, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers,
    });

    // Fetch preview HTML.
    const response = await fetch(previewUrl, {
      method: 'GET',
      credentials: 'same-origin',
      headers,
    });

    // eslint-disable-next-line no-console
    console.debug('[wagtailyoast] fetched preview', { status: response.status });
    return response.text();
  }

  /**
   * Refresh Yoast Panel UI
   *
   * @returns {void}
   */
  async syncPanel() {
    // eslint-disable-next-line no-console
    console.debug('[wagtailyoast] sync start');
    const paper = new Paper(await Panel.getPreviewPageContent(), {
      keyword: this.$yoastKeywords?.value || '',
      title: this.$yoastTitle?.value || '',
      description: this.$yoastSearchDescription?.value || '',
      slug: this.$yoastSlug?.value || '',
      titleWidth: 500, // FIXME: How to get width of title in pixel? https://github.com/Yoast/javascript/blob/master/packages/yoastseo/src/values/Paper.js#L29
    });
    const containers = new ResultContainers(await this.worker.analyze(paper));
    containers.sync();
    // eslint-disable-next-line no-console
    console.debug('[wagtailyoast] sync done');
  }

  /**
   * Initialize worker and events
   *
   * @returns {void}
   */
  init() {
    // eslint-disable-next-line no-console
    console.debug('[wagtailyoast] init start');
    this.worker.initialize({
      locale: this.context.locale,
      contentAnalysisActive: true,
      keywordAnalysisActive: true,
      logLevel: 'ERROR',
    }).then(() => {
      this.$yoastPanel = document.getElementById('yoast_panel');
      if (!this.$yoastPanel) {
        // eslint-disable-next-line no-console
        console.debug('[wagtailyoast] #yoast_panel not found (are you on the Yoast tab / correct page type?)');
        return;
      }

      // eslint-disable-next-line no-console
      console.debug('[wagtailyoast] #yoast_panel found');

      this.$yoastKeywords = this.$yoastPanel.querySelector('#yoast_keywords');

      const titleField = this.$yoastPanel.querySelector('#yoast_title')?.dataset?.field;
      const descField = this.$yoastPanel.querySelector('#yoast_search_description')?.dataset?.field;
      const slugField = this.$yoastPanel.querySelector('#yoast_slug')?.dataset?.field;

      this.$yoastTitle = titleField ? document.getElementById(`id_${titleField}`) : null;
      this.$yoastSearchDescription = descField ? document.getElementById(`id_${descField}`) : null;
      this.$yoastSlug = slugField ? document.getElementById(`id_${slugField}`) : null;

      // eslint-disable-next-line no-console
      console.debug('[wagtailyoast] bound fields', {
        titleField,
        descField,
        slugField,
        hasKeywords: !!this.$yoastKeywords,
        hasTitle: !!this.$yoastTitle,
        hasDescription: !!this.$yoastSearchDescription,
        hasSlug: !!this.$yoastSlug,
      });

      const inputElements = [
        this.$yoastKeywords,
        this.$yoastTitle,
        this.$yoastSearchDescription,
        this.$yoastSlug,
      ].filter(Boolean);

      inputElements.forEach(($el) => {
        $el.addEventListener('input', (e) => {
          e.preventDefault();
          this._syncDebounced();
        });
      });

      // Also refresh when the Yoast tab/panel becomes active.
      document.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        const controls = target.getAttribute('aria-controls') || '';
        if (controls.includes('tab-yoast') || controls.includes('yoast')) {
          this._syncDebounced();
        }
      });

      // Initial render.
      this._syncDebounced();
    });
  }
}
