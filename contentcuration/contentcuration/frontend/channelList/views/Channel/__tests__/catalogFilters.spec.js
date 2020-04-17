import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import store from '../../../store';
import CatalogFilters from '../CatalogFilters.vue';

Vue.use(VueRouter);
const router = new VueRouter();

function makeWrapper(computed) {
  const wrapper = mount(CatalogFilters, {
    router,
    store,
    computed,
  });
  return wrapper;
}

describe('catalogFilters', () => {
  it('should set params when keywords change', () => {
    let setKeywordsMock = jest.fn();
    let setKeywords = () => {
      return () => {
        setKeywordsMock();
      };
    };
    let wrapper = makeWrapper({ setKeywords });
    let keywords = wrapper.find('[data-test="keywords"]');
    keywords.element.value = 'test';
    keywords.trigger('input');
    expect(setKeywordsMock).toHaveBeenCalled();
  });
});
