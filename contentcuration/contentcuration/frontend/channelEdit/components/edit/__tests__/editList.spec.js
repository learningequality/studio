import { mount } from '@vue/test-utils';
import { modes } from '../../../constants';
import EditList from '../EditList.vue';
import { localStore } from './data.js';

const ContentNodes = [
  {
    id: 'node-1',
    title: 'Node 1',
    kind: 'topic',
    _COMPLETE: true,
  },
  {
    id: 'node-2',
    title: 'Node 2',
    kind: 'exercise',
    _COMPLETE: false,
  },
  {
    id: 'node-3',
    title: 'Node 3',
    kind: 'video',
    _COMPLETE: false,
  },
];

function makeWrapper() {
  localStore.commit('edit_modal/SET_NODES', ContentNodes);
  return mount(EditList, {
    store: localStore,
    attachTo: document.body,
    stubs: {
      EditListItem: true,
    },
  });
}

describe.skip('editList', () => {
  let wrapper;
  beforeEach(() => {
    localStore.commit('edit_modal/SET_MODE', modes.VIEW_ONLY);
    wrapper = makeWrapper();
  });
  it('should display all nodes on render', () => {
    expect(wrapper.vm.nodes).toHaveLength(ContentNodes.length);
  });
  it('should toggle selection when select all clicked', () => {
    const toggle = wrapper.find('[data-test="select-all"]').find('.v-input--checkbox');
    toggle.trigger('click');
    expect(localStore.state.edit_modal.selectedIndices).toHaveLength(ContentNodes.length);
    toggle.trigger('click');
    expect(localStore.state.edit_modal.selectedIndices).toHaveLength(0);
  });
});
