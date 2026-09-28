import invert from 'lodash/invert';

import { ChannelListTypes } from 'shared/constants';

export const InvitationShareModes = {
  EDIT: 'edit',
  VIEW_ONLY: 'view',
  ADMIN: 'admin',
};

export const ChannelInvitationMapping = {
  [InvitationShareModes.EDIT]: ChannelListTypes.EDITABLE,
  [InvitationShareModes.VIEW_ONLY]: ChannelListTypes.VIEW_ONLY,
};

export const RouteNames = {
  CHANNELS_EDITABLE: 'CHANNELS_EDITABLE',
  MY_ORGANIZATIONS: 'MY_ORGANIZATIONS',
  ORGANIZATION_EDIT: 'ORGANIZATION_EDIT',
  NEW_ORGANIZATION: 'NEW_ORGANIZATION',
  CHANNELS_STARRED: 'CHANNELS_STARRED',
  CHANNELS_VIEW_ONLY: 'CHANNELS_VIEW_ONLY',
  CHANNELS_PUBLIC: 'CHANNELS_PUBLIC',
  CHANNEL_DETAILS: 'CHANNEL_DETAILS',
  CHANNEL_EDIT: 'CHANNEL_EDIT',
  CHANNEL_SETS: 'CHANNEL_SETS',
  CHANNEL_SET_DETAILS: 'CHANNEL_SET_DETAILS',
  NEW_CHANNEL_SET: 'NEW_CHANNEL_SET',
  CATALOG_ITEMS: 'CATALOG_ITEMS',
  CATALOG_DETAILS: 'CATALOG_DETAILS',
  CATALOG_FAQ: 'CATALOG_FAQ',
  COMMUNITY_LIBRARY_ITEMS: 'COMMUNITY_LIBRARY_ITEMS',
  COMMUNITY_LIBRARY_DETAILS: 'COMMUNITY_LIBRARY_DETAILS',
  NEW_CHANNEL: 'NEW_CHANNEL',
  COMMUNITY_LIBRARY_SUBMISSION: 'COMMUNITY_LIBRARY_SUBMISSION',
};

export const ListTypeToRouteMapping = {
  [ChannelListTypes.EDITABLE]: RouteNames.CHANNELS_EDITABLE,
  [ChannelListTypes.STARRED]: RouteNames.CHANNELS_STARRED,
  [ChannelListTypes.VIEW_ONLY]: RouteNames.CHANNELS_VIEW_ONLY,
  [ChannelListTypes.PUBLIC]: RouteNames.CHANNELS_PUBLIC,
};

export const RouteToListTypeMapping = invert(ListTypeToRouteMapping);

export const CHANNEL_PAGE_SIZE = 25;

export const OrganizationEditTabs = {
  DETAILS: 'details',
  SHARING: 'sharing',
};

export const OrganizationRoles = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

export const OrganizationRoleStatuses = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};
