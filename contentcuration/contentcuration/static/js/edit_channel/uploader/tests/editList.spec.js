import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import { modes } from '../constants';
import EditList from './../views/EditList.vue';
import EditListItem from './../views/EditListItem.vue';
import { localStore } from './data.js';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

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
    attachToDocument: true,
  });
}

describe('editList', () => {
  let wrapper;
  beforeEach(() => {
    localStore.commit('edit_modal/SET_MODE', modes.VIEW_ONLY);
    wrapper = makeWrapper();
  });
  it('should display all nodes on render', () => {
    expect(wrapper.findAll(EditListItem)).toHaveLength(ContentNodes.length);
    _.each(ContentNodes, node => {
      expect(wrapper.text()).toContain(node.title);
    });
  });
  it('should make nodes removable depending on the mode', () => {
    localStore.commit('edit_modal/SET_MODE', modes.VIEW_ONLY);
    expect(
      wrapper
        .find(EditListItem)
        .find('.remove-item')
        .exists()
    ).toBe(false);
    localStore.commit('edit_modal/SET_MODE', modes.NEW_TOPIC);
    expect(
      wrapper
        .find(EditListItem)
        .find('.remove-item')
        .exists()
    ).toBe(true);
    localStore.commit('edit_modal/SET_MODE', modes.EDIT);
    expect(
      wrapper
        .find(EditListItem)
        .find('.remove-item')
        .exists()
    ).toBe(false);
    localStore.commit('edit_modal/SET_MODE', modes.NEW_EXERCISE);
    expect(
      wrapper
        .find(EditListItem)
        .find('.remove-item')
        .exists()
    ).toBe(true);
  });
  it('should toggle selection when select all clicked', () => {
    let toggle = wrapper.find('.select-all-wrapper').find('.v-input--checkbox');
    toggle.trigger('click');
    expect(localStore.state.edit_modal.selectedIndices).toHaveLength(ContentNodes.length);
    toggle.trigger('click');
    expect(localStore.state.edit_modal.selectedIndices).toHaveLength(0);
  });
  it('should show add item button on NEW_TOPIC mode', () => {
    expect(wrapper.find('.add-item-wrapper').exists()).toBe(false);
    localStore.commit('edit_modal/SET_MODE', modes.NEW_TOPIC);
    expect(wrapper.find('.add-item-wrapper').exists()).toBe(true);
  });
  it('should show add item button on NEW_EXERCISE mode', () => {
    expect(wrapper.find('.add-item-wrapper').exists()).toBe(false);
    localStore.commit('edit_modal/SET_MODE', modes.NEW_EXERCISE);
    expect(wrapper.find('.add-item-wrapper').exists()).toBe(true);
  });
  it('should emit an addNode event', () => {
    localStore.commit('edit_modal/SET_MODE', modes.NEW_EXERCISE);
    expect(wrapper.emitted('addNode')).toBeFalsy();
    wrapper
      .find('.add-item-wrapper')
      .find('button')
      .trigger('click');
    expect(wrapper.emitted('addNode')).toBeTruthy();
  });
});
