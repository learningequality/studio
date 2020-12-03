import { DraggableIdentityHelper } from 'shared/vuex/draggablePlugin/module/utils';



export class DropEventHelper {
  /**
   * @param {Object} data - Drop data
   * @param {DragEvent} [event]
   */
  constructor(data, event = null) {
    this.data = data;
    this.event = event;
  }

  get target() {
    return new DraggableIdentityHelper(this.data.target.identity);
  }

  get sources() {
    const { target } = this;
    return this.data.sources
      .filter(source => !target.is(source))
      .map(source => new DraggableIdentityHelper(source));
  }

  isValid() {
    return this.sources.length > 0;
  }
}
