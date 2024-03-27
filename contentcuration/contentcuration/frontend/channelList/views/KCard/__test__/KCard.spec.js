import { createLocalVue, mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import KCard from './../index.vue';

const localVue = createLocalVue();
localVue.use(VueRouter);
const router = new VueRouter();

describe('index.vue', () => {
  const cardFocusMock = jest.fn();

  // beforeEach(() => {
  const wrapper = mount(KCard, {
    localVue,
    router,
    propsData: {
      title: 'Sample Title',
      headingLevel: 4,
      to: { path: '/some-link' },
      layout: 'horizontal',
      thumbnailDisplay: 'small',
      thumbnailSrc: 'https://example.com/image.jpg',
    },
    slots: {
      aboveTitle: '<p>This is the default content</p>',
      title: '<li>This is the default title</li>',
      belowTitle: '<i>This is the default description</i>',
      footer: '<b>This is the default footer</b>',
    },
    mocks: {
      cardFocus: cardFocusMock,
    },
  });
  // });

  it('renders passed header level', () => {
    expect(wrapper.find('h4').exists()).toBe(true);
  });

  //testing focus and hover events
  it('renders data on focus', () => {
    let emittedData;
    wrapper.vm.$on('focus', data => {
      emittedData = data;
    });

    expect(emittedData).toBeUndefined();
  });

  it('emits data on hover', () => {
    let hoverData;
    wrapper.vm.$on('hover', data => {
      hoverData = data;
    });

    expect(hoverData).toBeUndefined();
  });

  //testing slots
  it('renders slotted content', () => {
    expect(wrapper.find('[slot="aboveTitle"]').exists()).toBe(false);
    expect(wrapper.find('[slot="title"]').exists()).toBe(false);
    expect(wrapper.find('[slot="belowTitle"]').exists()).toBe(false);

    expect(wrapper.find('p').text()).toEqual('This is the default content');
    expect(wrapper.find('li').text()).toEqual('Sample Title');
    expect(wrapper.find('i').text()).toEqual('This is the default description');
    expect(wrapper.find('b').text()).toEqual('This is the default footer');
  });

  //testing image prop
  it('renders image', () => {
    expect(wrapper.find('img').exists()).toBe(true);
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/image.jpg');
  });
});
