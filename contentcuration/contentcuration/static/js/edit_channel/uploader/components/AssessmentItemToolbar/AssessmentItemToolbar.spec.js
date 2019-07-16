import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemToolbarActions } from '../../constants';
import AssessmentItemToolbar from './AssessmentItemToolbar';

describe('AssessmentItemToolbar', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(AssessmentItemToolbar);
  });

  it('smoke test', () => {
    const wrapper = shallowMount(AssessmentItemToolbar);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('renders', () => {
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('uses a correct item label in menu if specified', () => {
    wrapper = mount(AssessmentItemToolbar, {
      propsData: {
        itemLabel: 'question',
      },
    });

    expect(wrapper.find('[data-test="toolbarMenu"]').html()).toContain('Add question above');
    expect(wrapper.find('[data-test="toolbarMenu"]').html()).toContain('Add question below');
  });

  it('emits click action with correct payload on arrow up icon click', () => {
    wrapper.find('[data-test=toolbarIconArrowUp]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.MOVE_ITEM_UP);
  });

  it('emits click action with correct payload on arrow down icon click', () => {
    wrapper.find('[data-test=toolbarIconArrowDown]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.MOVE_ITEM_DOWN);
  });

  it('emits click action with correct payload on edit icon click', () => {
    wrapper.find('[data-test=toolbarIconEdit]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.EDIT_ITEM);
  });

  it('emits click action with correct payload on delete icon click', () => {
    wrapper.find('[data-test=toolbarIconDelete]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.DELETE_ITEM);
  });

  it('emits click action with correct payload on "Add item above" menu item click', () => {
    wrapper.find('[data-test=toolbarMenuAddItemAbove]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.ADD_ITEM_ABOVE);
  });

  it('emits click action with correct payload on "Add item below" menu item click', () => {
    wrapper.find('[data-test=toolbarMenuAddItemBelow]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.ADD_ITEM_BELOW);
  });

  it("doesn't render edit icon if displayEditIcon is false", () => {
    wrapper = mount(AssessmentItemToolbar, {
      propsData: {
        displayEditIcon: false,
      },
    });

    expect(wrapper.html()).not.toContain('[data-test="toolbarIconEdit"]');
  });

  describe('when displayDeleteIcon is false', () => {
    beforeEach(() => {
      wrapper = mount(AssessmentItemToolbar, {
        propsData: {
          displayDeleteIcon: false,
        },
      });
    });

    it("doesn't render delete icon", () => {
      expect(wrapper.contains('[data-test="toolbarIconDelete"]')).toBe(false);
    });

    it('renders "Delete" menu item', () => {
      expect(wrapper.contains('[data-test="toolbarMenuDeleteItem"]')).toBe(true);
    });

    it('emits click action with correct payload on "Delete" menu item click', () => {
      wrapper.find('[data-test=toolbarMenuDeleteItem]').trigger('click');

      expect(wrapper.emitted().click).toBeTruthy();
      expect(wrapper.emitted().click.length).toBe(1);
      expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.DELETE_ITEM);
    });
  });

  it("doesn't render menu if displayMenu is false", () => {
    wrapper = mount(AssessmentItemToolbar, {
      propsData: {
        displayMenu: false,
      },
    });

    expect(wrapper.contains('[data-test="toolbarMenu"]')).toBe(false);
  });

  describe('when collapse is true', () => {
    beforeEach(() => {
      wrapper = mount(AssessmentItemToolbar, {
        propsData: {
          collapse: true,
        },
      });
    });

    it("doesn't render arrow up icon", () => {
      expect(wrapper.contains('[data-test="toolbarIconArrowUp"]')).toBe(false);
    });

    it('renders "Move up" menu item', () => {
      expect(wrapper.contains('[data-test="toolbarMenuMoveItemUp"]')).toBe(true);
    });

    it('emits click action with correct payload on "Move up" menu item click', () => {
      wrapper.find('[data-test=toolbarMenuMoveItemUp]').trigger('click');

      expect(wrapper.emitted().click).toBeTruthy();
      expect(wrapper.emitted().click.length).toBe(1);
      expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.MOVE_ITEM_UP);
    });

    it("doesn't render arrow down icon", () => {
      expect(wrapper.contains('[data-test="toolbarIconArrowDown"]')).toBe(false);
    });

    it('renders "Move down" menu item', () => {
      expect(wrapper.contains('[data-test="toolbarMenuMoveItemDown"]')).toBe(true);
    });

    it('emits click action with correct payload on "Move down" menu item click', () => {
      wrapper.find('[data-test=toolbarMenuMoveItemDown]').trigger('click');

      expect(wrapper.emitted().click).toBeTruthy();
      expect(wrapper.emitted().click.length).toBe(1);
      expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.MOVE_ITEM_DOWN);
    });

    it("doesn't render delete icon", () => {
      expect(wrapper.contains('[data-test="toolbarIconDelete"]')).toBe(false);
    });

    it('renders "Delete" menu item', () => {
      expect(wrapper.contains('[data-test="toolbarMenuDeleteItem"]')).toBe(true);
    });

    it('emits click action with correct payload on "Delete" menu item click', () => {
      wrapper.find('[data-test=toolbarMenuDeleteItem]').trigger('click');

      expect(wrapper.emitted().click).toBeTruthy();
      expect(wrapper.emitted().click.length).toBe(1);
      expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.DELETE_ITEM);
    });
  });
});
