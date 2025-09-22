import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { factory } from '../../../../store';

import SubmitToCommunityLibrarySidePanel from '../';
import Box from '../Box.vue';
import StatusChip from '../StatusChip.vue';

import { usePublishedData } from '../composables/usePublishedData';
import { useCommunityLibrarySubmissions } from '../composables/useCommunityLibrarySubmissions';
import { Categories, CommunityLibraryStatus } from 'shared/constants';
import { CommunityLibrarySubmission } from 'shared/data/resources';
import CountryField from 'shared/views/form/CountryField.vue';

jest.mock('../composables/usePublishedData', () => ({
  usePublishedData: jest.fn(),
}));
jest.mock('../composables/useCommunityLibrarySubmissions', () => ({
  useCommunityLibrarySubmissions: jest.fn(),
}));
jest.mock('shared/data/resources', () => ({
  CommunityLibrarySubmission: {
    create: jest.fn(() => Promise.resolve()),
  },
}));

const store = factory();

async function makeWrapper({ channel, publishedData, submissionsData }) {
  const isLoading = ref(true);
  const isFinished = ref(false);

  usePublishedData.mockReturnValue({
    isLoading,
    isFinished,
    data: computed(() => publishedData),
  });

  useCommunityLibrarySubmissions.mockReturnValue({
    isLoading,
    isFinished,
    data: computed(() => submissionsData),
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
  id: 'published-non-public-channel',
  version: 2,
  name: 'Published Non-Public Channel',
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
  2: {
    included_languages: ['en', null],
    included_licenses: [1],
    included_categories: [Categories.SCHOOL],
  },
  1: {
    included_languages: ['en', null],
    included_licenses: [1],
    included_categories: [Categories.SCHOOL],
  },
};

const notSubmittedSubmissionsData = [];
const submittedSubmissionsData = [{ channel_version: 2, status: CommunityLibraryStatus.PENDING }];

describe('SubmitToCommunityLibrarySidePanel', () => {
  describe('correct warnings are shown', () => {
    it('when channel is published, not public and not submitted', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: notSubmittedSubmissionsData,
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
        submissionsData: notSubmittedSubmissionsData,
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
        publishedData: {},
        submissionsData: notSubmittedSubmissionsData,
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
        submissionsData: submittedSubmissionsData,
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
        submissionsData: notSubmittedSubmissionsData,
      });

      const infoBoxes = wrapper.findAllComponents(Box).filter(box => box.props('kind') === 'info');
      expect(infoBoxes.length).toBe(1);
      const infoBox = infoBoxes.wrappers[0];
      expect(infoBox.text()).toContain(wrapper.vm.$tr('nonePrimaryInfo'));
    });

    it('when the previous submission was rejected', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: [{ channel_version: 1, status: CommunityLibraryStatus.REJECTED }],
      });

      const infoBoxes = wrapper.findAllComponents(Box).filter(box => box.props('kind') === 'info');
      expect(infoBoxes.length).toBe(1);
      const infoBox = infoBoxes.wrappers[0];
      expect(infoBox.text()).toContain(wrapper.vm.$tr('flaggedPrimaryInfo'));
    });

    it('when the previous submission was approved', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: [{ channel_version: 1, status: CommunityLibraryStatus.APPROVED }],
      });

      const infoBoxes = wrapper.findAllComponents(Box).filter(box => box.props('kind') === 'info');
      expect(infoBoxes.length).toBe(1);
      const infoBox = infoBoxes.wrappers[0];
      expect(infoBox.text()).toContain(wrapper.vm.$tr('approvedPrimaryInfo'));
      expect(infoBox.text()).toContain(wrapper.vm.$tr('reviewersWillSeeLatestFirst'));
    });

    it('when the previous submission is pending', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: [{ channel_version: 1, status: CommunityLibraryStatus.PENDING }],
      });

      const infoBoxes = wrapper.findAllComponents(Box).filter(box => box.props('kind') === 'info');
      expect(infoBoxes.length).toBe(1);
      const infoBox = infoBoxes.wrappers[0];
      expect(infoBox.text()).toContain(wrapper.vm.$tr('submittedPrimaryInfo'));
      expect(infoBox.text()).toContain(wrapper.vm.$tr('reviewersWillSeeLatestFirst'));
    });
  });

  describe('show more button', () => {
    it('is displayed when this is the first submission', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: notSubmittedSubmissionsData,
      });

      const moreDetailsButton = wrapper.find('[data-test="more-details-button"]');
      expect(moreDetailsButton.exists()).toBe(true);
    });

    it('is not displayed when there are previous submissions', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: [{ channel_version: 1, status: CommunityLibraryStatus.APPROVED }],
      });

      const moreDetailsButton = wrapper.find('[data-test="more-details-button"]');
      expect(moreDetailsButton.exists()).toBe(false);
    });

    it('when clicked, shows additional info', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: notSubmittedSubmissionsData,
      });

      let moreDetails = wrapper.find('[data-test="more-details"]');
      expect(moreDetails.exists()).toBe(false);

      let moreDetailsButton = wrapper.find('[data-test="more-details-button"]');
      await moreDetailsButton.trigger('click');

      moreDetails = wrapper.find('.more-details-text');
      expect(moreDetails.exists()).toBe(true);

      moreDetailsButton = wrapper.find('[data-test="more-details-button"]');
      expect(moreDetailsButton.exists()).toBe(false);
    });
  });

  describe('show less button', () => {
    it('is displayed when additional info is shown', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: notSubmittedSubmissionsData,
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
        submissionsData: notSubmittedSubmissionsData,
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
        submissionsData: notSubmittedSubmissionsData,
      });

      const statusChip = wrapper.findAllComponents(StatusChip);
      expect(statusChip.exists()).toBe(false);
    });

    function testStatusChip(submissionStatus, chipStatus) {
      it(`is displayed correctly when status is ${submissionStatus}`, async () => {
        const wrapper = await makeWrapper({
          channel: publishedNonPublicChannel,
          publishedData,
          submissionsData: [{ channel_version: 1, status: submissionStatus }],
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
      submissionsData: notSubmittedSubmissionsData,
    });

    const descriptionTextbox = wrapper.findComponent('.description-textbox');
    expect(descriptionTextbox.props('disabled')).toBe(false);
  });

  describe('is not editable', () => {
    it('when channel is public', async () => {
      const wrapper = await makeWrapper({
        channel: publicChannel,
        publishedData,
        submissionsData: notSubmittedSubmissionsData,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      expect(descriptionTextbox.props('disabled')).toBe(true);
    });

    it('when channel is not published', async () => {
      const wrapper = await makeWrapper({
        channel: nonPublishedChannel,
        publishedData: {},
        submissionsData: notSubmittedSubmissionsData,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      expect(descriptionTextbox.props('disabled')).toBe(true);
    });

    it('when current version of channel is already submitted', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: submittedSubmissionsData,
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
          submissionsData: notSubmittedSubmissionsData,
        });

        const submitButton = wrapper.find('[data-test="submit-button"]');
        expect(submitButton.props('disabled')).toBe(true);
      });

      it('when channel is not published', async () => {
        const wrapper = await makeWrapper({
          channel: nonPublishedChannel,
          publishedData: {},
          submissionsData: notSubmittedSubmissionsData,
        });

        const submitButton = wrapper.find('[data-test="submit-button"]');
        expect(submitButton.props('disabled')).toBe(true);
      });

      it('when current version of channel is already submitted', async () => {
        const wrapper = await makeWrapper({
          channel: publishedNonPublicChannel,
          publishedData,
          submissionsData: submittedSubmissionsData,
        });

        const submitButton = wrapper.find('[data-test="submit-button"]');
        expect(submitButton.props('disabled')).toBe(true);
      });

      it('when no description is provided', async () => {
        const wrapper = await makeWrapper({
          channel: publishedNonPublicChannel,
          publishedData,
          submissionsData: notSubmittedSubmissionsData,
        });

        const submitButton = wrapper.find('[data-test="submit-button"]');
        expect(submitButton.props('disabled')).toBe(true);
      });
    });

    it('is enabled when channel is published, not public, not submitted and description is provided', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: notSubmittedSubmissionsData,
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
      submissionsData: notSubmittedSubmissionsData,
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
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: notSubmittedSubmissionsData,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      await descriptionTextbox.vm.$emit('input', 'Some description');

      const submitButton = wrapper.find('[data-test="submit-button"]');
      await submitButton.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('a submission snackbar is shown', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: notSubmittedSubmissionsData,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      await descriptionTextbox.vm.$emit('input', 'Some description');

      const submitButton = wrapper.find('[data-test="submit-button"]');
      await submitButton.trigger('click');

      jest.useFakeTimers();

      expect(store.getters['snackbarIsVisible']).toBe(true);
      expect(CommunityLibrarySubmission.create).not.toHaveBeenCalled();
    });

    it('the submission is created after a timeout', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: notSubmittedSubmissionsData,
      });

      const descriptionTextbox = wrapper.findComponent('.description-textbox');
      await descriptionTextbox.vm.$emit('input', 'Some description');

      const countryField = wrapper.findComponent(CountryField);
      await countryField.vm.$emit('input', ['Czech Republic']);

      jest.useFakeTimers();

      const submitButton = wrapper.find('[data-test="submit-button"]');
      await submitButton.trigger('click');

      jest.runAllTimers();

      expect(CommunityLibrarySubmission.create).toHaveBeenCalledWith({
        description: 'Some description',
        channel: publishedNonPublicChannel.id,
        countries: ['CZ'],
        categories: [Categories.SCHOOL],
      });
    });
  });

  describe('when a previous submission exists', () => {
    it('the previously selected countries are pre-filled', async () => {
      const wrapper = await makeWrapper({
        channel: publishedNonPublicChannel,
        publishedData,
        submissionsData: [
          { channel_version: 1, status: CommunityLibraryStatus.REJECTED, countries: ['CZ'] },
        ],
      });

      const countryField = wrapper.findComponent(CountryField);
      expect(countryField.props('value')).toEqual(['Czech Republic']);
    });
  });
});
