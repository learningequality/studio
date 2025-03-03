import { mount } from '@vue/test-utils';
import MoveModal from '../MoveModal.vue';
import { factory } from '../../../store';

const store = factory();

const testNodeId = 'test';
const testNode = {
  id: testNodeId,
  title: 'Show me your moves!',
};
const testVideo = { kind: 'video', id: 'child-video' };
const testChildTopic = { kind: 'topic', id: 'child-topic', has_children: true };
const testChildren = [testVideo, testChildTopic];
const testNodeMap = {
  [testNodeId]: testNode,
  'child-topic': testChildTopic,
  'child-video': testVideo,
};

function makeWrapper(selected) {
  return mount(MoveModal, {
    store,
    computed: {
      dialog() {
        return true;
      },
      currentLocationId() {
        return testNodeId;
      },
      moveNodeIds() {
        return selected || [testNodeId];
      },
      getContentNode() {
        return id => {
          return testNodeMap[id] || testNode;
        };
      },
      children() {
        return testChildren;
      },
      currentChannel() {
        return { id: 'testing' };
      },
      online() {
        return false;
      },
    },
    methods: {
      getChildren() {
        return Promise.resolve();
      },
    },
    stubs: {
      Breadcrumbs: true,
      ResourceDrawer: true,
      OfflineText: true,
    },
  });
}

describe('moveModal', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  describe('on load', () => {
    it('items that are selected to be moved should be disabled', () => {
      const testWrapper = makeWrapper([testVideo.id]);
      expect(testWrapper.vm.isDisabled(testVideo)).toBe(true);
    });
  });
  describe('topic tree navigation', () => {
    it('clicking a topic should navigate to that topic', () => {
      wrapper.findAll('[data-test="listitem"]').at(1).trigger('click');
      expect(wrapper.vm.targetNodeId).toBe(testChildTopic.id);
    });
    it('clicking a non-topic should not do anything', () => {
      wrapper.setData({ targetNodeId: testNode.id });
      wrapper.find('[data-test="listitem"]').trigger('click');
      expect(wrapper.vm.targetNodeId).toBe(testNode.id);
    });
    it('clicking details button should open the node information', () => {
      wrapper.find('[data-test="details"]').trigger('click');
      expect(wrapper.vm.previewNodeId).toBe(testVideo.id);
    });
  });
  describe('new topic actions', () => {
    it('clicking NEW TOPIC button should open NewTopicModal', () => {
      wrapper.find('[data-test="newtopic"]').trigger('click');
      expect(wrapper.vm.showNewTopicModal).toBe(true);
    });
    it('NewTopicModal emitted createTopic event should trigger createContentNode', () => {
      const newTopicTitle = 'New topic title';
      const createTopic = jest.fn();
      wrapper.setMethods({ createTopic });
      wrapper.setData({ showNewTopicModal: true });
      wrapper.find('[data-test="newtopicmodal"]').vm.$emit('createTopic', newTopicTitle);
      expect(createTopic).toHaveBeenCalledWith(newTopicTitle);
    });
  });
  describe('move actions', () => {
    it('MOVE button should be disabled if moving to current location', () => {
      wrapper.setData({ targetNodeId: testNodeId });
      expect(wrapper.find('[data-test="move"]').vm.disabled).toBe(true);
    });
    it('clicking MOVE button should call moveNodes', () => {
      const moveNodes = jest.fn();
      wrapper.setMethods({ moveNodes });
      wrapper.setData({ targetNodeId: testChildTopic.id });
      wrapper.find('[data-test="move"]').trigger('click');
      expect(moveNodes).toHaveBeenCalled();
    });
    it('clicking MOVE button should emit the targetNodeId', () => {
      const moveContentNodes = jest.fn().mockReturnValue(Promise.resolve());
      wrapper.setMethods({ moveContentNodes });
      wrapper.setData({ targetNodeId: testChildTopic.id });

      wrapper.find('[data-test="move"]').trigger('click');
      expect(wrapper.emitted().target[0]).toEqual([testChildTopic.id]);
    });
  });
});
