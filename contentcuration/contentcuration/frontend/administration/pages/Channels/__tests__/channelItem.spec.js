import { mount } from '@vue/test-utils';
import CommunityLibraryStatusButton from '../../../components/CommunityLibraryStatusButton.vue';
import ReviewSubmissionSidePanel from '../../../components/sidePanels/ReviewSubmissionSidePanel';
import router from '../../../router';
import { factory } from '../../../store';
import { RouteNames } from '../../../constants';
import ChannelItem from '../ChannelItem';
import { CommunityLibraryStatus } from 'shared/constants';

const store = factory();

const channelId = '11111111111111111111111111111111';
const submissionId = '1234567890abcdef1234567890abcdef';

const channelCommon = {
  id: channelId,
  name: 'Channel Test',
  created: new Date(),
  modified: new Date(),
  public: true,
  published: true,
  primary_token: 'testytesty',
  deleted: false,
  demo_server_url: 'demo.com',
  source_url: 'source.com',
};

const channelWithoutSubmission = {
  ...channelCommon,
  latest_community_library_submission_id: null,
  latest_community_library_submission_status: null,
  has_any_live_community_library_submission: false,
};

const liveChannel = {
  ...channelCommon,
  latest_community_library_submission_id: submissionId,
  latest_community_library_submission_status: CommunityLibraryStatus.LIVE,
  has_any_live_community_library_submission: true,
};

const approvedChannel = {
  ...channelCommon,
  latest_community_library_submission_id: submissionId,
  latest_community_library_submission_status: CommunityLibraryStatus.APPROVED,
  has_any_live_community_library_submission: true,
};

const submittedChannel = {
  ...channelCommon,
  latest_community_library_submission_id: submissionId,
  latest_community_library_submission_status: CommunityLibraryStatus.PENDING,
  has_any_live_community_library_submission: false,
};

const flaggedChannel = {
  ...channelCommon,
  latest_community_library_submission_id: submissionId,
  latest_community_library_submission_status: CommunityLibraryStatus.REJECTED,
  has_any_live_community_library_submission: false,
};

function makeWrapper() {
  router.replace({ name: RouteNames.CHANNELS }).catch(() => {});
  return mount(ChannelItem, {
    router,
    store,
    propsData: {
      channelId,
      value: [],
    },
    data() {
      return {
        // Saving the channel inside component data allows to change it
        // in tests after the wrapper is created
        testedChannel: channelWithoutSubmission,
      };
    },
    computed: {
      channel() {
        // Use a channel without submission by default, and override in tests if needed
        return this.testedChannel;
      },
    },
    stubs: {
      ChannelActionsDropdown: true,
    },
  });
}

describe('channelItem', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('selecting the channel should emit list with channel id', () => {
    wrapper.vm.selected = true;
    expect(wrapper.emitted('input')[0][0]).toEqual([channelId]);
  });

  it('deselecting the channel should emit list without channel id', async () => {
    await wrapper.setProps({ value: [channelId] });
    wrapper.vm.selected = false;
    expect(wrapper.emitted('input')[0][0]).toEqual([]);
  });

  it('saveDemoServerUrl should call updateChannel with new demo_server_url', async () => {
    const updateChannel = jest.spyOn(wrapper.vm, 'updateChannel');
    updateChannel.mockReturnValue(Promise.resolve());
    await wrapper.vm.saveDemoServerUrl();
    expect(updateChannel).toHaveBeenCalledWith({
      id: channelId,
      demo_server_url: channelWithoutSubmission.demo_server_url,
    });
  });

  it('saveSourceUrl should call updateChannel with new source_url', async () => {
    const updateChannel = jest.spyOn(wrapper.vm, 'updateChannel');
    updateChannel.mockReturnValue(Promise.resolve());
    await wrapper.vm.saveSourceUrl();
    expect(updateChannel).toHaveBeenCalledWith({
      id: channelId,
      source_url: channelWithoutSubmission.source_url,
    });
  });

  describe('community library submission status is displayed correctly', () => {
    it('when it does not have a submission a dash is shown', () => {
      const statusCell = wrapper.find('[data-test="community-library-status"]');
      expect(statusCell.text()).toBe('—');
    });

    it('when the latest submission is live, approved status is shown', async () => {
      wrapper.setData({ testedChannel: liveChannel });
      await wrapper.vm.$nextTick();

      const statusCell = wrapper.find('[data-test="community-library-status"]');
      const statusButton = statusCell.findComponent(CommunityLibraryStatusButton);
      await statusButton.vm.$nextTick();

      expect(statusButton.exists()).toBe(true);
      expect(statusButton.props('status')).toBe(CommunityLibraryStatus.APPROVED);
    });

    it('when the latest submission is approved, approved status is shown', async () => {
      wrapper.setData({ testedChannel: approvedChannel });
      await wrapper.vm.$nextTick();

      const statusCell = wrapper.find('[data-test="community-library-status"]');
      const statusButton = statusCell.findComponent(CommunityLibraryStatusButton);

      expect(statusButton.exists()).toBe(true);
      expect(statusButton.props('status')).toBe(CommunityLibraryStatus.APPROVED);
    });

    it('when the latest submission is submitted, submitted status is shown', async () => {
      wrapper.setData({ testedChannel: submittedChannel });
      await wrapper.vm.$nextTick();

      const statusCell = wrapper.find('[data-test="community-library-status"]');
      const statusButton = statusCell.findComponent(CommunityLibraryStatusButton);

      expect(statusButton.exists()).toBe(true);
      expect(statusButton.props('status')).toBe(CommunityLibraryStatus.PENDING);
    });

    it('when the latest submission is flagged, flagged status is shown', async () => {
      wrapper.setData({ testedChannel: flaggedChannel });
      await wrapper.vm.$nextTick();

      const statusCell = wrapper.find('[data-test="community-library-status"]');
      const statusButton = statusCell.findComponent(CommunityLibraryStatusButton);

      expect(statusButton.exists()).toBe(true);
      expect(statusButton.props('status')).toBe(CommunityLibraryStatus.REJECTED);
    });
  });

  it('Clicking on the status button opens the review submission side panel', async () => {
    wrapper.setData({ testedChannel: submittedChannel });
    await wrapper.vm.$nextTick();

    const statusCell = wrapper.find('[data-test="community-library-status"]');
    const statusButton = statusCell.findComponent(CommunityLibraryStatusButton);

    expect(wrapper.findComponent(ReviewSubmissionSidePanel).exists()).toBe(false);

    await statusButton.trigger('click');

    expect(wrapper.findComponent(ReviewSubmissionSidePanel).exists()).toBe(true);
  });
});
