import { Store } from 'vuex';
import DraggablePlugin from 'shared/vuex/draggablePlugin';

export function createStore(options = {}) {
  const plugins = options.plugins || [];
  plugins.push(DraggablePlugin);
  options.plugins = plugins;
  return new Store(options);
}

export default createStore();
