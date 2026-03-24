import { useLatestCommunityLibrarySubmission } from '../useLatestCommunityLibrarySubmission';
import { AdminCommunityLibrarySubmission, CommunityLibrarySubmission } from 'shared/data/resources';

const mockResponse = {
  results: [],
};

jest.mock('shared/data/resources', () => {
  return {
    CommunityLibrarySubmission: {
      fetchCollection: jest.fn(() => Promise.resolve(mockResponse)),
    },
    AdminCommunityLibrarySubmission: {
      fetchCollection: jest.fn(() => Promise.resolve(mockResponse)),
    },
  };
});

describe('useLatestCommunityLibrarySubmission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('by default uses non-admin endpoint', async () => {
    const { fetchData } = useLatestCommunityLibrarySubmission({ channelId: 'channel-id' });
    await fetchData();

    expect(CommunityLibrarySubmission.fetchCollection).toHaveBeenCalled();
    expect(AdminCommunityLibrarySubmission.fetchCollection).not.toHaveBeenCalled();
  });

  it('uses admin endpoint when initialized with admin=true', async () => {
    const { fetchData } = useLatestCommunityLibrarySubmission({
      channelId: 'channel-id',
      admin: true,
    });
    await fetchData();

    expect(CommunityLibrarySubmission.fetchCollection).not.toHaveBeenCalled();
    expect(AdminCommunityLibrarySubmission.fetchCollection).toHaveBeenCalled();
  });
});
