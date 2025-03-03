/**
 * Deferred promise
 */
export default class Deferred extends Promise {
  /**
   * @param {function(resolve, reject): void|null} executor
   */
  constructor(executor = null) {
    let self_resolve, self_reject;
    executor = executor || (() => {});

    super(function (resolve, reject) {
      self_resolve = resolve;
      self_reject = reject;
      executor(resolve, reject);
    });

    this._resolve = self_resolve;
    this._reject = self_reject;

    this.isResolved = false;
    this.isRejected = false;
  }

  get isFulfilled() {
    return this.isResolved || this.isRejected;
  }

  /**
   * @param value
   * @returns {Deferred}
   */
  resolve(value) {
    this._resolve(value);
    this.isResolved = true;
    return this;
  }

  /**
   * @param value
   * @returns {Deferred}
   */
  reject(value) {
    this._reject(value);
    this.isRejected = true;
    return this;
  }

  /**
   * @returns {Promise}
   */
  promise() {
    return new Promise((resolve, reject) => {
      this.then(resolve, reject);
    });
  }

  /**
   * @param {Promise} promise
   * @return {Deferred}
   */
  static fromPromise(promise) {
    const deferred = new Deferred();
    promise.then(deferred.resolve.bind(deferred), deferred.reject.bind(deferred));
    return deferred;
  }
}
