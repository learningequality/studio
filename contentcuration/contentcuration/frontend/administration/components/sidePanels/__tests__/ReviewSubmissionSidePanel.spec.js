import Vue from 'vue';
import { mount } from '@vue/test-utils';
import { factory } from '../../../store';
import router from '../../../router';

import ReviewSubmissionSidePanel from '../ReviewSubmissionSidePanel';
import {
  Categories,
  CommunityLibraryResolutionReason,
  CommunityLibraryStatus,
} from 'shared/constants';
import { ChannelVersion, AdminCommunityLibrarySubmission } from 'shared/data/resources';
import CommunityLibraryStatusChip from 'shared/views/communityLibrary/CommunityLibraryStatusChip.vue';

jest.mock('shared/data/resources', () => ({
  AdminCommunityLibrarySubmission: {
    fetchModel: jest.fn(),
    resolve: jest.fn(() => Promise.resolve()),
  },
  ChannelVersion: {
    fetchCollection: jest.fn(),
  },
  AuditedSpecialPermissionsLicense: {
    fetchCollection: jest.fn(() => Promise.resolve([])),
  },
}));

const store = factory();

async function makeWrapper({ channel, latestSubmission, submissionFetch }) {
  AdminCommunityLibrarySubmission.fetchModel.mockImplementation(
    submissionFetch ||
      (() => {
        return Promise.resolve(latestSubmission);
      }),
  );

  ChannelVersion.fetchCollection.mockImplementation(() => {
    return Promise.resolve([channelVersionData]);
  });

  const wrapper = mount(ReviewSubmissionSidePanel, {
    store,
    router,
    propsData: {
      channel,
    },
    mocks: {
      $formatRelative: data =>
        Vue.prototype.$formatRelative(data, { now: new Date('2024-01-01T00:15:00Z') }),
    },
  });

  // To simulate that first the data is loading and then it finishes loading
  // and correctly trigger watchers depending on that
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();

  return wrapper;
}

const channelCommon = {
  id: 'channel-id',
  name: 'Test Channel',
  published_data: {
    1: {
      included_languages: ['en'],
      included_licenses: [1],
      included_categories: [Categories.SCHOOL],
    },
    2: {
      included_languages: ['en', 'cs'],
      included_licenses: [1, 2],
      included_categories: [Categories.SCHOOL, Categories.ALGEBRA],
    },
    3: {
      included_languages: ['en'],
      included_licenses: [1],
      included_categories: [Categories.SCHOOL],
    },
  },
  version: 3,
};

const submissionCommon = {
  id: 'submission-id',
  author_name: 'Test Author',
  description: 'Author description',
  date_created: '2024-01-01T00:00:00Z',
  channel_name: 'Test Channel',
  channel_version: 2,
  countries: ['US', 'CZ'],
  categories: [Categories.SCHOOL, Categories.ALGEBRA],
  resolution_reason: null,
  feedback_notes: null,
  internal_notes: null,
};

const channelVersionData = channelCommon.published_data[submissionCommon.channel_version];

const testData = {
  submitted: {
    channel: {
      ...channelCommon,
      latest_community_library_submission_status: CommunityLibraryStatus.PENDING,
    },
    submission: {
      ...submissionCommon,
      status: CommunityLibraryStatus.PENDING,
    },
  },
  approved: {
    channel: {
      ...channelCommon,
      latest_community_library_submission_status: CommunityLibraryStatus.APPROVED,
    },
    submission: {
      ...submissionCommon,
      status: CommunityLibraryStatus.APPROVED,
      feedback_notes: 'Feedback notes',
      internal_notes: 'Internal notes',
    },
  },
  flagged: {
    channel: {
      ...channelCommon,
      latest_community_library_submission_status: CommunityLibraryStatus.REJECTED,
    },
    submission: {
      ...submissionCommon,
      status: CommunityLibraryStatus.REJECTED,
      resolution_reason: CommunityLibraryResolutionReason.PORTABILITY_ISSUES,
      feedback_notes: 'Feedback notes',
      internal_notes: 'Internal notes',
    },
  },
};

describe('ReviewSubmissionSidePanel', () => {
  it('submission data is prefilled', async () => {
    const { channel, submission } = testData.flagged;
    const wrapper = await makeWrapper({ channel, latestSubmission: submission });

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.author-name').text()).toBe(submission.author_name);
    expect(wrapper.find('.channel-link').text()).toBe(
      `${channel.name} v${submission.channel_version}`,
    );
    expect(wrapper.find('[data-test="submission-date"]').text()).toBe('15 minutes ago');
    expect(wrapper.find('[data-test="countries"]').text()).toBe(
      'United States of America, Czech Republic',
    );
    expect(wrapper.find('[data-test="languages"]').text()).toBe('English, Czech');
    expect(wrapper.find('[data-test="categories"]').text()).toBe('School, Algebra');
    expect(wrapper.find('[data-test="licenses"]').text()).toBe('CC BY, CC BY-SA');
    expect(wrapper.findComponent(CommunityLibraryStatusChip).attributes('status')).toEqual(
      submission.status,
    );
    expect(wrapper.find('[data-test="submission-notes"]').text()).toBe(submission.description);
    expect(wrapper.find(`input[type="radio"][value="${submission.status}"]`).element.checked).toBe(
      true,
    );
    expect(wrapper.findComponent({ ref: 'flagReasonSelectRef' }).vm.value.value).toBe(
      submission.resolution_reason,
    );
    expect(wrapper.findComponent({ ref: 'editorNotesRef' }).vm.value).toBe(
      submission.feedback_notes,
    );
    expect(wrapper.findComponent({ ref: 'personalNotesRef' }).vm.value).toBe(
      submission.internal_notes,
    );
  });

  describe('resolution reason is', () => {
    it('displayed when selected status is flagged', async () => {
      const { channel, submission } = testData.flagged;
      const wrapper = await makeWrapper({ channel, latestSubmission: submission });

      expect(wrapper.findComponent({ ref: 'flagReasonSelectRef' }).exists()).toBe(true);
    });

    it('hidden when selected status is approved', async () => {
      const { channel, submission } = testData.approved;
      const wrapper = await makeWrapper({ channel, latestSubmission: submission });

      expect(wrapper.findComponent({ ref: 'flagReasonSelectRef' }).exists()).toBe(false);
    });

    it('hidden when selected status is submitted', async () => {
      const { channel, submission } = testData.submitted;
      const wrapper = await makeWrapper({ channel, latestSubmission: submission });

      expect(wrapper.findComponent({ ref: 'flagReasonSelectRef' }).exists()).toBe(false);
    });
  });

  it('is editable when loading latest submission data has finished and when the submission state is submitted', async () => {
    const { channel, submission } = testData.submitted;
    const wrapper = await makeWrapper({ channel, latestSubmission: submission });

    const flagForReviewRadio = wrapper.find(
      `input[type="radio"][value="${CommunityLibraryStatus.REJECTED}"]`,
    );
    await flagForReviewRadio.trigger('click');

    expect(flagForReviewRadio.attributes('disabled')).toBeFalsy();
    expect(wrapper.findComponent({ ref: 'flagReasonSelectRef' }).props('disabled')).toBe(false);
    expect(wrapper.findComponent({ ref: 'editorNotesRef' }).props('disabled')).toBe(false);
    expect(wrapper.findComponent({ ref: 'personalNotesRef' }).props('disabled')).toBe(false);
  });

  describe('is not editable', () => {
    it('when submission data is still loading', async () => {
      const { channel } = testData.submitted;
      const mockSubmissionFetch = () => {
        return new Promise(() => {
          // Never resolves to simulate loading state
        });
      };
      const wrapper = await makeWrapper({ channel, submissionFetch: mockSubmissionFetch });

      await wrapper.vm.$nextTick();

      const flagForReviewRadio = wrapper.find(
        `input[type="radio"][value="${CommunityLibraryStatus.REJECTED}"]`,
      );
      await flagForReviewRadio.trigger('click');

      expect(flagForReviewRadio.attributes('disabled')).toBeTruthy();
      expect(wrapper.findComponent({ ref: 'editorNotesRef' }).props('disabled')).toBe(true);
      expect(wrapper.findComponent({ ref: 'personalNotesRef' }).props('disabled')).toBe(true);
    });

    it('when the submission is approved', async () => {
      const { channel, submission } = testData.approved;
      const wrapper = await makeWrapper({ channel, latestSubmission: submission });

      const flagForReviewRadio = wrapper.find(
        `input[type="radio"][value="${CommunityLibraryStatus.REJECTED}"]`,
      );
      await flagForReviewRadio.trigger('click');

      expect(flagForReviewRadio.attributes('disabled')).toBeTruthy();
      expect(wrapper.findComponent({ ref: 'editorNotesRef' }).props('disabled')).toBe(true);
      expect(wrapper.findComponent({ ref: 'personalNotesRef' }).props('disabled')).toBe(true);
    });

    it('when the submission is flagged', async () => {
      const { channel, submission } = testData.flagged;
      const wrapper = await makeWrapper({ channel, latestSubmission: submission });

      const flagForReviewRadio = wrapper.find(
        `input[type="radio"][value="${CommunityLibraryStatus.REJECTED}"]`,
      );
      await flagForReviewRadio.trigger('click');

      expect(flagForReviewRadio.attributes('disabled')).toBeTruthy();
      expect(wrapper.findComponent({ ref: 'editorNotesRef' }).props('disabled')).toBe(true);
      expect(wrapper.findComponent({ ref: 'personalNotesRef' }).props('disabled')).toBe(true);
    });
  });

  describe('can be submitted', () => {
    it('when selected status is approved', async () => {
      const { channel, submission } = testData.submitted;
      const wrapper = await makeWrapper({ channel, latestSubmission: submission });

      const approveRadio = wrapper.find(
        `input[type="radio"][value="${CommunityLibraryStatus.APPROVED}"]`,
      );
      await approveRadio.trigger('click');

      expect(wrapper.findComponent({ ref: 'confirmButtonRef' }).props('disabled')).toBe(false);
    });

    it("when selected status is flagged and editor's notes are provided", async () => {
      const { channel, submission } = testData.submitted;
      const wrapper = await makeWrapper({ channel, latestSubmission: submission });

      const flagForReviewRadio = wrapper.find(
        `input[type="radio"][value="${CommunityLibraryStatus.REJECTED}"]`,
      );
      await flagForReviewRadio.trigger('click');

      const editorNotes = wrapper.findComponent({ ref: 'editorNotesRef' });
      await editorNotes.vm.$emit('input', 'Some editor notes');

      expect(wrapper.findComponent({ ref: 'confirmButtonRef' }).props('disabled')).toBe(false);
    });
  });

  describe('cannot be submitted', () => {
    it('when submission data is still loading', async () => {
      const { channel } = testData.submitted;
      const mockSubmissionFetch = () => {
        return new Promise(() => {
          // Never resolves to simulate loading state
        });
      };
      const wrapper = await makeWrapper({ channel, submissionFetch: mockSubmissionFetch });

      await wrapper.vm.$nextTick();

      const approveRadio = wrapper.find(
        `input[type="radio"][value="${CommunityLibraryStatus.APPROVED}"]`,
      );
      await approveRadio.trigger('click');

      expect(wrapper.findComponent({ ref: 'confirmButtonRef' }).props('disabled')).toBe(true);
    });

    it("when selected status is flagged and editor's notes are not provided", async () => {
      const { channel, submission } = testData.submitted;
      const wrapper = await makeWrapper({ channel, latestSubmission: submission });

      const flagForReviewRadio = wrapper.find(
        `input[type="radio"][value="${CommunityLibraryStatus.REJECTED}"]`,
      );
      await flagForReviewRadio.trigger('click');

      expect(wrapper.findComponent({ ref: 'confirmButtonRef' }).props('disabled')).toBe(true);
    });
  });

  describe('when submit button is clicked', () => {
    let channel, submission, wrapper;

    beforeEach(async () => {
      AdminCommunityLibrarySubmission.resolve.mockClear();

      const { channel: _channel, submission: _submission } = testData.submitted;
      channel = _channel;
      submission = _submission;

      wrapper = await makeWrapper({ channel, latestSubmission: submission });

      const approveRadio = wrapper.find(
        `input[type="radio"][value="${CommunityLibraryStatus.APPROVED}"]`,
      );
      await approveRadio.trigger('click');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('a submission snackbar is shown', async () => {
      jest.useFakeTimers();
      const confirmButton = wrapper.findComponent({ ref: 'confirmButtonRef' });
      await confirmButton.trigger('click');

      expect(store.getters['snackbarIsVisible']).toBe(true);
      expect(AdminCommunityLibrarySubmission.resolve).not.toHaveBeenCalled();
    });

    describe('after a timeout', () => {
      describe('if the submission is approved', () => {
        it('the submission is correctly resolved', async () => {
          jest.useFakeTimers();

          const feedbackNotes = 'Some feedback notes';
          const feedbackNotesComponent = wrapper.findComponent({ ref: 'editorNotesRef' });
          await feedbackNotesComponent.vm.$emit('input', feedbackNotes);

          const personalNotes = 'Some personal notes';
          const personalNotesComponent = wrapper.findComponent({ ref: 'personalNotesRef' });
          await personalNotesComponent.vm.$emit('input', personalNotes);

          const confirmButton = wrapper.findComponent({ ref: 'confirmButtonRef' });
          await confirmButton.trigger('click');

          jest.runAllTimers();
          await wrapper.vm.$nextTick();

          expect(AdminCommunityLibrarySubmission.resolve).toHaveBeenCalledWith(submission.id, {
            status: CommunityLibraryStatus.APPROVED,
            feedback_notes: feedbackNotes,
            internal_notes: personalNotes,
          });
        });

        it('a snackbar with correct status is shown', async () => {
          const origStoreState = store.state;
          store.commit('channel/ADD_CHANNEL', channel);

          jest.useFakeTimers();
          const confirmButton = wrapper.findComponent({ ref: 'confirmButtonRef' });
          await confirmButton.trigger('click');

          jest.runAllTimers();
          await wrapper.vm.$nextTick();

          expect(store.getters['snackbarOptions'].text).toBe('Submission approved');
          store.replaceState(origStoreState);
        });

        it('the panel closes', async () => {
          const origStoreState = store.state;
          store.commit('channel/ADD_CHANNEL', channel);

          jest.useFakeTimers();
          const confirmButton = wrapper.findComponent({ ref: 'confirmButtonRef' });
          await confirmButton.trigger('click');

          jest.runAllTimers();
          await wrapper.vm.$nextTick();

          store.replaceState(origStoreState);

          expect(wrapper.emitted('close')).toBeTruthy();
        });

        it('the channel latest submission status is updated in the store', async () => {
          const origStoreState = store.state;
          store.commit('channel/ADD_CHANNEL', channel);

          jest.useFakeTimers();
          const confirmButton = wrapper.findComponent({ ref: 'confirmButtonRef' });
          await confirmButton.trigger('click');

          jest.runAllTimers();
          await wrapper.vm.$nextTick();

          expect(
            store.getters['channel/getChannel'](channel.id)
              .latest_community_library_submission_status,
          ).toBe(CommunityLibraryStatus.APPROVED);
          store.replaceState(origStoreState);
        });
      });

      describe('if the submission is flagged for review', () => {
        const feedbackNotes = 'Some feedback notes';
        const personalNotes = 'Some personal notes';

        beforeEach(async () => {
          const flagForReviewRadio = wrapper.find(
            `input[type="radio"][value="${CommunityLibraryStatus.REJECTED}"]`,
          );
          await flagForReviewRadio.trigger('click');

          const flagReasonComponent = wrapper.findComponent({ ref: 'flagReasonSelectRef' });
          await flagReasonComponent.vm.setValue({
            value: CommunityLibraryResolutionReason.INVALID_METADATA,
            text: 'Invalid or missing metadata',
          });

          const feedbackNotesComponent = wrapper.findComponent({ ref: 'editorNotesRef' });
          await feedbackNotesComponent.vm.$emit('input', feedbackNotes);

          const personalNotesComponent = wrapper.findComponent({ ref: 'personalNotesRef' });
          await personalNotesComponent.vm.$emit('input', personalNotes);
        });

        it('the submission is correctly resolved', async () => {
          jest.useFakeTimers();

          const confirmButton = wrapper.findComponent({ ref: 'confirmButtonRef' });
          await confirmButton.trigger('click');

          jest.runAllTimers();
          await wrapper.vm.$nextTick();

          expect(AdminCommunityLibrarySubmission.resolve).toHaveBeenCalledWith(submission.id, {
            status: CommunityLibraryStatus.REJECTED,
            feedback_notes: feedbackNotes,
            internal_notes: personalNotes,
            resolution_reason: CommunityLibraryResolutionReason.INVALID_METADATA,
          });
        });

        it('a snackbar with correct status is shown', async () => {
          const origStoreState = store.state;
          store.commit('channel/ADD_CHANNEL', channel);

          jest.useFakeTimers();

          const confirmButton = wrapper.findComponent({ ref: 'confirmButtonRef' });
          await confirmButton.trigger('click');

          jest.runAllTimers();
          await wrapper.vm.$nextTick();

          expect(store.getters['snackbarOptions'].text).toBe('Submission flagged for review');
          store.replaceState(origStoreState);
        });

        it('the channel latest submission status is updated in the store', async () => {
          const origStoreState = store.state;
          store.commit('channel/ADD_CHANNEL', channel);

          jest.useFakeTimers();
          const confirmButton = wrapper.findComponent({ ref: 'confirmButtonRef' });
          await confirmButton.trigger('click');

          jest.runAllTimers();
          await wrapper.vm.$nextTick();
          jest.runAllTimers();
          await wrapper.vm.$nextTick();

          expect(
            store.getters['channel/getChannel'](channel.id)
              .latest_community_library_submission_status,
          ).toBe(CommunityLibraryStatus.REJECTED);
          store.replaceState(origStoreState);
        });
      });
    });
  });
});
