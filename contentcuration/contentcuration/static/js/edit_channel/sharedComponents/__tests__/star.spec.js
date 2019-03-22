import { mount } from '@vue/test-utils';
import Star from '../Star.vue';

function makeWrapper(starred) {
  return mount(Star, {
    propsData: {
      starred: starred,
    },
  });
}

describe('star', () => {
  let starredWrapper;
  let unstarredWrapper;
  beforeEach(() => {
    starredWrapper = makeWrapper(true);
    unstarredWrapper = makeWrapper(false);
  });
  it('should reflect correct star on load', () => {
    expect(starredWrapper.find('a').is('.starred')).toBe(true);
    expect(unstarredWrapper.find('a').is('.starred')).toBe(false);
  });
  it('starred components should emit an unstarred event when clicked', () => {
    starredWrapper.find('a').trigger('click');
    expect(starredWrapper.emitted('unstarred').length).toBe(1);
    expect(starredWrapper.emitted('starred')).toBeFalsy();
  });
  it('unstarred components should emit a starred event when clicked', () => {
    unstarredWrapper.find('a').trigger('click');
    expect(unstarredWrapper.emitted('starred').length).toBe(1);
    expect(unstarredWrapper.emitted('unstarred')).toBeFalsy();
  });
});
