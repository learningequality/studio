/**
 * Returns a function suitable for prop validation, using an object
 * to test against its values
 *
 * @param {Object} obj
 * @return {function(*): boolean}
 */
export function objectValuesValidator(obj) {
  const values = Object.values(obj);
  return function validator(val) {
    return Boolean(values.find(v => v === val));
  };
}

export class DropEventHelper {
  /**
   * @param {Object} data - Drop data
   * @param {DragEvent} [event]
   */
  constructor(data, event = null) {
    this.data = data;
    this.event = event;
    this._stopped = false;
    this._cleared = false;
  }

  get stopped() {
    return this._stopped;
  }

  get cleared() {
    return this._cleared;
  }

  stopPropagation() {
    if (this.event) {
      this.event.stopPropagation();
    }

    this._stopped = true;
  }

  clear() {
    this._cleared = true;
  }
}
