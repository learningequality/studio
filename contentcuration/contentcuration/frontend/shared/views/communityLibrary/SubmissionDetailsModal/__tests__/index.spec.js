import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import SubmissionDetailsModal from '../index.vue';
import {
  AdminCommunityLibrarySubmission,
  ChannelVersion,
  CommunityLibrarySubmission,
} from 'shared/data/resources';

jest.mock('shared/data/resources', () => ({
  AdminCommunityLibrarySubmission: { fetchModel: jest.fn() },
  ChannelVersion: { fetchCollection: jest.fn() },
  CommunityLibrarySubmission: {
    fetchModel: jest.fn(),
    fetchCollection: jest.fn(() => Promise.resolve({ results: [] })),
  },
}));

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const stubChannel = {
  id: 'ch1',
  name: 'Test',
  thumbnail_url: null,
  thumbnail_encoding: null,
  description: '',
};
const stubSubmission = {
  id: 'sub1',
  channel_id: 'ch1',
  channel_version: 1,
  status: 'PENDING',
  version_token: null,
};
const stubChannelVersion = { id: 'cv1' };

function makeStore(isAdmin) {
  return new Vuex.Store({
    getters: { isAdmin: () => isAdmin },
    modules: {
      channel: {
        namespaced: true,
        actions: { loadChannel: jest.fn(() => Promise.resolve(stubChannel)) },
      },
      errors: { namespaced: true, actions: { handleAxiosError: jest.fn() } },
    },
  });
}

describe('SubmissionDetailsModal', () => {
  beforeEach(() => {
    AdminCommunityLibrarySubmission.fetchModel.mockResolvedValue(stubSubmission);
    CommunityLibrarySubmission.fetchModel.mockResolvedValue(stubSubmission);
    ChannelVersion.fetchCollection.mockResolvedValue([stubChannelVersion]);
  });

  afterEach(() => jest.clearAllMocks());

  it('uses AdminCommunityLibrarySubmission when user is admin', () => {
    shallowMount(SubmissionDetailsModal, {
      localVue,
      store: makeStore(true),
      router: new VueRouter(),
      propsData: { channelId: 'ch1', submissionId: 'sub1' },
    });
    expect(AdminCommunityLibrarySubmission.fetchModel).toHaveBeenCalledWith('sub1');
  });

  it('uses CommunityLibrarySubmission when user is not admin', () => {
    shallowMount(SubmissionDetailsModal, {
      localVue,
      store: makeStore(false),
      router: new VueRouter(),
      propsData: { channelId: 'ch1', submissionId: 'sub1' },
    });
    expect(CommunityLibrarySubmission.fetchModel).toHaveBeenCalledWith('sub1');
  });
});
