import { shallowMount, mount } from '@vue/test-utils';

import RelatedResourcesList from './RelatedResourcesList';

const getResources = wrapper => {
  return wrapper.findAll("[data-test='resource']");
};

const clickResourceLink = (wrapper, resourceIdx) => {
  getResources(wrapper).at(resourceIdx).find("[data-test='resourceLink']").trigger('click');
};

const clickResourceRemoveBtn = (wrapper, resourceIdx) => {
  getResources(wrapper).at(resourceIdx).find("[data-test='resourceRemoveBtn']").trigger('click');
};

describe('RelatedResourcesList', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(RelatedResourcesList, {
      propsData: {
        items: [
          {
            id: 'id-chemistry',
            title: 'Chemistry',
            kind: 'document',
            parentTitle: 'Science',
          },
          {
            id: 'id-reading',
            title: 'Reading',
            kind: 'video',
            parentTitle: 'Literacy',
          },
        ],
      },
    });
  });

  it('smoke test', () => {
    const wrapper = shallowMount(RelatedResourcesList);

    expect(wrapper.exists()).toBe(true);
  });

  it('renders all items', () => {
    const resources = getResources(wrapper);

    expect(resources.length).toBe(2);

    expect(resources.at(0).html()).toContain('Chemistry');
    expect(resources.at(0).html()).toContain('Science');

    expect(resources.at(1).html()).toContain('Reading');
    expect(resources.at(1).html()).toContain('Literacy');
  });

  describe('on resource link click', () => {
    beforeEach(() => {
      clickResourceLink(wrapper, 1);
    });

    it('emits click event with a corresponding node id ', () => {
      expect(wrapper.emitted().itemClick).toBeTruthy();
      expect(wrapper.emitted().itemClick.length).toBe(1);
      expect(wrapper.emitted().itemClick[0][0]).toBe('id-reading');
    });
  });

  describe('on remove resource click', () => {
    beforeEach(() => {
      clickResourceRemoveBtn(wrapper, 1);
    });

    it('emits remove event with a corresponding node id', () => {
      expect(wrapper.emitted().removeItemClick).toBeTruthy();
      expect(wrapper.emitted().removeItemClick.length).toBe(1);
      expect(wrapper.emitted().removeItemClick[0][0]).toBe('id-reading');
    });
  });
});
