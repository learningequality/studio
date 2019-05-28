export const ListTypes = {
  EDITABLE: 'EDITABLE',
  STARRED: 'STARRED',
  VIEW_ONLY: 'VIEW_ONLY',
  PUBLIC: 'PUBLIC',
  CHANNEL_SETS: 'CHANNEL_SETS',
};

export const ChannelListUrls = {
  [ListTypes.EDITABLE]: window.Urls.get_user_edit_channels(),
  [ListTypes.STARRED]: window.Urls.get_user_bookmarked_channels(),
  [ListTypes.VIEW_ONLY]: window.Urls.get_user_view_channels(),
  [ListTypes.PUBLIC]: window.Urls.get_user_public_channels(),
};

export const InvitationShareModes = {
  EDIT: 'edit',
  VIEW_ONLY: 'view',
};

export const ChannelInvitationMapping = {
  [InvitationShareModes.EDIT]: ListTypes.EDITABLE,
  [InvitationShareModes.VIEW_ONLY]: ListTypes.VIEW_ONLY,
};
