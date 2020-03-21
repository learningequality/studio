import { mount } from '@vue/test-utils';
import MoveModal from '../MoveModal.vue';
import store from '../../store';

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
    attachToDocument: true,
    computed: {
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
    },
    stubs: {
      Breadcrumbs: true,
      ResourceDrawer: true,
    },
  });
}

describe('moveModal', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  describe('on load', () => {
    it('should load children', () => {
      const loadChildrenMock = jest.fn();
      function loadChildren() {
        return new Promise(resolve => {
          loadChildrenMock();
          resolve();
        });
      }
      wrapper.setMethods({ loadChildren });
      wrapper.setData({ targetNodeId: testChildTopic.id });
      wrapper.vm.getChildren();
      expect(loadChildrenMock).toHaveBeenCalled();
    });
    it('items that are selected to be moved should be disabled', () => {
      let testWrapper = makeWrapper([testVideo.id]);
      expect(
        testWrapper
          .findAll('[data-test="listitem"]')
          .at(0)
          .classes('disabled')
      ).toBe(true);
    });
  });
  describe('topic tree navigation', () => {
    it('clicking a topic should navigate to that topic', () => {
      wrapper
        .findAll('[data-test="listitem"]')
        .at(1)
        .trigger('click');
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
  describe('close actions', () => {
    it('closing modal should navigate to parent route', () => {
      const setMoveNodes = jest.fn();
      wrapper.setMethods({ setMoveNodes });
      wrapper.find('[data-test="close"]').trigger('click');
      expect(setMoveNodes).toHaveBeenCalledWith([]);
    });
    it('clicking CANCEL button should navigate to parent route', () => {
      const setMoveNodes = jest.fn();
      wrapper.setMethods({ setMoveNodes });
      wrapper.find('[data-test="cancel"]').trigger('click');
      expect(setMoveNodes).toHaveBeenCalledWith([]);
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
      wrapper.setData({ showNewTopicModal: true });
      wrapper.setMethods({ createTopic });
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
    it('clicking MOVE button should trigger a move action', () => {
      const moveContentNodesMock = jest.fn();
      function moveContentNodes() {
        return new Promise(resolve => {
          moveContentNodesMock();
          resolve();
        });
      }
      wrapper.setData({ targetNodeId: testChildTopic.id });
      wrapper.setMethods({ moveContentNodes });
      wrapper.find('[data-test="move"]').trigger('click');
      expect(moveContentNodesMock).toHaveBeenCalled();
    });
    it('clicking MOVE TO CLIPBOARD button call moveNodesToClipboard', () => {
      const moveToClipboard = jest.fn();
      wrapper.setMethods({ moveToClipboard });
      wrapper.find('[data-test="clipboard"]').trigger('click');
      expect(moveToClipboard).toHaveBeenCalled();
    });
    it('clicking MOVE TO CLIPBOARD button should trigger a move action to clipboard', () => {
      const moveContentNodesToClipboardMock = jest.fn();
      function moveContentNodesToClipboard() {
        return new Promise(resolve => {
          moveContentNodesToClipboardMock();
          resolve();
        });
      }
      wrapper.setProps({ moveNodeIds: 'node 1, node 2' });
      wrapper.setMethods({ moveContentNodesToClipboard });
      wrapper.find('[data-test="clipboard"]').trigger('click');
      expect(moveContentNodesToClipboardMock).toHaveBeenCalled();
    });
  });
});
