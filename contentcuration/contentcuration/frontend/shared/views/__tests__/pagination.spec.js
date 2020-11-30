import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Pagination from '../Pagination.vue';

Vue.use(VueRouter);
const router = new VueRouter();

function makeWrapper() {
  return mount(Pagination, {
    router,
    propsData: {
      totalPages: 2,
    },
  });
}

describe('pagination', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('navigation should set the route', () => {
    wrapper.vm.page = 2;
    expect(parseInt(wrapper.vm.$route.query.page)).toEqual(2);
  });
});
