import { render, fireEvent, waitFor, screen } from '@testing-library/vue';
import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';
import { factory } from '../../../store';
import PublishSidePanel from '../PublishSidePanel.vue';
import { Channel, CommunityLibrarySubmission } from 'shared/data/resources';
import { forceServerSync } from 'shared/data/serverSync';
import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);
localVue.use(KThemePlugin);

jest.mock('shared/data/resources', () => ({
  Channel: jest.fn(),
  CommunityLibrarySubmission: jest.fn(),
}));

jest.mock('shared/data/serverSync', () => ({
  forceServerSync: jest.fn(),
}));

jest.mock('shared/logging', () => ({
  error: jest.fn(),
}));

let store;
const renderComponent = (props = {}) => {
  const currentChannel = {
    id: 'channel-id',
    version: 1,
    language: 'en',
    public: false,
    ricecooker_version: null,
    root_id: 'root-id',
    ...props.currentChannel,
  };
  const rootNode = {
    id: 'root-id',
    error_count: props.errorCount || 0,
  };

  // Set up vuex store state
  window.CHANNEL_EDIT_GLOBAL.channel_id = currentChannel.id;

  store = factory();

  store.commit('channel/ADD_CHANNEL', currentChannel);
  store.commit('contentNode/ADD_CONTENTNODE', rootNode);
  store.commit('SET_UNSAVED_CHANGES', props.areAllChangesSaved === false);

  const router = new VueRouter();

  return render(PublishSidePanel, {
    localVue,
    store,
    router,
  });
};

describe('PublishSidePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    Channel.publish = jest.fn();
    Channel.publishDraft = jest.fn();
    Channel.update = jest.fn();
    Channel.languageExistsInResources = jest.fn(() => true);
    Channel.languagesInResources = jest.fn(() => []);
    CommunityLibrarySubmission.fetchCollection = jest.fn();
    forceServerSync.mockResolvedValue({});
  });

  it('renders correctly in default LIVE mode', async () => {
    renderComponent();

    // Headers and default texts
    expect(screen.getByText(communityChannelsStrings.publishChannel$())).toBeVisible();
    expect(screen.getByText(communityChannelsStrings.modeLive$())).toBeVisible();

    expect(
      screen.getByText(communityChannelsStrings.publishingInfo$({ version: 2 })),
    ).toBeVisible();

    // Default button text
    expect(screen.getByText(communityChannelsStrings.publishAction$())).toBeVisible();

    // Live mode selected by default
    const liveRadio = screen.getByRole('radio', { name: /Live/ });
    expect(liveRadio).toBeChecked();
  });

  it('validates version notes in LIVE mode', async () => {
    renderComponent();

    const publishBtn = screen.getByText(communityChannelsStrings.publishAction$());

    const notesInput = screen.getByLabelText(communityChannelsStrings.versionDescriptionLabel$());

    // Initially button disabled because notes empty
    expect(publishBtn).toBeDisabled();

    // Touch field to trigger validation visible
    await fireEvent.blur(notesInput);
    expect(screen.getByText('Version notes are required')).toBeVisible();

    // Type notes
    await fireEvent.update(notesInput, 'My version notes');
    await fireEvent.blur(notesInput);

    // Validation error should disappear
    await waitFor(() =>
      expect(screen.queryByText('Version notes are required')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(publishBtn).toBeEnabled());
  });

  describe('Language dropdown', () => {
    it('shows language dropdown and validates language when conditions met (Live Mode)', async () => {
      // Condition: resources have different languages, or not set
      Channel.languageExistsInResources.mockResolvedValue(false);
      Channel.languagesInResources.mockResolvedValue(['de']);

      renderComponent({
        currentChannel: { language: 'en' }, // Channel is en, but resource is de
      });

      // Wait for onMounted actions
      await waitFor(() => expect(Channel.languageExistsInResources).toHaveBeenCalled());
      await waitFor(() => expect(Channel.languagesInResources).toHaveBeenCalled());

      // Check dropdown visibility via label (found as text since KSelect uses div)
      expect(screen.getByText(communityChannelsStrings.languageLabel$())).toBeVisible();

      // Load 'Deutsch' text presence in the DOM (it might be hidden in dropdown)
      await waitFor(() => expect(screen.getAllByText(/Deutsch/i).length).toBeGreaterThan(0));

      // Check validation of publish button
      const publishBtn = screen.getByText(communityChannelsStrings.publishAction$());
      expect(publishBtn).toBeDisabled();

      // Select Deutsch
      // Use getAllByText and take first or iterate? Just click one.
      await fireEvent.click(screen.getAllByText(/Deutsch/i)[0]);

      // Add notes logic (required for Live)
      const notesInput = screen.getByLabelText(communityChannelsStrings.versionDescriptionLabel$());
      await fireEvent.update(notesInput, 'Notes');

      await waitFor(() => expect(publishBtn).toBeEnabled());
    });

    it('shows language dropdown if first time publishing a private channel, even if channel language exists in resources', async () => {
      Channel.languageExistsInResources.mockResolvedValue(true);
      renderComponent({
        currentChannel: { version: 0, language: 'en' },
      });
      await waitFor(() => expect(Channel.languageExistsInResources).toHaveBeenCalled());
      await waitFor(() =>
        expect(screen.getByText(communityChannelsStrings.languageLabel$())).toBeVisible(),
      );
    });

    it('shows language dropdown if first time publishing a ricecooker channel, even if channel language exists in resources', async () => {
      Channel.languageExistsInResources.mockResolvedValue(true);
      Channel.languagesInResources.mockResolvedValue(['de']);

      renderComponent({
        currentChannel: { ricecooker_version: 'v1', version: 0, language: 'en' },
      });
      await waitFor(() => expect(Channel.languageExistsInResources).toHaveBeenCalled());

      waitFor(() =>
        expect(screen.getByText(communityChannelsStrings.languageLabel$())).toBeVisible(),
      );
    });

    it('does not show language dropdown if not first time publishing and channel language exists in resources', async () => {
      Channel.languageExistsInResources.mockResolvedValue(true);
      renderComponent({
        currentChannel: { version: 1, language: 'en' },
      });
      await waitFor(() => expect(Channel.languageExistsInResources).toHaveBeenCalled());
      expect(screen.queryByText(communityChannelsStrings.languageLabel$())).not.toBeInTheDocument();
    });

    it('shows only channel language as only option if first time publishing and channel language exists in resources', async () => {
      Channel.languageExistsInResources.mockResolvedValue(true);
      renderComponent({
        currentChannel: { version: 0, language: 'en' },
      });
      await waitFor(() => expect(Channel.languageExistsInResources).toHaveBeenCalled());

      await waitFor(() =>
        expect(screen.getByText(communityChannelsStrings.languageLabel$())).toBeVisible(),
      );
      // Only English should be present
      // To be greater than 0 because KSelect duplicates this value twice
      await waitFor(() => expect(screen.getAllByText(/English/i).length).toBeGreaterThan(0));
      expect(screen.queryByText(/Deutsch/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Italiano/i)).not.toBeInTheDocument();
    });

    it('shows all resources languages as language options if channel language does not exist in resources', async () => {
      Channel.languageExistsInResources.mockResolvedValue(false);
      Channel.languagesInResources.mockResolvedValue(['de', 'it']);

      renderComponent({ currentChannel: { language: 'en', version: 1 } });
      await waitFor(() => expect(Channel.languagesInResources).toHaveBeenCalled());
      expect(screen.getByText(communityChannelsStrings.languageLabel$())).toBeVisible();

      await waitFor(() => expect(screen.getAllByText(/Deutsch/i).length).toBeGreaterThan(0));
      expect(screen.getAllByText(/Italiano/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/English/i)).not.toBeInTheDocument();
    });

    it('does not show current channel language as option if channel language does not exist in resources', async () => {
      Channel.languageExistsInResources.mockResolvedValue(false);
      Channel.languagesInResources.mockResolvedValue(['de']);

      renderComponent({ currentChannel: { language: 'en' } });
      await waitFor(() => expect(Channel.languagesInResources).toHaveBeenCalled());
      await waitFor(() => expect(screen.getAllByText(/Deutsch/i).length).toBeGreaterThan(0));
      expect(screen.queryByText(/English/i)).not.toBeInTheDocument();
    });

    it('shows only channel language as only option if no resources languages exist and channel language does not exist in resources', async () => {
      Channel.languageExistsInResources.mockResolvedValue(false);
      Channel.languagesInResources.mockResolvedValue([]);

      renderComponent({ currentChannel: { language: 'en' } });
      await waitFor(() => expect(Channel.languagesInResources).toHaveBeenCalled());

      expect(screen.getByText(communityChannelsStrings.languageLabel$())).toBeVisible();
      await waitFor(() => expect(screen.getAllByText(/English/i).length).toBeGreaterThan(0));
      expect(screen.queryByText(/Deutsch/i)).not.toBeInTheDocument();
    });
  });

  it('does not validate in DRAFT mode', async () => {
    renderComponent();

    // Switch to Draft
    const draftRadio = screen.getByRole('radio', { name: /Draft/i });
    await fireEvent.click(draftRadio);

    const saveDraftBtn = screen.getByText(communityChannelsStrings.saveDraft$());

    // Should be enabled even without notes
    expect(saveDraftBtn).toBeEnabled();
  });

  it('shows warning if incomplete resources exist', async () => {
    renderComponent({ errorCount: 5 });

    // Warning text: "5 incomplete resources"
    expect(
      screen.getByText(communityChannelsStrings.incompleteResourcesWarning$({ count: 5 })),
    ).toBeVisible();
  });

  it('submits DRAFT properly', async () => {
    renderComponent();

    // Switch to Draft
    const draftRadio = screen.getByRole('radio', { name: /Draft/i });
    await fireEvent.click(draftRadio);

    // Submit
    const saveBtn = screen.getByText(communityChannelsStrings.saveDraft$());
    await fireEvent.click(saveBtn);

    expect(Channel.publishDraft).toHaveBeenCalled();
  });

  it('calls forceServerSync when changes are not saved', async () => {
    renderComponent({ areAllChangesSaved: false });

    // Draft mode to submit quickly
    const draftRadio = screen.getByRole('radio', { name: /Draft/i });
    await fireEvent.click(draftRadio);

    const saveBtn = screen.getByText(communityChannelsStrings.saveDraft$());
    await fireEvent.click(saveBtn);

    expect(forceServerSync).toHaveBeenCalled();
  });

  it('submits LIVE properly', async () => {
    renderComponent();

    // Fill notes
    const notesInput = screen.getByLabelText(communityChannelsStrings.versionDescriptionLabel$());
    await fireEvent.update(notesInput, 'Ready to publish');

    // Submit
    const publishBtn = screen.getByText(communityChannelsStrings.publishAction$());
    await fireEvent.click(publishBtn);

    expect(Channel.publish).toHaveBeenCalledWith('channel-id', 'Ready to publish');
  });

  it('emits close on successful submission', async () => {
    const { emitted } = renderComponent();

    const notesInput = screen.getByLabelText(communityChannelsStrings.versionDescriptionLabel$());
    await fireEvent.update(notesInput, 'Ready to publish');

    const publishBtn = screen.getByText(communityChannelsStrings.publishAction$());
    await fireEvent.click(publishBtn);

    await waitFor(() => expect(emitted().close).toBeTruthy());
  });

  it('handles community library submission logic (Resubmit Modal)', async () => {
    CommunityLibrarySubmission.fetchCollection.mockResolvedValue({
      results: [{ channel_version: 5 }],
    });

    const { emitted } = renderComponent();

    const notesInput = screen.getByLabelText(communityChannelsStrings.versionDescriptionLabel$());
    await fireEvent.update(notesInput, 'Notes');

    const publishBtn = screen.getByText(communityChannelsStrings.publishAction$());
    await fireEvent.click(publishBtn);

    await waitFor(() => expect(CommunityLibrarySubmission.fetchCollection).toHaveBeenCalled());
    expect(emitted().showResubmitCommunityLibraryModal).toBeTruthy();
    expect(emitted().showResubmitCommunityLibraryModal[0][0]).toEqual({
      channel: expect.objectContaining({ id: 'channel-id' }),
      latestSubmissionVersion: 5,
    });
  });

  it('updates channel language if changed during submit', async () => {
    Channel.languageExistsInResources.mockResolvedValue(false);
    Channel.languagesInResources.mockResolvedValue(['de']);

    renderComponent({
      currentChannel: { language: 'en' },
    });

    await waitFor(() => expect(Channel.languagesInResources).toHaveBeenCalled());

    await waitFor(() => expect(screen.getAllByText(/Deutsch/i).length).toBeGreaterThan(0));

    // Select Deutsch
    await fireEvent.click(screen.getAllByText(/Deutsch/i)[0]);

    const notesInput = screen.getByLabelText(communityChannelsStrings.versionDescriptionLabel$());
    await fireEvent.update(notesInput, 'Notes');

    const publishBtn = screen.getByText(communityChannelsStrings.publishAction$());
    await fireEvent.click(publishBtn);

    // Check that current channel in the store was updated with new language
    await waitFor(() => {
      const updatedChannel = store.getters['currentChannel/currentChannel'];
      expect(updatedChannel.language).toBe('de');
    });
    await waitFor(() => {
      expect(Channel.publish).toHaveBeenCalled();
    });
  });

  it('handles error during submit', async () => {
    Channel.publish.mockRejectedValue({ response: { status: 500 } });

    renderComponent();

    const notesInput = screen.getByLabelText(communityChannelsStrings.versionDescriptionLabel$());
    await fireEvent.update(notesInput, 'Notes');

    const publishBtn = screen.getByText(communityChannelsStrings.publishAction$());
    await fireEvent.click(publishBtn);

    // Wait for fullPageError to be set in the store, it is in store.state.errors.fullPageError
    await waitFor(() => {
      const fullPageError = store.state.errors.fullPageError;
      expect(fullPageError).toBeTruthy();
    });
  });

  it('closes panel when cancel is clicked', async () => {
    const { emitted } = renderComponent();
    const cancelBtn = screen.getByText(communityChannelsStrings.cancelAction$());
    await fireEvent.click(cancelBtn);
    expect(emitted().close).toBeTruthy();
  });

  it('renders ChannelVersionHistory component', () => {
    renderComponent();
    expect(screen.getByText(communityChannelsStrings.seeAllVersions$())).toBeInTheDocument();
  });
});
