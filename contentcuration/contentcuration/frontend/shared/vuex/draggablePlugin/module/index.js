import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import submodule from './submodule';
import { DraggableDirectionFlags } from './constants';
import { DraggableTypes } from 'shared/mixins/draggable/constants';

export default {
  namespaced: true,
  state() {
    return {
      draggableDirection: DraggableDirectionFlags.NONE,
      activeDraggableUniverse: null,
      groupedDraggableHandleIds: [],
    };
  },
  getters,
  mutations,
  actions,
  // Create submodules for each draggable component type
  modules: {
    regions: submodule(DraggableTypes.REGION),
    collections: submodule(DraggableTypes.COLLECTION),
    items: submodule(DraggableTypes.ITEM),
    handles: submodule(DraggableTypes.HANDLE),
  },
};
