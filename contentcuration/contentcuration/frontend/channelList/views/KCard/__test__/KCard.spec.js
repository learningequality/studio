import { mount } from "@vue/test-utils";
import KCard from './../index.vue';


describe('KCard', () => {
    it('renders horizontal layout with small thumbnail', () => {
      const wrapper = mount(KCard, {
        propsData: {
          title: 'Sample Title',
          headingLevel: 2,
          to: { path: '/some-link' },
          layout: 'horizontal',
          thumbnailDisplay: 'small',
          thumbnailSrc: 'https://example.com/image.jpg',
        },
      }); 
  
      expect(wrapper.find('[data-test="k-card"]').exists()).toBe(true);
      expect(wrapper.find('h2').text()).toBe('Sample Title'); 
      expect(wrapper.findAll('[slot="aboveTitle"]').length).toBe(1); 
      expect(wrapper.findAll('[slot="title"]').length).toBe(1);
      expect(wrapper.findAll('[slot="belowTitle"]').length).toBe(1);
    });
  });