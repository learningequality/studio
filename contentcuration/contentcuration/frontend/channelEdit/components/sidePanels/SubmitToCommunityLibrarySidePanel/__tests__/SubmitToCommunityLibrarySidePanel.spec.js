import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { factory } from '../../../../store';

import SubmitToCommunityLibrarySidePanel from '../';
import Box from '../Box.vue';
import StatusChip from '../StatusChip.vue';

import { usePublishedData } from '../composables/usePublishedData';
import { useLatestCommunityLibrarySubmission } from '../composables/useLatestCommunityLibrarySubmission';
import { Categories, CommunityLibraryStatus } from 'shared/constants';
import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
import { CommunityLibrarySubmission } from 'shared/data/resources';
import CountryField from 'shared/views/form/CountryField.vue';

jest.mock('../composables/usePublishedData');
jest.mock('../composables/useLatestCommunityLibrarySubmission');
jest.mock('../composables/useLicenseAudit');
jest.mock('shared/data/resources', () => ({
  CommunityLibrarySubmission: {
    create: jest.fn(() => Promise.resolve()),
  },
  Channel: {
    fetchModel: jest.fn(),
    getCatalogChannel: jest.fn(() => Promise.resolve()),
  },
}));

const store = factory();

const { nonePrimaryInfo$, flaggedPrimaryInfo$, approvedPrimaryInfo$, submittedPrimaryInfo$ } =
  communityChannelsStrings;

async function makeWrapper({ channel, publishedData, latestSubmission }) {
  const isLoading = ref(true);
  const isFinished = ref(false);
  const fetchPublishedData = jest.fn(() => Promise.resolve());
  const fetchLatestSubmission = jest.fn(() => Promise.resolve());

  store.state.currentChannel.currentChannelId = channel.id;
  store.commit('channel/ADD_CHANNEL', channel);

  usePublishedData.mockReturnValue({
    isLoading,
    isFinished,
    data: computed(() => publishedData),
    fetchData: fetchPublishedData,
  });

  useLatestCommunityLibrarySubmission.mockReturnValue({
    isLoading,
    isFinished,
    data: computed(() => latestSubmission),
    fetchData: fetchLatestSubmission,
  });

  const wrapper = mount(SubmitToCommunityLibrarySidePanel, {
    store,
    propsData: {
      channel,
    },
  });

  // To simmulate that first the data is loading and then it finishes loading
  // and correctly trigger watchers depending on that
  await wrapper.vm.$nextTick();

  isLoading.value = false;
  isFinished.value = true;

  await wrapper.vm.$nextTick();

  return wrapper;
}

const publishedNonPublicChannel = {
  id: 'published-non-public-channel',
  version: 2,
  name: 'Published Non-Public Channel',
  published: true,
  public: false,
};

const publicChannel = {
  id: 'public-channel',
  version: 2,
  name: 'Public Channel',
  published: true,
  public: true,
};

const nonPublishedChannel = {
  id: 'non-published-channel',
  version: 0,
  name: 'Non-public Channel',
  published: false,
  public: false,
};

const publishedData = {
  version: 2,
  included_languages: ['en', null],
  included_licenses: [1],
  included_categories: [Categories.SCHOOL],
};

const submittedLatestSubmission = { channel_version: 2, status: CommunityLibraryStatus.PENDING };

describe('SubmitToCommunityLibrarySidePanel', () => {
  beforeEach(() => {
    store.state.currentChannel.currentChannelId = null;
    store.state.channel.channelsMap = {};
  });
  describe('correct warnings are shown', () => {
    it('when channel is published, not public and not submitted', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: null,
      });

      const warningBoxes = wrapper
        .findAllComponents(Box)
        .filter(box => box.props('kind') === 'warning');
      expect(warningBoxes.length).toBe(0);
    });

    it('when channel is public', async () => {
      const wrapper = await makeWrapper({
        channel: publicChannel,
        publishedData,
        latestSubmission: null,
      });

      const warningBoxes = wrapper
        .findAllComponents(Box)
        .filter(box => box.props('kind') === 'warning');
      expect(warningBoxes.length).toBe(1);
      const warningBox = warningBoxes.wrappers[0];
      expect(warningBox.attributes('data-test')).toBe('public-warning');
    });

    it('when channel is not published', async () => {
      const wrapper = await makeWrapper({
        channel: nonPublishedChannel,
        publishedData: null,
        latestSubmission: null,
      });

      const warningBoxes = wrapper
        .findAllComponents(Box)
        .filter(box => box.props('kind') === 'warning');
      expect(warningBoxes.length).toBe(1);
      const warningBox = warningBoxes.wrappers[0];
      expect(warningBox.attributes('data-test')).toBe('not-published-warning');
    });

    it('when current version of channel is already submitted', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: submittedLatestSubmission,
      });

      const warningBoxes = wrapper
        .findAllComponents(Box)
        .filter(box => box.props('kind') === 'warning');
      expect(warningBoxes.length).toBe(1);
      const warningBox = warningBoxes.wrappers[0];
      expect(warningBox.attributes('data-test')).toBe('already-submitted-warning');
    });
  });

  describe('correct info is shown in the info box', () => {
    it('when this is the first submission', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: null,
      });

      const infoSection = wrapper.find('.info-section');
      expect(infoSection.exists()).toBe(true);
      expect(infoSection.text()).toContain(nonePrimaryInfo$());
    });

    it('when the previous submission was rejected', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: { channel_version: 1, status: CommunityLibraryStatus.REJECTED },
      });

      const infoSection = wrapper.find('.info-section');
      expect(infoSection.exists()).toBe(true);
      expect(infoSection.text()).toContain(flaggedPrimaryInfo$());
    });

    it('when the previous submission was approved', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: { channel_version: 1, status: CommunityLibraryStatus.APPROVED },
      });

      const infoSection = wrapper.find('.info-section');
      expect(infoSection.exists()).toBe(true);
      expect(infoSection.text()).toContain(approvedPrimaryInfo$());
    });

    it('when the previous submission is pending', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: { channel_version: 1, status: CommunityLibraryStatus.PENDING },
      });

      const infoSection = wrapper.find('.info-section');
      expect(infoSection.exists()).toBe(true);
      expect(infoSection.text()).toContain(submittedPrimaryInfo$());
    });
  });

  describe('show more button', () => {
    it('is displayed when this is the first submission', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: null,
      });

      const moreDetailsButton = wrapper.find('[data-test="more-details-button"]');
      expect(moreDetailsButton.exists()).toBe(true);
    });

    it('is not displayed when there are previous submissions', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: { channel_version: 1, status: CommunityLibraryStatus.APPROVED },
      });

      const moreDetailsButton = wrapper.find('[data-test="more-details-button"]');
      expect(moreDetailsButton.exists()).toBe(false);
    });

    it('when clicked, shows additional info', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: null,
      });

      const infoText = wrapper.find('.info-text');
      expect(infoText.text()).not.toContain('The Kolibri Community Library features channels');

      const moreDetailsButton = wrapper.find('[data-test="more-details-button"]');
      await moreDetailsButton.trigger('click');

      expect(infoText.text()).toContain('The Kolibri Community Library features channels');

      const lessDetailsButton = wrapper.find('[data-test="less-details-button"]');
      expect(lessDetailsButton.exists()).toBe(true);
    });
  });

  describe('publishing state', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('disables form and shows loader when channel is publishing', async () => {
      const channel = { ...publishedNonPublicChannel, publishing: true };
      const wrapper = await makeWrapper({ channel, publishedData, latestSubmission: null });

      // Loader/message container should exist
      expect(wrapper.find('.publishing-loader').exists()).toBe(true);

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      expect(descriptionTextbox.exists()).toBe(false);
      const submitButton = wrapper.find('[data-test="submit-button"]');
      expect(submitButton.exists()).toBe(false);
    });

    it('enables form after publishing flips to false (poll-driven)', async () => {
      const { Channel } = require('shared/data/resources');
      Channel.fetchModel.mockResolvedValue({
        id: publishedNonPublicChannel.id,
        publishing: false,
        version: 3,
      });

      const channel = { ...publishedNonPublicChannel, publishing: true };
      const publishedDataWithVersion3 = {
        version: 3,
        included_languages: ['en', null],
        included_licenses: [1],
        included_categories: [Categories.SCHOOL],
      };
      const wrapper = await makeWrapper({
        channel,
        publishedData: publishedDataWithVersion3,
        latestSubmission: null,
      });

      const updatedChannel = { ...channel, publishing: false, version: 3 };
      await wrapper.setProps({ channel: updatedChannel });
      store.commit('channel/ADD_CHANNEL', updatedChannel);

      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      expect(descriptionTextbox.props('disabled')).toBe(false);

      await descriptionTextbox.vm.$emit('input', 'Some description');
      await wrapper.vm.$nextTick();
      const submitButton = wrapper.find('[data-test="submit-button"]');
      expect(submitButton.attributes('disabled')).toBeUndefined();
    });
  });

  describe('show less button', () => {
    it('is displayed when additional info is shown', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: null,
      });

      const moreDetails = wrapper.find('[data-test="more-details"]');
      expect(moreDetails.exists()).toBe(false);

      let lessDetailsButton = wrapper.find('[data-test="less-details-button"]');
      expect(lessDetailsButton.exists()).toBe(false);

      const moreDetailsButton = wrapper.find('[data-test="more-details-button"]');
      await moreDetailsButton.trigger('click');

      lessDetailsButton = wrapper.find('[data-test="less-details-button"]');
      expect(lessDetailsButton.exists()).toBe(true);
    });

    it('when clicked, hides additional info', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: null,
      });

      let moreDetails = wrapper.find('[data-test="more-details"]');
      expect(moreDetails.exists()).toBe(false);

      const moreDetailsButton = wrapper.find('[data-test="more-details-button"]');
      await moreDetailsButton.trigger('click');

      let lessDetailsButton = wrapper.find('[data-test="less-details-button"]');
      expect(lessDetailsButton.exists()).toBe(true);
      await lessDetailsButton.trigger('click');

      moreDetails = wrapper.find('[data-test="more-details"]');
      expect(moreDetails.exists()).toBe(false);

      lessDetailsButton = wrapper.find('[data-test="less-details-button"]');
      expect(lessDetailsButton.exists()).toBe(false);
    });
  });

  describe('submission status chip', () => {
    it('is not displayed when there are no submissions', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: null,
      });

      const statusChip = wrapper.findAllComponents(StatusChip);
      expect(statusChip.exists()).toBe(false);
    });

    function testStatusChip(submissionStatus, chipStatus) {
      it(`is displayed correctly when status is ${submissionStatus}`, async () => {
        const wrapper = await makeWrapper({
          channel: publishedNonPublicChannel,
          publishedData,
          latestSubmission: { channel_version: 1, status: submissionStatus },
        });

        const statusChip = wrapper.findComponent(StatusChip);
        expect(statusChip.props('status')).toBe(chipStatus);
      });
    }

    testStatusChip(CommunityLibraryStatus.APPROVED, CommunityLibraryStatus.APPROVED);
    testStatusChip(CommunityLibraryStatus.LIVE, CommunityLibraryStatus.APPROVED);
    testStatusChip(CommunityLibraryStatus.REJECTED, CommunityLibraryStatus.REJECTED);
    testStatusChip(CommunityLibraryStatus.PENDING, CommunityLibraryStatus.PENDING);
  });

  it('is editable when channel is published, not public and not submitted', async () => {
    const wrapper = await makeWrapper({
      channel: publishedNonPublicChannel,
      publishedData,
      latestSubmission: null,
    });

    const descriptionTextbox = wrapper.findComponent('.description-textbox');
    expect(descriptionTextbox.props('disabled')).toBe(false);
  });

  describe('is not editable', () => {
    it('when channel is public', async () => {
      const wrapper = await makeWrapper({
        channel: publicChannel,
        publishedData,
        latestSubmission: null,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      expect(descriptionTextbox.props('disabled')).toBe(true);
    });

    it('when channel is not published', async () => {
      const wrapper = await makeWrapper({
        channel: nonPublishedChannel,
        publishedData: null,
        latestSubmission: null,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      expect(descriptionTextbox.props('disabled')).toBe(true);
    });

    it('when current version of channel is already submitted', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: submittedLatestSubmission,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      expect(descriptionTextbox.props('disabled')).toBe(true);
    });
  });

  describe('submit button', () => {
    describe('is disabled', () => {
      it('when channel is public', async () => {
        const wrapper = await makeWrapper({
          channel: publicChannel,
          publishedData,
          latestSubmission: null,
        });

        const submitButton = wrapper.find('[data-test="submit-button"]');
        expect(submitButton.props('disabled')).toBe(true);
      });

      it('when channel is not published', async () => {
        const wrapper = await makeWrapper({
          channel: nonPublishedChannel,
          publishedData: null,
          latestSubmission: null,
        });

        const submitButton = wrapper.find('[data-test="submit-button"]');
        expect(submitButton.props('disabled')).toBe(true);
      });

      it('when current version of channel is already submitted', async () => {
        const wrapper = await makeWrapper({
          channel: publishedNonPublicChannel,
          publishedData,
          latestSubmission: submittedLatestSubmission,
        });

        const submitButton = wrapper.find('[data-test="submit-button"]');
        expect(submitButton.props('disabled')).toBe(true);
      });

      it('when no description is provided', async () => {
        const wrapper = await makeWrapper({
          channel: publishedNonPublicChannel,
          publishedData,
          latestSubmission: null,
        });

        const submitButton = wrapper.find('[data-test="submit-button"]');
        expect(submitButton.props('disabled')).toBe(true);
      });
    });

    it('is enabled when channel is published, not public, not submitted and description is provided', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: null,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      await descriptionTextbox.vm.$emit('input', 'Some description');

      const submitButton = wrapper.find('[data-test="submit-button"]');
      expect(submitButton.props('disabled')).toBe(false);
    });
  });

  it('cancel button emits close event', async () => {
    const wrapper = await makeWrapper({
      channel: publishedNonPublicChannel,
      publishedData,
      latestSubmission: null,
    });

    const cancelButton = wrapper.find('[data-test="cancel-button"]');
    await cancelButton.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  describe('when submit button is clicked', () => {
    beforeEach(() => {
      CommunityLibrarySubmission.create.mockClear();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('the panel closes', async () => {
      jest.useFakeTimers();
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: null,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      await descriptionTextbox.vm.$emit('input', 'Some description');

      const submitButton = wrapper.find('[data-test="submit-button"]');
      await submitButton.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
      jest.useRealTimers();
    });

    it('a submission snackbar is shown', async () => {
      jest.useFakeTimers();
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: null,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      await descriptionTextbox.vm.$emit('input', 'Some description');

      const submitButton = wrapper.find('[data-test="submit-button"]');
      await submitButton.trigger('click');
      await wrapper.vm.$nextTick();

      expect(store.getters['snackbarIsVisible']).toBe(true);
      expect(CommunityLibrarySubmission.create).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('the submission is created after a timeout', async () => {
      jest.useFakeTimers();
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: null,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      await descriptionTextbox.vm.$emit('input', 'Some description');

      const countryField = wrapper.findComponent(CountryField);
      await countryField.vm.$emit('input', ['Czech Republic']);
      await wrapper.vm.$nextTick();

      const submitButton = wrapper.find('[data-test="submit-button"]');
      await submitButton.trigger('click');
      await wrapper.vm.$nextTick();

      jest.runAllTimers();
      await wrapper.vm.$nextTick();

      expect(CommunityLibrarySubmission.create).toHaveBeenCalledWith({
        description: 'Some description',
        channel: publishedNonPublicChannel.id,
        countries: ['CZ'],
        categories: [Categories.SCHOOL],
      });
      jest.useRealTimers();
    });
  });

  describe('when a previous submission exists', () => {
    it('the previously selected countries are pre-filled', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        latestSubmission: {
          channel_version: 1,
          status: CommunityLibraryStatus.REJECTED,
          countries: ['CZ'],
        },
      });

      const countryField = wrapper.findComponent(CountryField);
      expect(countryField.props('value')).toEqual(['Czech Republic']);
    });
  });
});
