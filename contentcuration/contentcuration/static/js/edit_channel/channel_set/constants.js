export const PageTypes = {
  SELECT_CHANNELS: 'SELECT_CHANNELS',
  VIEW_CHANNELS: 'VIEW_CHANNELS',
};

// Add lists to select from here
export const ChannelListNames = {
  EDIT: 'EDIT',
  VIEW_ONLY: 'VIEW_ONLY',
  PUBLIC: 'PUBLIC',
};

export const ChannelListUrls = {
  [ChannelListNames.EDIT]: window.Urls.get_user_edit_channels(),
  [ChannelListNames.VIEW_ONLY]: window.Urls.get_user_view_channels(),
  [ChannelListNames.PUBLIC]: window.Urls.get_user_public_channels(),
};
