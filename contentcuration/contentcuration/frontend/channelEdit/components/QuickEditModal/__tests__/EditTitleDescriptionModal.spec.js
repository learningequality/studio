import { mount } from '@vue/test-utils';
import EditTitleDescriptionModal from '../EditTitleDescriptionModal.vue';
import storeFactory from 'shared/vuex/baseStore';

const nodeId = 'test-id';

const node = {
  id: nodeId,
  title: 'test-title',
  description: 'test-description',
};

describe('EditTitleDescriptionModal', () => {
  let wrapper;
  let modal;
  let titleInput;
  let descriptionInput;
  let updateContentNode;
  let storeDispatch;

  beforeEach(() => {
    wrapper = mount(EditTitleDescriptionModal, {
      store: storeFactory({
        modules: {
          contentNode: {
            namespaced: true,
            actions: {
              updateContentNode: jest.fn(),
            },
            getters: {
              getContentNode: () => () => node,
            },
          },
        },
      }),
      propsData: { nodeId },
    });

    updateContentNode = jest.spyOn(wrapper.vm, 'updateContentNode').mockImplementation(() => {});
    storeDispatch = jest.spyOn(wrapper.vm.$store, 'dispatch');
    modal = wrapper.findComponent('[data-test="edit-title-description-modal"]');
    titleInput = wrapper.findComponent('[data-test="title-input"]');
    descriptionInput = wrapper.findComponent('[data-test="description-input"]');
  });

  it('smoke test', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('should display the correct title and description on first render', () => {
    expect(titleInput.props('value')).toBe(node.title);
    expect(descriptionInput.props('value')).toBe(node.description);
  });

  it('should call updateContentNode on success submit', () => {
    modal.vm.$emit('submit');
    expect(updateContentNode).toHaveBeenCalled();
  });

  it('should call updateContentNode with the correct parameters on success submit', () => {
    const newTitle = 'new-title';
    const newDescription = 'new-description';
    titleInput.vm.$emit('input', newTitle);
    descriptionInput.vm.$emit('input', newDescription);

    modal.vm.$emit('submit');

    expect(updateContentNode).toHaveBeenCalledWith({
      id: nodeId,
      title: newTitle,
      description: newDescription ?? '',
      checkComplete: true,
    });
  });

  it('should let update even if description is empty', () => {
    const newTitle = 'new-title';
    titleInput.vm.$emit('input', newTitle);
    descriptionInput.vm.$emit('input', '');

    modal.vm.$emit('submit');
    expect(updateContentNode).toHaveBeenCalledWith({
      id: nodeId,
      title: newTitle,
      description: '',
      checkComplete: true,
    });
  });

  it('should validate title on blur', async () => {
    titleInput.vm.$emit('input', '');
    titleInput.vm.$emit('blur');

    await wrapper.vm.$nextTick();
    expect(titleInput.props('invalidText')).toBeTruthy();
  });

  it('should validate title on submit', async () => {
    titleInput.vm.$emit('input', '');
    modal.vm.$emit('submit');

    await wrapper.vm.$nextTick();
    expect(titleInput.props('invalidText')).toBeTruthy();
  });

  it("should show 'Changes saved' on a snackbar on success submit", async () => {
    await wrapper.vm.handleSave();
    expect(storeDispatch).toHaveBeenCalledWith('showSnackbarSimple', 'Changes saved');
  });

  it("should emit 'close' event on success submit", async () => {
    await wrapper.vm.handleSave();
    expect(wrapper.emitted().close).toBeTruthy();
  });

  it('should emit close event on cancel', () => {
    modal.vm.$emit('cancel');
    expect(wrapper.emitted().close).toBeTruthy();
  });
});
