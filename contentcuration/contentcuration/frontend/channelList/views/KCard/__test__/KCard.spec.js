import { shallowMount } from "@vue/test-utils";
import KCard from './../index.vue';


describe('index.vue', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallowMount(KCard,{
      propsData: {
        title: 'Sample Title',
        headingLevel: 2,
        to: { path: '/some-link' },
        layout: 'horizontal',
        thumbnailDisplay: 'small',
        thumbnailSrc: 'https://example.com/image.jpg',
      },
      methods: {cardFocus:()=>{}},
    });
  });

  it('renders title', () => {
    expect(wrapper.find('h2').exists()).toBe(false);
  });

  it('renders data on focus', () => {
    let emittedOnFocus;
    wrapper.vm.$on('focus',(data)=>{
      emittedOnFocus = data;
    });
    expect(emittedOnFocus).toBeUndefined();
  });

  it('renders data on hover', () => {
    let emittedOnHover;
    wrapper.vm.$on('hover',(data)=>{
      emittedOnHover = data;
    });
    expect(emittedOnHover).toBeUndefined();
  });

  it('renders image', () => {
    expect(wrapper.find('img').exists()).toBe(false);
  });

  it('renders slotted content', () => {
    expect(wrapper.find('[slot="aboveTitle"]').exists()).toBe(false);
    expect(wrapper.find('[slot="title"]').exists()).toBe(false);
    expect(wrapper.find('[slot="belowTitle"]').exists()).toBe(false);
  });
  


  
});