const State = require("edit_channel/state");

export const ListTypes = {
  EDITABLE: 'EDITABLE',
  STARRED: 'STARRED',
  VIEW_ONLY: 'VIEW_ONLY',
  PUBLIC: 'PUBLIC'
};

export const ChannelListGetFunctions = {
	[ListTypes.EDITABLE]: State.current_user.get_channels,
	[ListTypes.STARRED]: State.current_user.get_bookmarked_channels,
	[ListTypes.VIEW_ONLY]: State.current_user.get_view_only_channels,
	[ListTypes.PUBLIC]: State.current_user.get_public_channels
}
