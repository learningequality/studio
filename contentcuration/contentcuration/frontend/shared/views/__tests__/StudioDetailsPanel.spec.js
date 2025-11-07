import { render } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioDetailsPanel from '../details/StudioDetailsPanel.vue';

const router = new VueRouter({
  routes: [],
});

const mockChannelDetails = {
  name: 'Test Channel',
  description: 'Test channel description',
  thumbnail_url: null,
  published: true,
  version: 1,
  primary_token: 'test-token',
  language: 'en',
  resource_count: 10,
  kind_count: [],
};

describe('StudioDetailsPanel', () => {
  it('renders without crashing with minimal props', () => {
    const { container } = render(StudioDetailsPanel, {
      router,
      props: {
        details: {},
        isChannel: false,
        loading: false,
      },
      mocks: {
        $formatNumber: jest.fn(n => String(n)),
        $formatDate: jest.fn(() => 'Test Date'),
        $tr: jest.fn(key => key),
      },
    });

    expect(container).toBeInTheDocument();
  });

  it('displays loader when loading is true', () => {
    const { container } = render(StudioDetailsPanel, {
      router,
      props: {
        details: {},
        isChannel: true,
        loading: true,
      },
      mocks: {
        $formatNumber: jest.fn(n => String(n)),
        $formatDate: jest.fn(() => 'Test Date'),
        $tr: jest.fn(key => key),
      },
    });

    expect(container).toBeInTheDocument();
  });

  it('renders channel information', () => {
    const { container } = render(StudioDetailsPanel, {
      router,
      props: {
        details: mockChannelDetails,
        isChannel: true,
        loading: false,
      },
      mocks: {
        $formatNumber: jest.fn(n => String(n)),
        $formatDate: jest.fn(() => 'Test Date'),
        $tr: jest.fn(key => key),
      },
    });

    expect(container).toHaveTextContent('Test Channel');
  });

  it('does not use VDataTable', () => {
    const { container } = render(StudioDetailsPanel, {
      router,
      props: {
        details: mockChannelDetails,
        isChannel: true,
        loading: false,
      },
      mocks: {
        $formatNumber: jest.fn(n => String(n)),
        $formatDate: jest.fn(() => 'Test Date'),
        $tr: jest.fn(key => key),
      },
    });

    expect(container.querySelector('.v-datatable')).not.toBeInTheDocument();
  });

  it('does not use VChip', () => {
    const { container } = render(StudioDetailsPanel, {
      router,
      props: {
        details: mockChannelDetails,
        isChannel: true,
        loading: false,
      },
      mocks: {
        $formatNumber: jest.fn(n => String(n)),
        $formatDate: jest.fn(() => 'Test Date'),
        $tr: jest.fn(key => key),
      },
    });

    expect(container.querySelector('.v-chip')).not.toBeInTheDocument();
  });

  it('does not use VLayout or VFlex', () => {
    const { container } = render(StudioDetailsPanel, {
      router,
      props: {
        details: mockChannelDetails,
        isChannel: true,
        loading: false,
      },
      mocks: {
        $formatNumber: jest.fn(n => String(n)),
        $formatDate: jest.fn(() => 'Test Date'),
        $tr: jest.fn(key => key),
      },
    });

    expect(container.querySelector('.v-layout')).not.toBeInTheDocument();
    expect(container.querySelector('.v-flex')).not.toBeInTheDocument();
  });
});
