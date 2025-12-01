import VueRouter from 'vue-router';
import StudioMyChannels from './views/Channel/StudioMyChannels.vue';
import StudioStarredChannels from './views/Channel/StudioStarredChannels.vue';
import StudioViewOnlyChannels from './views/Channel/StudioViewOnlyChannels.vue';
import ChannelSetList from './views/ChannelSet/ChannelSetList';
import ChannelSetModal from './views/ChannelSet/ChannelSetModal';
import CatalogList from './views/Channel/CatalogList';
import { RouteNames } from './constants';
import CatalogFAQ from './views/Channel/CatalogFAQ';
import ChannelModal from 'shared/views/channel/ChannelModal';
import ChannelDetailsModal from 'shared/views/channel/ChannelDetailsModal';

const router = new VueRouter({
  routes: [
    {
      name: RouteNames.CHANNELS_EDITABLE,
      path: '/my-channels',
      component: StudioMyChannels,
    },
    {
      name: RouteNames.CHANNEL_SETS,
      path: '/collections',
      component: ChannelSetList,
    },
    {
      name: RouteNames.NEW_CHANNEL_SET,
      path: '/collections/new',
      component: ChannelSetModal,
      props: true,
    },
    {
      name: RouteNames.CHANNEL_SET_DETAILS,
      path: '/collections/:channelSetId',
      component: ChannelSetModal,
      props: true,
    },
    {
      name: RouteNames.CHANNELS_STARRED,
      path: '/starred',
      component: StudioStarredChannels,
    },
    {
      name: RouteNames.CHANNELS_VIEW_ONLY,
      path: '/view-only',
      component: StudioViewOnlyChannels,
    },
    {
      name: RouteNames.CHANNEL_DETAILS,
      path: '/:channelId/details',
      component: ChannelDetailsModal,
      props: true,
    },
    {
      name: RouteNames.CHANNEL_EDIT,
      path: '/:channelId/:tab',
      component: ChannelModal,
      props: true,
    },
    {
      name: RouteNames.NEW_CHANNEL,
      path: '/new',
      component: ChannelModal,
      props: true,
    },

    {
      name: RouteNames.CATALOG_ITEMS,
      path: '/public',
      component: CatalogList,
    },
    {
      name: RouteNames.CATALOG_DETAILS,
      path: '/public/:channelId/details',
      component: ChannelDetailsModal,
      props: true,
    },
    {
      name: RouteNames.CATALOG_FAQ,
      path: '/faq',
      component: CatalogFAQ,
    },
    // Catch-all for unrecognized URLs
    {
      path: '*',
      redirect: { name: RouteNames.CHANNELS_EDITABLE },
    },
  ],
});

export default router;
