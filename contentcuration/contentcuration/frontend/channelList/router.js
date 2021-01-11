import VueRouter from 'vue-router';
import ChannelList from './views/Channel/ChannelList';
import ChannelSetList from './views/ChannelSet/ChannelSetList';
import ChannelSetModal from './views/ChannelSet/ChannelSetModal';
import CatalogList from './views/Channel/CatalogList';
import { RouterNames } from './constants';
import CatalogFAQ from './views/Channel/CatalogFAQ';
import { ChannelListTypes } from 'shared/constants';
import ChannelDetailsModal from 'shared/views/channel/ChannelDetailsModal';
import ChannelModal from 'shared/views/channel/ChannelModal';

const router = new VueRouter({
  routes: [
    {
      name: RouterNames.CHANNELS_EDITABLE,
      path: '/my-channels',
      component: ChannelList,
      props: { listType: ChannelListTypes.EDITABLE },
    },
    {
      name: RouterNames.CHANNELS_STARRED,
      path: '/starred',
      component: ChannelList,
      props: { listType: ChannelListTypes.STARRED },
    },
    {
      name: RouterNames.CHANNELS_VIEW_ONLY,
      path: '/view-only',
      component: ChannelList,
      props: { listType: ChannelListTypes.VIEW_ONLY },
    },
    {
      name: RouterNames.CHANNEL_DETAILS,
      path: '/:channelId/details',
      component: ChannelDetailsModal,
      props: true,
    },
    {
      name: RouterNames.CHANNEL_EDIT,
      path: '/:channelId/:tab',
      component: ChannelModal,
      props: true,
    },
    {
      name: RouterNames.CHANNEL_SETS,
      path: '/collections',
      component: ChannelSetList,
    },
    {
      name: RouterNames.CHANNEL_SET_DETAILS,
      path: '/collections/:channelSetId',
      component: ChannelSetModal,
      props: true,
    },
    {
      name: RouterNames.CATALOG_ITEMS,
      path: '/public',
      component: CatalogList,
    },
    {
      name: RouterNames.CATALOG_DETAILS,
      path: '/public/:channelId',
      component: ChannelDetailsModal,
      props: true,
    },
    {
      name: RouterNames.CATALOG_FAQ,
      path: '/faq',
      component: CatalogFAQ,
    },
    // Catch-all for unrecognized URLs
    {
      path: '*',
      redirect: { name: RouterNames.CHANNELS_EDITABLE },
    },
  ],
});

export default router;
