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

  it("doesn't render edit icon if displayEdit is false", () => {
    wrapper = mount(AssessmentItemToolbar, {
      propsData: {
        displayEdit: false,
      },
    });

    expect(wrapper.html()).not.toContain('edit');
  });

  it('emits click action with correct payload on arrow up click', () => {
    wrapper.find('[data-test=toolbarIconArrowUp]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.MOVE_ITEM_UP);
  });

  it('emits click action with correct payload on arrow down click', () => {
    wrapper.find('[data-test=toolbarIconArrowDown]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.MOVE_ITEM_DOWN);
  });

  it('emits click action with correct payload on edit click', () => {
    wrapper.find('[data-test=toolbarIconEdit]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.EDIT_ITEM);
  });

  it('emits click action with correct payload on "Add question above" click', () => {
    wrapper.find('[data-test=toolbarMenuAddItemAbove]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.ADD_ITEM_ABOVE);
  });

  it('emits click action with correct payload on "Add question below" click', () => {
    wrapper.find('[data-test=toolbarMenuAddItemBelow]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.ADD_ITEM_BELOW);
  });

  it('emits click action with correct payload on "Delete" click', () => {
    wrapper.find('[data-test=toolbarMenuDeleteItem]').trigger('click');

    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
    expect(wrapper.emitted().click[0][0]).toEqual(AssessmentItemToolbarActions.DELETE_ITEM);
  });
});
