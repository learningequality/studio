import { mount } from '@vue/test-utils';
import Vuex from 'vuex';
import EditTitleDescriptionModal from '../EditTitleDescriptionModal.vue';

const node = {
  id: 'test-id',
  title: 'test-title',
  description: 'test-description',
};

let store;
let contentNodeActions;
let generalActions;

describe('EditTitleDescriptionModal', () => {
  beforeEach(() => {
    contentNodeActions = {
      updateContentNode: jest.fn(),
    };
    generalActions = {
      showSnackbarSimple: jest.fn(),
    };
    store = new Vuex.Store({
      actions: generalActions,
      modules: {
        contentNode: {
          namespaced: true,
          actions: contentNodeActions,
        },
      },
    });
  });

  test('smoke test', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      propsData: {
        node,
      },
    });
    expect(wrapper.isVueInstance()).toBe(true);
  });

  test('should display the correct title and description on first render', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      propsData: {
        node,
      },
    });

    expect(wrapper.find('[data-test="title-input"]').vm.$props.value).toBe(node.title);
    expect(wrapper.find('[data-test="description-input"]').vm.$props.value).toBe(node.description);
  });

  test('should call updateContentNode on success submit', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        node,
      },
    });

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');
    expect(contentNodeActions.updateContentNode).toHaveBeenCalled();
  });

  test('should call updateContentNode with the correct parameters on success submit', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        node,
      },
    });

    const newTitle = 'new-title';
    const newDescription = 'new-description';
    wrapper.find('[data-test="title-input"]').vm.$emit('input', 'new-title');
    wrapper.find('[data-test="description-input"]').vm.$emit('input', 'new-description');

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');

    expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
      id: node.id,
      title: newTitle,
      description: newDescription,
    });
  });

  test('should let update even if description is empty', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        node,
      },
    });

    const newTitle = 'new-title';
    wrapper.find('[data-test="title-input"]').vm.$emit('input', 'new-title');
    wrapper.find('[data-test="description-input"]').vm.$emit('input', '');

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');

    expect(contentNodeActions.updateContentNode).toHaveBeenCalledWith(expect.anything(), {
      id: node.id,
      title: newTitle,
      description: '',
    });
  });

  test('should validate title on blur', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        node,
      },
    });

    wrapper.find('[data-test="title-input"]').vm.$emit('input', '');
    wrapper.find('[data-test="title-input"]').vm.$emit('blur');

    expect(wrapper.find('[data-test="title-input"]').vm.$props.invalidText).toBeTruthy();
  });

  test('should validate title on submit', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        node,
      },
    });

    wrapper.find('[data-test="title-input"]').vm.$emit('input', '');
    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');

    expect(wrapper.find('[data-test="title-input"]').vm.$props.invalidText).toBeTruthy();
  });

  test("should show 'Edited title and description' on a snackbar on success submit", () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        node,
      },
    });

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');
    expect(generalActions.showSnackbarSimple).toHaveBeenCalledWith(
      expect.anything(),
      'Edited title and description'
    );
  });

  test("should emit 'close' event on success submit", () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        node,
      },
    });

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('submit');
    expect(wrapper.emitted().close).toBeTruthy();
  });

  test('should emit close event on cancel', () => {
    const wrapper = mount(EditTitleDescriptionModal, {
      store,
      propsData: {
        node,
      },
    });

    wrapper.find('[data-test="edit-title-description-modal"]').vm.$emit('cancel');
    expect(wrapper.emitted().close).toBeTruthy();
  });
});
