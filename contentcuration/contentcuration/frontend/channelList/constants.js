import invert from 'lodash/invert';

export const ListTypes = {
  // These field names are set in the ChannelSlimViewset
  EDITABLE: 'edit',
  STARRED: 'bookmark',
  VIEW_ONLY: 'view',
  PUBLIC: 'public',
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
  CHANNELS_EDITABLE: 'CHANNELS_EDITABLE',
  CHANNELS_STARRED: 'CHANNELS_STARRED',
  CHANNELS_VIEW_ONLY: 'CHANNELS_VIEW_ONLY',
  CHANNELS_PUBLIC: 'CHANNELS_PUBLIC',
  CHANNEL_DETAILS: 'CHANNEL_DETAILS',
  CHANNEL_EDIT: 'CHANNEL_EDIT',
  CHANNEL_SETS: 'CHANNEL_SETS',
  CHANNEL_SET_DETAILS: 'CHANNEL_SET_DETAILS',
  CATALOG_ITEMS: 'CATALOG_ITEMS',
  CATALOG_DETAILS: 'CATALOG_DETAILS',
  CATALOG_FAQ: 'CATALOG_FAQ',
};

export const ListTypeToRouteMapping = {
  [ListTypes.EDITABLE]: RouterNames.CHANNELS_EDITABLE,
  [ListTypes.STARRED]: RouterNames.CHANNELS_STARRED,
  [ListTypes.VIEW_ONLY]: RouterNames.CHANNELS_VIEW_ONLY,
  [ListTypes.PUBLIC]: RouterNames.CHANNELS_PUBLIC,
};

export const RouteToListTypeMapping = invert(ListTypeToRouteMapping);
