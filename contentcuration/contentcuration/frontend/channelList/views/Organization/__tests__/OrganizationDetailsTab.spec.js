import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuex, { Store } from 'vuex';
import OrganizationDetailsTab from '../OrganizationDetailsTab.vue';

const localVue = createLocalVue();
localVue.use(VueRouter);
localVue.use(Vuex);

const router = new VueRouter();

const createStore = () => {
  return new Store({
    getters: {
      snackbarIsVisible: () => false,
      snackbarOptions: () => null,
    },
    actions: {
      showSnackbar: jest.fn(),
    },
  });
};

describe('OrganizationDetailsTab', () => {
  it('shows a loader while loading', () => {
    render(OrganizationDetailsTab, {
      localVue,
      router,
      store: createStore(),
      props: { organization: null, loading: true, save: jest.fn() },
    });

    expect(screen.queryByRole('textbox', { name: 'Organization name' })).not.toBeInTheDocument();
  });

  it('pre-fills the form from the organization prop', () => {
    render(OrganizationDetailsTab, {
      localVue,
      router,
      store: createStore(),
      props: {
        organization: { id: 'org-1', name: 'Acme', description: 'Learning org', public: true },
        loading: false,
        save: jest.fn(),
        isAdmin: true,
      },
    });

    expect(screen.getByDisplayValue('Acme')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Learning org')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Public/ })).toBeChecked();
  });

  it('saves the trimmed field values when Save changes is clicked', async () => {
    const save = jest.fn().mockResolvedValue({});
    render(OrganizationDetailsTab, {
      localVue,
      router,
      store: createStore(),
      props: {
        organization: { id: 'org-1', name: 'Acme', description: '', public: false },
        loading: false,
        save,
        isAdmin: true,
      },
    });

    const user = userEvent.setup();
    const nameInput = screen.getByRole('textbox', { name: 'Organization name' });
    await user.clear(nameInput);
    await user.type(nameInput, '  Renamed Org  ');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(save).toHaveBeenCalledWith({
      name: 'Renamed Org',
      description: '',
      public: false,
    });
  });

  it('does not save when the name is blank', async () => {
    const save = jest.fn();
    render(OrganizationDetailsTab, {
      localVue,
      router,
      store: createStore(),
      props: {
        organization: { id: 'org-1', name: 'Acme', description: '', public: false },
        loading: false,
        save,
        isAdmin: true,
      },
    });

    const user = userEvent.setup();
    const nameInput = screen.getByRole('textbox', { name: 'Organization name' });
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(save).not.toHaveBeenCalled();
    expect(await screen.findByText('Organization name is required')).toBeInTheDocument();
  });

  it('shows a read-only view with no Save button for non-admins', () => {
    render(OrganizationDetailsTab, {
      localVue,
      router,
      store: createStore(),
      props: {
        organization: { id: 'org-1', name: 'Acme', description: '', public: false },
        loading: false,
        save: jest.fn(),
        isAdmin: false,
      },
    });

    expect(screen.getByRole('textbox', { name: 'Organization name' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Only organization admins can edit these details.'),
    ).toBeInTheDocument();
  });

  it('shows a "Create organization" button and starts with blank fields in create mode', () => {
    render(OrganizationDetailsTab, {
      localVue,
      router,
      store: createStore(),
      props: {
        organization: null,
        loading: false,
        save: jest.fn(),
        isNew: true,
        isAdmin: true,
      },
    });

    expect(screen.getByRole('textbox', { name: 'Organization name' })).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: /Public/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Create organization' })).toBeInTheDocument();
  });

  it('emits "created" with the new id after a successful create', async () => {
    const save = jest.fn().mockResolvedValue({ id: 'org-2', name: 'New Org' });
    const { emitted } = render(OrganizationDetailsTab, {
      localVue,
      router,
      store: createStore(),
      props: {
        organization: null,
        loading: false,
        save,
        isNew: true,
        isAdmin: true,
      },
    });

    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Organization name' }), 'New Org');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    expect(save).toHaveBeenCalledWith({ name: 'New Org', description: '', public: false });
    await new Promise(resolve => setTimeout(resolve));
    expect(emitted().created[0]).toEqual(['org-2']);
  });
});
