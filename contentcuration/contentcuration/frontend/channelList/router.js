import VueRouter from 'vue-router';
import ChannelList from './views/Channel/ChannelList';
import ChannelSetList from './views/ChannelSet/ChannelSetList';
import ChannelSetModal from './views/ChannelSet/ChannelSetModal';
import CatalogList from './views/Channel/CatalogList';
import { RouteNames } from './constants';
import CatalogFAQ from './views/Channel/CatalogFAQ';
import ChannelModal from 'shared/views/channel/ChannelModal';
import ChannelDetailsModal from 'shared/views/channel/ChannelDetailsModal';
import { ChannelListTypes } from 'shared/constants';

const router = new VueRouter({
  routes: [
    {
      name: RouteNames.CHANNELS_EDITABLE,
      path: '/my-channels',
      component: ChannelList,
      props: { listType: ChannelListTypes.EDITABLE },
    },
    {
      name: RouteNames.CHANNELS_STARRED,
      path: '/starred',
      component: ChannelList,
      props: { listType: ChannelListTypes.STARRED },
    },
    {
      name: RouteNames.CHANNELS_VIEW_ONLY,
      path: '/view-only',
      component: ChannelList,
      props: { listType: ChannelListTypes.VIEW_ONLY },
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
      name: RouteNames.CHANNEL_SETS,
      path: '/collections',
      component: ChannelSetList,
    },
    {
      name: RouteNames.CHANNEL_SET_DETAILS,
      path: '/collections/:channelSetId',
      component: ChannelSetModal,
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
