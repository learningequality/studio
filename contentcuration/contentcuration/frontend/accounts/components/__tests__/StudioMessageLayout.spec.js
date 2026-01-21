import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioMessageLayout from '../StudioMessageLayout.vue';

const createRouter = () => {
  return new VueRouter({
    mode: 'abstract',
    routes: [{ path: '/', name: 'Main', component: { template: '<div />' } }],
  });
};

const renderComponent = (props = {}, slots = {}) => {
  return render(StudioMessageLayout, {
    props: {
      header: 'Default Header',
      ...props,
    },
    slots,
    routes: createRouter(),
    stubs: {
      StudioPage: {
        template: '<div class="studio-page-stub"><slot /></div>',
      },
      KRouterLink: {
        props: ['to', 'text', 'appearance'],
        template: '<a href="#">{{ text }}</a>',
      },
    },
  });
};

describe('StudioMessageLayout', () => {
  it('renders with required header prop', () => {
    renderComponent({ header: 'Test Message' });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Message');
  });

  it('renders with optional text prop', () => {
    renderComponent({
      header: 'Header',
      text: 'This is additional information',
    });

    expect(screen.getByText('This is additional information')).toBeInTheDocument();
  });

  it('renders default slot content', () => {
    renderComponent({ header: 'Header' }, { default: 'Custom slot content here' });

    expect(screen.getByText('Custom slot content here')).toBeInTheDocument();
  });

  it('renders named back slot override', () => {
    renderComponent({ header: 'Header' }, { back: 'Custom back content' });

    expect(screen.getByText('Custom back content')).toBeInTheDocument();
    expect(screen.queryByText('Continue to sign-in page')).not.toBeInTheDocument();
  });
});
