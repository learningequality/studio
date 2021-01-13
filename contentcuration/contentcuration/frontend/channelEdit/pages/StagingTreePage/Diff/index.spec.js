import { mount } from '@vue/test-utils';

import Diff from './index';

describe('Diff', () => {
  describe('for a value less than 0', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(Diff, {
        propsData: { value: -3 },
        scopedSlots: {
          default: `
    				<span slot-scope="{ sign, value }">
    					<span data-test="sign">{{ sign }}</span>
    					<span data-test="value">{{ value }}</span>
    				</span>
    			`,
        },
      });
    });

    it('renders red text', () => {
      expect(wrapper.classes()).toContain('red--text');
    });

    it('exposes minus sign in sign slot property', () => {
      expect(wrapper.find('[data-test="sign"]').text()).toBe('-');
    });

    it('exposes absolute value in value slot property', () => {
      expect(wrapper.find('[data-test="value"]').text()).toBe('3');
    });
  });

  describe('for a value equal to 0', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(Diff, {
        propsData: { value: 0 },
        scopedSlots: {
          default: `
    				<span slot-scope="{ sign, value }">
    					<span data-test="sign">{{ sign }}</span>
    					<span data-test="value">{{ value }}</span>
    				</span>
    			`,
        },
      });
    });

    it('renders gray text', () => {
      expect(wrapper.classes()).toContain('grey--text');
    });

    it('exposes an empty value in sign slot property', () => {
      expect(wrapper.find('[data-test="sign"]').text()).toBe('');
    });
    it('exposes absolute value in value slot property', () => {
      expect(wrapper.find('[data-test="value"]').text()).toBe('0');
    });
  });

  describe('for a value greater than 0', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(Diff, {
        propsData: { value: 2 },
        scopedSlots: {
          default: `
    				<span slot-scope="{ sign, value }">
    					<span data-test="sign">{{ sign }}</span>
    					<span data-test="value">{{ value }}</span>
    				</span>
    			`,
        },
      });
    });

    it('renders green text', () => {
      expect(wrapper.classes()).toContain('green--text');
    });

    it('exposes plus sign in sign slot property', () => {
      expect(wrapper.find('[data-test="sign"]').text()).toBe('+');
    });

    it('exposes absolute value in value slot property', () => {
      expect(wrapper.find('[data-test="value"]').text()).toBe('2');
    });
  });
});
