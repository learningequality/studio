import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemToolbarActions } from '../../constants';
import AssessmentItemToolbar from './AssessmentItemToolbar';

describe('AssessmentItemToolbar', () => {
  let wrapper;

  it('smoke test', () => {
    const wrapper = shallowMount(AssessmentItemToolbar);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('renders icons', () => {
    wrapper = mount(AssessmentItemToolbar, {
      propsData: {
        iconActionsConfig: [
          AssessmentItemToolbarActions.EDIT_ITEM,
          AssessmentItemToolbarActions.MOVE_ITEM_UP,
          AssessmentItemToolbarActions.MOVE_ITEM_DOWN,
        ],
      },
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('renders move up icon as disabled if canMoveUp is false', () => {
    wrapper = mount(AssessmentItemToolbar, {
      propsData: {
        iconActionsConfig: [
          AssessmentItemToolbarActions.MOVE_ITEM_UP,
          AssessmentItemToolbarActions.MOVE_ITEM_DOWN,
        ],
        canMoveUp: false,
      },
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('renders move down icon as disabled if canMoveDown is false', () => {
    wrapper = mount(AssessmentItemToolbar, {
      propsData: {
        iconActionsConfig: [
          AssessmentItemToolbarActions.MOVE_ITEM_UP,
          AssessmentItemToolbarActions.MOVE_ITEM_DOWN,
        ],
        canMoveDown: false,
      },
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('renders menu', () => {
    wrapper = mount(AssessmentItemToolbar, {
      propsData: {
        displayMenu: true,
        menuActionsConfig: [
          AssessmentItemToolbarActions.ADD_ITEM_ABOVE,
          AssessmentItemToolbarActions.ADD_ITEM_BELOW,
          AssessmentItemToolbarActions.DELETE_ITEM,
        ],
      },
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('moves collapsible icons actions above other menu items in collapse mode', () => {
    wrapper = mount(AssessmentItemToolbar, {
      propsData: {
        iconActionsConfig: [
          AssessmentItemToolbarActions.EDIT_ITEM,
          [AssessmentItemToolbarActions.MOVE_ITEM_UP, { collapse: true }],
          [AssessmentItemToolbarActions.MOVE_ITEM_DOWN, { collapse: true }],
        ],
        displayMenu: true,
        menuActionsConfig: [
          AssessmentItemToolbarActions.ADD_ITEM_ABOVE,
          AssessmentItemToolbarActions.ADD_ITEM_BELOW,
          AssessmentItemToolbarActions.DELETE_ITEM,
        ],
        collapse: true,
      },
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it("doesn't render move up action in menu if it should be collapsed and `canMoveUp` is false", () => {
    wrapper = mount(AssessmentItemToolbar, {
      propsData: {
        iconActionsConfig: [
          [AssessmentItemToolbarActions.MOVE_ITEM_UP, { collapse: true }],
          [AssessmentItemToolbarActions.MOVE_ITEM_DOWN, { collapse: true }],
        ],
        displayMenu: true,
        menuActionsConfig: [
          AssessmentItemToolbarActions.ADD_ITEM_ABOVE,
          AssessmentItemToolbarActions.ADD_ITEM_BELOW,
          AssessmentItemToolbarActions.DELETE_ITEM,
        ],
        collapse: true,
        canMoveUp: false,
      },
    });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it("doesn't render move down action in menu if it should be collapsed and `canMoveDown` is false", () => {
    wrapper = mount(AssessmentItemToolbar, {
      propsData: {
        iconActionsConfig: [
          [AssessmentItemToolbarActions.MOVE_ITEM_UP, { collapse: true }],
          [AssessmentItemToolbarActions.MOVE_ITEM_DOWN, { collapse: true }],
        ],
        displayMenu: true,
        menuActionsConfig: [
          AssessmentItemToolbarActions.ADD_ITEM_ABOVE,
          AssessmentItemToolbarActions.ADD_ITEM_BELOW,
          AssessmentItemToolbarActions.DELETE_ITEM,
        ],
        collapse: true,
        canMoveDown: false,
      },
    });

    expect(wrapper.html()).toMatchSnapshot();
  });
});
