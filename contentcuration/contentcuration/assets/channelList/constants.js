export const ListTypes = {
  // These field names are set in the ChannelSlimViewset
  EDITABLE: 'edit',
  STARRED: 'bookmark',
  VIEW_ONLY: 'view',
  PUBLIC: 'public',
};

export const ChannelListUrls = {
  [ListTypes.EDITABLE]: window.Urls['channelslim-list']() + '?edit=true',
  [ListTypes.STARRED]: window.Urls['channelslim-list']() + '?bookmark=true',
  [ListTypes.VIEW_ONLY]: window.Urls['channelslim-list']() + '?view=true',
  [ListTypes.PUBLIC]: window.Urls['channelslim-list']() + '?public=true',
};

export const InvitationShareModes = {
  EDIT: 'edit',
  VIEW_ONLY: 'view',
};

export const ChannelInvitationMapping = {
  [InvitationShareModes.EDIT]: ListTypes.EDITABLE,
  [InvitationShareModes.VIEW_ONLY]: ListTypes.VIEW_ONLY,
};

export const RouterNames = {
  CHANNELS: 'CHANNELS',
  CHANNEL_DETAILS: 'CHANNEL_DETAILS',
  CHANNEL_SETS: 'CHANNEL_SETS',
  CHANNEL_SET_DETAILS: 'CHANNEL_SET_DETAILS',
};
