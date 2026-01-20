import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioDetailsPanel from '../details/StudioDetailsPanel.vue';

jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  LevelsLookup: {
    lower_primary: 'LOWER_PRIMARY',
    upper_primary: 'UPPER_PRIMARY',
  },
  CategoriesLookup: {
    mathematics: 'MATHEMATICS',
    sciences: 'SCIENCES',
  },
}));

jest.mock('../../utils/metadataStringsTranslation', () => ({
  translateMetadataString: jest.fn(key => {
    const translations = {
      lowerPrimary: 'Lower Primary',
      upperPrimary: 'Upper Primary',
      mathematics: 'Mathematics',
      sciences: 'Sciences',
    };
    return translations[key] || key;
  }),
}));

const router = new VueRouter({ routes: [] });

const translations = {
  publishedHeading: 'Published on',
  currentVersionHeading: 'Published version',
  primaryLanguageHeading: 'Primary language',
  creationHeading: 'Created on',
  sizeHeading: 'Channel size',
  resourceHeading: 'Total resources',
  levelsHeading: 'Levels',
  categoriesHeading: 'Categories',
  authorsLabel: 'Authors',
  tagsHeading: 'Common tags',
  unpublishedText: 'Unpublished',
};

const createMocks = () => ({
  $formatNumber: jest.fn(n => String(n)),
  $formatDate: jest.fn(() => 'January 15, 2025'),
  $tr: jest.fn(key => translations[key] || key),
  translateConstant: jest.fn(key => key),
});

describe('StudioDetailsPanel', () => {
  const fullChannel = {
    name: 'Complete Channel',
    description: 'A fully populated channel',
    thumbnail_url: 'https://example.com/thumb.jpg',
    published: true,
    version: 2,
    primary_token: 'abc12345',
    language: 'en',
    created: '2025-01-15T10:00:00Z',
    last_published: '2025-01-20T15:30:00Z',
    resource_count: 42,
    resource_size: 1024000000,
    kind_count: [],
    levels: ['lower_primary', 'upper_primary'],
    categories: ['mathematics', 'sciences'],
    includes: { coach_content: 1, exercises: 1 },
    tags: [{ tag_name: 'science' }, { tag_name: 'math' }],
    languages: [],
    accessible_languages: [],
    authors: ['Author One', 'Author Two'],
    providers: [],
    aggregators: [],
    licenses: [],
    copyright_holders: [],
    original_channels: [],
    sample_nodes: [],
  };

  const minimalChannel = {
    name: 'Minimal Channel',
    description: '',
    thumbnail_url: null,
    published: false,
    version: null,
    primary_token: null,
    language: null,
    created: null,
    last_published: null,
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

  describe('basic rendering', () => {
    it('renders channel header with name and description', () => {
      render(StudioDetailsPanel, {
        router,
        props: { details: fullChannel, loading: false },
        mocks: createMocks(),
      });

      expect(screen.getByText('Complete Channel')).toBeInTheDocument();
      expect(screen.getByText('A fully populated channel')).toBeInTheDocument();
    });

    it('shows placeholder when thumbnail is missing', () => {
      render(StudioDetailsPanel, {
        router,
        props: { details: minimalChannel, loading: false },
        mocks: createMocks(),
      });

      expect(screen.getByTestId('placeholder-content')).toBeInTheDocument();
    });
  });

  describe('published channel with full data', () => {
    beforeEach(() => {
      render(StudioDetailsPanel, {
        router,
        props: { details: fullChannel, loading: false },
        mocks: createMocks(),
      });
    });

    it('displays published status and version', () => {
      expect(screen.getByText('Published on')).toBeInTheDocument();
      expect(screen.getByText('Published version')).toBeInTheDocument();
    });

    it('displays translated levels and categories', () => {
      expect(screen.getByText('Lower Primary')).toBeInTheDocument();
      expect(screen.getByText('Upper Primary')).toBeInTheDocument();
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('Sciences')).toBeInTheDocument();
    });

    it('displays resource count and metadata', () => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Author One')).toBeInTheDocument();
      expect(screen.getByText('Author Two')).toBeInTheDocument();
      expect(screen.getByText('science')).toBeInTheDocument();
      expect(screen.getByText('math')).toBeInTheDocument();
    });
  });

  describe('unpublished channel with missing data', () => {
    beforeEach(() => {
      render(StudioDetailsPanel, {
        router,
        props: { details: minimalChannel, loading: false },
        mocks: createMocks(),
      });
    });

    it('displays unpublished status', () => {
      expect(screen.getByText('Unpublished')).toBeInTheDocument();
    });

    it('shows placeholder text for empty fields', () => {
      const placeholders = screen.getAllByText('---');
      expect(placeholders.length).toBeGreaterThan(0);
    });

    it('hides conditional fields when data is missing', () => {
      expect(screen.queryByText('Primary language')).not.toBeInTheDocument();
    });
  });
});
