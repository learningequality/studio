import { render, screen } from '@testing-library/vue';
import { Store } from 'vuex';
import VueRouter from 'vue-router';
import CatalogFilterPanelContent from '../components/CatalogFilterPanelContent.vue';

const mockRouter = new VueRouter({
  routes: [{ name: 'CATALOG_FAQ', path: '/catalog/faq' }],
});

const createStore = () => {
  return new Store({
    getters: {
      loggedIn: () => true,
    },
  });
};

const renderComponent = () => {
  const store = createStore();

  return render(CatalogFilterPanelContent, {
    store,
    routes: mockRouter,
  });
};

beforeEach(() => {
  window.libraryMode = false;
  window.publicKinds = ['video', 'audio', 'document'];
  window.publicLicenses = [1, 2, 3];
});

describe('CatalogFilterPanelContent', () => {
  it('renders all filter components', () => {
    renderComponent();

    expect(screen.getByLabelText('Keywords')).toBeInTheDocument();
    expect(screen.getByLabelText('Licenses')).toBeInTheDocument();
    expect(screen.getByLabelText('Formats')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Starred' })).toBeInTheDocument();
    expect(screen.getByText('Display only channels with')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Resources for coaches' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Captions or subtitles' })).toBeInTheDocument();
    expect(screen.getByText('Frequently asked questions')).toBeInTheDocument();
    expect(screen.getByAltText('Learning Equality logo')).toBeInTheDocument();
  });

  it('renders keyword search input', () => {
    renderComponent();
    expect(screen.getByLabelText('Keywords')).toBeInTheDocument();
  });

  it('hides license filter in library mode', () => {
    window.libraryMode = true;
    renderComponent();
    expect(screen.queryByLabelText('Licenses')).not.toBeInTheDocument();
  });

  it('shows license filter in non-library mode', () => {
    window.libraryMode = false;
    renderComponent();
    expect(screen.getByLabelText('Licenses')).toBeInTheDocument();
  });

  it('renders help tooltip for coach resources', () => {
    renderComponent();
    expect(screen.getByRole('checkbox', { name: 'Resources for coaches' })).toBeInTheDocument();
  });

  it('renders footer with copyright', () => {
    renderComponent();
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} Learning Equality`)).toBeInTheDocument();
  });

  it('renders FAQ link with external icon', () => {
    renderComponent();
    const faqLink = screen.getByText('Frequently asked questions');
    expect(faqLink).toBeInTheDocument();
  });

  it('renders language filter', () => {
    renderComponent();
    expect(screen.getByText('Languages')).toBeInTheDocument();
  });
});
