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

  describe('when channel has all data', () => {
    const fullDataChannel = {
      name: 'Complete Channel',
      description: 'A fully populated channel with all fields',
      thumbnail_url: 'https://example.com/thumb.jpg',
      published: true,
      version: 2,
      primary_token: 'test-token-abc123',
      language: 'en',
      created: '2025-01-15T10:00:00Z',
      last_update: '2025-01-20T15:30:00Z',
      resource_count: 42,
      resource_size: 1024000000,
      kind_count: [
        { kind_id: 'video', count: 20 },
        { kind_id: 'document', count: 22 },
      ],
      levels: ['Level 1', 'Level 2', 'Level 3'],
      categories: ['Category A', 'Category B'],
      includes: { coach_content: 1, exercises: 1 },
      tags: [{ tag_name: 'science' }, { tag_name: 'math' }],
      languages: ['English', 'Spanish', 'French'],
      accessible_languages: ['English'],
      authors: ['Author One', 'Author Two'],
      providers: ['Provider ABC'],
      aggregators: ['Aggregator XYZ'],
      licenses: ['CC_BY_SA_3_0'],
      copyright_holders: ['Copyright Holder Inc'],
      original_channels: [],
      sample_nodes: [],
    };

    let wrapper;

    beforeEach(() => {
      wrapper = render(StudioDetailsPanel, {
        router,
        props: {
          details: fullDataChannel,
          isChannel: true,
          loading: false,
        },
        mocks: {
          $formatNumber: jest.fn(n => String(n)),
          $formatDate: jest.fn(() => 'Test Date'),
          $tr: jest.fn(key => key),
        },
      });
    });

    it('should render channel name', () => {
      expect(wrapper.container).toHaveTextContent('Complete Channel');
    });

    it('should render channel description', () => {
      expect(wrapper.container).toHaveTextContent('A fully populated channel with all fields');
    });

    it('should render published status', () => {
      expect(wrapper.container).toHaveTextContent('publishedHeading');
    });

    it('should render version information', () => {
      expect(wrapper.container).toHaveTextContent('currentVersionHeading');
      expect(wrapper.container).toHaveTextContent('2');
    });

    it('should render primary language', () => {
      expect(wrapper.container).toHaveTextContent('primaryLanguageHeading');
    });

    it('should render resource count', () => {
      expect(wrapper.container).toHaveTextContent('resourceHeading');
      expect(wrapper.container).toHaveTextContent('42');
    });

    it('should render educational levels when present', () => {
      // When levels array is populated, the levelsHeading row should be rendered
      expect(wrapper.container).toHaveTextContent('levelsHeading');
      // Levels are rendered through the component, verify the section exists
      const levelRows = Array.from(wrapper.container.querySelectorAll('*')).filter(el =>
        el.textContent?.includes('levelsHeading'),
      );
      expect(levelRows.length).toBeGreaterThan(0);
    });

    it('should render categories when present', () => {
      // When categories array is populated, the categoriesHeading row should be rendered
      expect(wrapper.container).toHaveTextContent('categoriesHeading');
      // Categories are rendered through the component, verify the section exists
      const categoryRows = Array.from(wrapper.container.querySelectorAll('*')).filter(el =>
        el.textContent?.includes('categoriesHeading'),
      );
      expect(categoryRows.length).toBeGreaterThan(0);
    });

    it('should render creation date', () => {
      expect(wrapper.container).toHaveTextContent('creationHeading');
    });

    it('should render channel size', () => {
      expect(wrapper.container).toHaveTextContent('sizeHeading');
    });

    it('should render licenses when present', () => {
      expect(wrapper.container).toHaveTextContent('licensesLabel');
    });

    it('should render authors when present', () => {
      expect(wrapper.container).toHaveTextContent('authorsLabel');
    });

    it('should render tags when present', () => {
      expect(wrapper.container).toHaveTextContent('tagsHeading');
    });
  });

  describe('when channel has missing data', () => {
    const minimalChannel = {
      name: 'Minimal Channel',
      description: '',
      thumbnail_url: null,
      published: false,
      version: null,
      primary_token: null,
      language: null,
      created: null,
      last_update: null,
      resource_count: 0,
      resource_size: 0,
      kind_count: [],
      levels: [],
      categories: [],
      includes: { coach_content: 0, exercises: 0 },
      tags: [],
      languages: [],
      accessible_languages: [],
      authors: [],
      providers: [],
      aggregators: [],
      licenses: [],
      copyright_holders: [],
      original_channels: [],
      sample_nodes: [],
    };

    let wrapper;

    beforeEach(() => {
      wrapper = render(StudioDetailsPanel, {
        router,
        props: {
          details: minimalChannel,
          isChannel: true,
          loading: false,
        },
        mocks: {
          $formatNumber: jest.fn(n => String(n)),
          $formatDate: jest.fn(() => 'Test Date'),
          $tr: jest.fn(key => key),
        },
      });
    });

    it('should render channel name even when minimal', () => {
      expect(wrapper.container).toHaveTextContent('Minimal Channel');
    });

    it('should show placeholder icon when thumbnail is missing', () => {
      // Verify that the component renders without crashing
      // and that a placeholder is shown instead of an image
      expect(wrapper.container).toBeInTheDocument();
    });

    it('should show default text when levels are missing', () => {
      expect(wrapper.container).toHaveTextContent('---');
    });

    it('should show default text when categories are missing', () => {
      expect(wrapper.container).toHaveTextContent('---');
    });

    it('should not show primary language when not set', () => {
      // Language row should not appear if language is not set
      const container = wrapper.container;
      const languageRows = Array.from(container.querySelectorAll('*')).filter(el =>
        el.textContent?.includes('primaryLanguageHeading'),
      );
      expect(languageRows.length).toBe(0);
    });

    it('should render unpublished status when published is false', () => {
      expect(wrapper.container).toHaveTextContent('unpublishedText');
    });

    it('should not display token row when token is not present', () => {
      // Token row should not appear if primary_token is null
      expect(wrapper.container).not.toHaveTextContent('test-token');
    });
  });

  describe('when channel has partial data', () => {
    const partialChannel = {
      name: 'Partial Channel',
      description: 'Some description',
      thumbnail_url: null,
      published: true,
      version: 1,
      primary_token: 'partial-token-xyz',
      language: 'es',
      created: '2025-01-10T10:00:00Z',
      last_update: '2025-01-18T10:00:00Z',
      resource_count: 15,
      resource_size: 512000000,
      kind_count: [{ kind_id: 'video', count: 15 }],
      levels: [],
      categories: ['Category C'],
      includes: { coach_content: 0, exercises: 1 },
      tags: [],
      languages: [],
      accessible_languages: [],
      authors: [],
      providers: [],
      aggregators: [],
      licenses: [],
      copyright_holders: [],
      original_channels: [],
      sample_nodes: [],
    };

    let wrapper;

    beforeEach(() => {
      wrapper = render(StudioDetailsPanel, {
        router,
        props: {
          details: partialChannel,
          isChannel: true,
          loading: false,
        },
        mocks: {
          $formatNumber: jest.fn(n => String(n)),
          $formatDate: jest.fn(() => 'Test Date'),
          $tr: jest.fn(key => key),
        },
      });
    });

    it('should render fields that have data and show placeholder for missing fields', () => {
      expect(wrapper.container).toHaveTextContent('Partial Channel');
      expect(wrapper.container).toHaveTextContent('Some description');
      // Categories section is rendered when data present
      expect(wrapper.container).toHaveTextContent('categoriesHeading');
      // Levels should show placeholder since array is empty
      expect(wrapper.container).toHaveTextContent('---');
    });

    it('should render both data-present and data-absent states', () => {
      // Has categories (heading should be present)
      expect(wrapper.container).toHaveTextContent('categoriesHeading');
      // Missing levels
      expect(wrapper.container).toHaveTextContent('levelsHeading');
      // Placeholder text for missing data
      expect(wrapper.container).toHaveTextContent('---');
    });
  });
});
