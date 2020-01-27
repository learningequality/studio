import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import store from '../../../store';
import CatalogFilters from '../CatalogFilters.vue';

Vue.use(VueRouter);
const router = new VueRouter();

function makeWrapper(setQueryStub) {
  const wrapper = mount(CatalogFilters, { router, store });
  wrapper.setMethods({
    setQueryParam: setQueryStub,
  });
  return wrapper;
}

describe('catalogFilters', () => {
  let wrapper;
  let setQueryStub = jest.fn();
  beforeEach(() => {
    setQueryStub.mockReset();
    wrapper = makeWrapper(setQueryStub);
  });
  it('should set params when keywords change', () => {
    let searchWord = 'test';
    let keywords = wrapper.find('[data-test="keywords"]');
    keywords.element.value = searchWord;
    keywords.trigger('input');
    keywords.trigger('blur');
    expect(setQueryStub).toHaveBeenCalledWith('keywords', searchWord);
  });
});
