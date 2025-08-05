import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioRaisedBox from '../StudioRaisedBox.vue';

describe('StudioRaisedBox', () => {
  test('renders both header and main slots', () => {
    const headerContent = 'Header Title';
    const mainContent = 'Main content area';
     render(StudioRaisedBox, {
       props: {},
       routes: new VueRouter(),
       slots: {
         header: headerContent,
         main: mainContent,
       },
     });
    expect(screen.getByText(headerContent)).toBeInTheDocument();
    expect(screen.getByText(mainContent)).toBeInTheDocument();
  });
});