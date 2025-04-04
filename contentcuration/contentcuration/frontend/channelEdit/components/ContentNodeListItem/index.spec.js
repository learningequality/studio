import { mount } from '@vue/test-utils';
import ContentNodeListItem from './index';
import { createStore } from 'shared/vuex/draggablePlugin/test/setup';

import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

const DOCUMENT_NODE = {
  id: 'document-id',
  kind: ContentKindsNames.DOCUMENT,
  title: 'Document title',
  description: 'This is a document',
};

const EXERCISE_NODE = {
  id: 'exercise-id',
  kind: ContentKindsNames.EXERCISE,
  title: 'Exercise title',
  description: 'This is an exercise',
  assessment_item_count: 5,
};

const TOPIC_NODE = {
  id: 'topic-id',
  kind: ContentKindsNames.TOPIC,
  title: 'Topic title',
  description: 'This is a topic',
  total_count: 3,
  resource_count: 2,
};

function mountComponent(opts = {}) {
  return mount(ContentNodeListItem, {
    store: createStore({
      modules: {
        contentNode: {
          namespaced: true,
          getters: {
            isNodeInCopyingState: () => jest.fn(),
            getContentNodesCount: () =>
              jest.fn().mockReturnValue({
                resource_count: TOPIC_NODE.resource_count,
                assessment_item_count: EXERCISE_NODE.assessment_item_count,
              }),
          },
        },
      },
    }),
    ...opts,
  });
}

describe('ContentNodeListItem', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mountComponent({
      propsData: {
        node: DOCUMENT_NODE,
      },
    });
  });

  it('smoke test', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('renders a node title', () => {
    expect(wrapper.findComponent('[data-test="title"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="title"]').html()).toContain(DOCUMENT_NODE.title);
  });

  it('renders a node description', () => {
    expect(wrapper.findComponent('[data-test="description"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="description"]').isVisible()).toBe(true);
    expect(wrapper.findComponent('[data-test="description"]').html()).toContain(
      DOCUMENT_NODE.description,
    );
  });

  it("doesn't render a chevron button for a node different from topic", () => {
    expect(wrapper.findComponent('[data-test="btn-chevron"]').exists()).toBe(false);
  });

  it('emits an event when list item is clicked', async () => {
    await wrapper.findComponent('[data-test="content-item"]').trigger('click');

    expect(wrapper.emitted().infoClick).toBeTruthy();
    expect(wrapper.emitted().infoClick.length).toBe(1);
  });
});

describe('for an exercise node', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mountComponent({
      propsData: {
        node: EXERCISE_NODE,
      },
    });
  });

  it('renders assessment items count in a subtitle', () => {
    expect(wrapper.findComponent('[data-test="subtitle"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="subtitle"]').html()).toContain(
      String(EXERCISE_NODE.assessment_item_count),
    );
  });
});

describe('for a topic node', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mountComponent({
      propsData: {
        node: TOPIC_NODE,
      },
    });
  });
  it('renders resource count in a subtitle for a topic node', () => {
    expect(wrapper.findComponent('[data-test="subtitle"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="subtitle"]').html()).toContain(
      String(TOPIC_NODE.resource_count),
    );
  });

  it('renders a chevron button', () => {
    expect(wrapper.findComponent('[data-test="btn-chevron"]').exists()).toBe(true);
  });

  it('emits an event when a chevron button is clicked', async () => {
    wrapper.find('[data-test="btn-chevron"]').vm.$emit('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted().topicChevronClick).toBeTruthy();
    expect(wrapper.emitted().topicChevronClick.length).toBe(1);
  });
  it('emits an event when list item is clicked', async () => {
    await wrapper.findComponent('[data-test="content-item"]').trigger('click');

    expect(wrapper.emitted().topicChevronClick).toBeTruthy();
    expect(wrapper.emitted().topicChevronClick.length).toBe(1);
  });
});

describe('in compact mode', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mountComponent({
      propsData: {
        node: DOCUMENT_NODE,
        compact: true,
      },
    });
  });

  it("doesn't render a description", () => {
    expect(wrapper.findComponent('[data-test="description"]').isVisible()).toBe(false);
  });

  it("doesn't render a subtitle", () => {
    expect(wrapper.findComponent('[data-test="subtitle"]').exists()).toBe(false);
  });
});
