import { ChannelListTypes } from 'shared/constants';

export const InvitationShareModes = {
  EDIT: 'edit',
  VIEW_ONLY: 'view',
};

export const ChannelInvitationMapping = {
  [InvitationShareModes.EDIT]: ChannelListTypes.EDITABLE,
  [InvitationShareModes.VIEW_ONLY]: ChannelListTypes.VIEW_ONLY,
};

export const RouterNames = {
  CHANNELS: 'CHANNELS',
  CHANNEL_DETAILS: 'CHANNEL_DETAILS',
  CHANNEL_EDIT: 'CHANNEL_EDIT',
  CHANNEL_SETS: 'CHANNEL_SETS',
  CHANNEL_SET_DETAILS: 'CHANNEL_SET_DETAILS',
  CATALOG_ITEMS: 'CATALOG_ITEMS',
  CATALOG_DETAILS: 'CATALOG_DETAILS',
  CATALOG_FAQ: 'CATALOG_FAQ',
};
