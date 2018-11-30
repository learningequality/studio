export const PageTypes = {
  SELECT_CHANNELS: 'SELECT_CHANNELS',
  VIEW_CHANNELS: 'VIEW_CHANNELS',
};

// Add lists to select from here
export const ChannelListUrls = {
	EDIT: window.Urls.get_user_edit_channels(),
	VIEW_ONLY: window.Urls.get_user_view_channels(),
	PUBLIC: window.Urls.get_user_public_channels(),
}
