import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import EditView from './../views/EditView.vue';
import {
  localStore,
  mockFunctions,
  DEFAULT_TOPIC,
  DEFAULT_VIDEO,
  DEFAULT_EXERCISE,
} from './data.js';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

const testNodes = [DEFAULT_TOPIC, DEFAULT_VIDEO, DEFAULT_EXERCISE];

function makeWrapper(props = {}) {
  let wrapper = mount(EditView, {
    store: localStore,
    attachToDocument: true,
    propsData: props,
  });
  return wrapper;
}

describe('editView', () => {
  let wrapper;
  beforeEach(() => {
    localStore.commit('edit_modal/SET_NODES', testNodes);
    wrapper = makeWrapper();
    wrapper.setData({
      loadNodesDebounced: () => {
        localStore.dispatch('edit_modal/loadNodes');
      },
    });
    mockFunctions.loadNodes.mockReset();
  });
  it('should show default text when no nodes are selected', () => {
    expect(wrapper.find('.default-content').exists()).toBe(true);
  });
  it('should load nodes when selected', () => {
    localStore.commit('edit_modal/SET_NODE', 0);
    expect(wrapper.vm.allLoaded).toBe(true);
    expect(mockFunctions.loadNodes).toHaveBeenCalled();
  });
  it('should render tabs depending on the selected node kind', () => {
    // Topics -> Details + Preview
    localStore.commit('edit_modal/SET_NODE', 0);
    expect(wrapper.find({ ref: 'detailstab' }).exists()).toBe(true);
    expect(wrapper.find({ ref: 'previewtab' }).exists()).toBe(true);
    expect(wrapper.find({ ref: 'questiontab' }).exists()).toBe(false);
    expect(wrapper.find({ ref: 'prerequisitetab' }).exists()).toBe(false);

    // Videos -> Details + Preview + Prerequisites
    localStore.commit('edit_modal/SET_NODE', 1);
    expect(wrapper.find({ ref: 'detailstab' }).exists()).toBe(true);
    expect(wrapper.find({ ref: 'previewtab' }).exists()).toBe(true);
    expect(wrapper.find({ ref: 'questiontab' }).exists()).toBe(false);
    expect(wrapper.find({ ref: 'prerequisitetab' }).exists()).toBe(true);

    // Exercises -> Details + Preview + Questions + Prerequisites
    localStore.commit('edit_modal/SET_NODE', 2);
    expect(wrapper.find({ ref: 'detailstab' }).exists()).toBe(true);
    expect(wrapper.find({ ref: 'previewtab' }).exists()).toBe(true);
    expect(wrapper.find({ ref: 'questiontab' }).exists()).toBe(true);
    expect(wrapper.find({ ref: 'prerequisitetab' }).exists()).toBe(true);
  });
  it('prerequisites tab should be hidden on clipboard items', () => {
    let testWrapper = makeWrapper({ isClipboard: true });
    localStore.commit('edit_modal/SET_NODE', 1);
    expect(testWrapper.find({ ref: 'prerequisitetab' }).exists()).toBe(false);
  });
  it('should switch tabs when tabs are clicked', () => {
    localStore.commit('edit_modal/SET_NODE', 0);
    expect(wrapper.find({ ref: 'previewwindow' }).isVisible()).toBe(false);
    expect(wrapper.find({ ref: 'prerequisiteswindow' }).isVisible()).toBe(false);
    expect(wrapper.find({ ref: 'questionwindow' }).isVisible()).toBe(false);
    expect(wrapper.find({ ref: 'detailswindow' }).isVisible()).toBe(true);

    wrapper
      .find({ ref: 'previewtab' })
      .find('a')
      .trigger('click');
    wrapper.vm.$nextTick(() => {
      wrapper.vm.$nextTick(() => {
        expect(wrapper.find({ ref: 'previewwindow' }).isVisible()).toBe(true);
        expect(wrapper.find({ ref: 'prerequisiteswindow' }).isVisible()).toBe(false);
        expect(wrapper.find({ ref: 'questionwindow' }).isVisible()).toBe(false);
        expect(wrapper.find({ ref: 'detailswindow' }).isVisible()).toBe(false);
      });
    });
  });
  it('should lazy load tabs', () => {
    localStore.commit('edit_modal/SET_NODE', 0);
    let expectedHTML = '<div class="v-window-item" style="display: none;"></div>';
    expect(
      wrapper
        .find({ ref: 'previewwindow' })
        .find('.v-window-item')
        .html()
    ).toBe(expectedHTML);
    wrapper
      .find({ ref: 'previewtab' })
      .find('a')
      .trigger('click');
    wrapper.vm.$nextTick(() => {
      wrapper.vm.$nextTick(() => {
        expect(
          wrapper
            .find({ ref: 'previewwindow' })
            .find('.v-window-item')
            .html()
        ).not.toBe(expectedHTML);
      });
    });
  });
});
