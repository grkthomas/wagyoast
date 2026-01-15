
export default class ResultContainers {
  /**
   * Controller of Yoast results
   *
   * @param {Result} results Results of yoastseo module
   */
  constructor(results) {
    this.results = results;
    this.readabilityContainer = document.getElementById('yoast_results_readability');
    this.seoContainer = document.getElementById('yoast_results_seo');
  }

  /**
   * Clear Results
   *
   * @param {object} $container Jquery selector of the container
   * @returns {void}
   */
  static clear(container) {
    if (!container) return;
    const success = container.querySelector('.success');
    const errors = container.querySelector('.errors');
    if (success) success.innerHTML = '';
    if (errors) errors.innerHTML = '';
  }

  static resultScore(result) {
    return `<span class="yoast-score-value"> <span>${result.score}</span> <span>/</span> <span>10</span> </span>`;
  }

  static ensureStylesheet() {
    const existing = document.querySelector(
      'link#wagtailyoast-styles, link[href*="wagtailyoast/dist/css/styles.css"]',
    );
    if (existing) return;

    const context = window.__WAGTAILYOAST_CONTEXT__ || {};
    const versionSuffix = context.version ? `?v=${encodeURIComponent(context.version)}` : '';
    const staticUrl = context.staticUrl || '/static/';

    // Use the browser to resolve relative/absolute STATIC_URL correctly.
    let base;
    try {
      base = new URL(staticUrl, window.location.origin).toString();
    } catch {
      base = '/static/';
    }

    const href = `${base}wagtailyoast/dist/css/styles.css${versionSuffix}`;

    const link = document.createElement('link');
    link.id = 'wagtailyoast-styles';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;

    const head = document.head || document.getElementsByTagName('head')[0];
    if (head) {
      head.insertBefore(link, head.firstChild);
    }
  }

  /**
   * Get HTML icon if success or error according to the score
   *
   * @param {AssessmentResult} result Assessment result of yoastseo module
   * @return {string}
   */
  static scoreIcon(result) {
    return ResultContainers.isSuccessResult(result)
      ? '<i class="icon icon-tick"></i>'
      : '<i class="icon icon-cross"></i>';
  }


  /**
   * Check if AssessmentResult is scored successfully
   *
   * @param {AssessmentResult} result Assessment result of yoastseo module
   * @return {boolean}
   */
  static isSuccessResult(result) {
    return result.score >= 9;
  }

  /**
   * Get Jquery instance of success or errors container
   *
   * @param {object} $container Jquery selector of the container
   * @param {AssessmentResult} result Assessment result of yoastseo module
   * @return {object}
   */
  static getStatusContainer(container, result) {
    if (!container) return null;
    const success = container.querySelector('.success');
    const errors = container.querySelector('.errors');
    return ResultContainers.isSuccessResult(result) ? success : errors;
  }

  /**
   * Remove unwanted rules of yoastseo module
   *
   * @param {AssessmentResult} result Assessment result of yoastseo module
   * @return {object}
   */
  static filterUnwantedResult(result) {
    // FIXME: singleH1 does not work, fix it with Yoast
    const unwanted = [
      'singleH1',
    ];
    // eslint-disable-next-line no-underscore-dangle
    return unwanted.indexOf(result._identifier) === -1;
  }

  /**
   * Add AssessmentResult object to the container
   *
   * @param {object} $container Jquery selector of the container
   * @param {AssessmentResult} result Assessment result of yoastseo module
   * @return {void}
   */
  static addResult(container, result) {
    if (result.score !== 0 && ResultContainers.filterUnwantedResult(result)) {
      const statusContainer = ResultContainers.getStatusContainer(container, result);
      if (!statusContainer) return;
      const item = document.createElement('li');
      item.innerHTML = `${ResultContainers.scoreIcon(result)} ${result.text}`;
      statusContainer.appendChild(item);
    }
  }

  /**
   * Synchronize the UI with results of yoastseo module
   *
   * @return {void}
   */
  sync() {
    ResultContainers.ensureStylesheet();

    // Clean containers
    ResultContainers.clear(this.readabilityContainer);
    ResultContainers.clear(this.seoContainer);

    // Append Data
    Array.prototype.forEach.call(this.results.result.readability.results, (el) => {
      ResultContainers.addResult(this.readabilityContainer, el);
    });
    Array.prototype.forEach.call(this.results.result.seo[''].results, (el) => {
      ResultContainers.addResult(this.seoContainer, el);
    });
  }
}
