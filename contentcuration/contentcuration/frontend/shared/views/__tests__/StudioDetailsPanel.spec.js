import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import ContentLevels from 'kolibri-constants/labels/Levels';
import Categories from 'kolibri-constants/labels/Subjects';
import StudioDetailsPanel from '../details/StudioDetailsPanel.vue';

const renderComponent = (props = {}) => {
  return render(StudioDetailsPanel, {
    props,
    routes: new VueRouter(),
  });
};

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
    levels: [ContentLevels.LOWER_PRIMARY, ContentLevels.UPPER_PRIMARY],
    categories: [Categories.MATHEMATICS, Categories.SCIENCES],
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

  it('renders channel header with name and description', () => {
    renderComponent({ details: fullChannel, loading: false });

    expect(screen.getByText('Complete Channel')).toBeInTheDocument();
    expect(screen.getByText('A fully populated channel')).toBeInTheDocument();
  });

  describe('published channel with full data', () => {
    beforeEach(() => {
      renderComponent({ details: fullChannel, loading: false });
    });

    it('displays published status and version', () => {
      expect(screen.getByText('Published on')).toBeInTheDocument();
      expect(screen.getByText('Published version')).toBeInTheDocument();
    });

    it('displays translated levels and categories', () => {
      expect(screen.getByText('Lower primary')).toBeInTheDocument();
      expect(screen.getByText('Upper primary')).toBeInTheDocument();
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
      renderComponent({ details: minimalChannel, loading: false });
    });

    it('displays unpublished status', () => {
      expect(screen.getByText('Unpublished')).toBeInTheDocument();
    });

    it('shows placeholder text for empty fields', () => {
      const placeholders = screen.getAllByText('---');
      expect(placeholders.length).toBeGreaterThan(0);
    });
  });
});
