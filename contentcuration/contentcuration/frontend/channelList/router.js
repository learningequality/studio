// include all logic in "base" entrypoint
import VueRouter from 'vue-router';
import ChannelList from './views/Channel/ChannelList';
import ChannelModal from './views/Channel/ChannelModal';
import ChannelSetList from './views/ChannelSet/ChannelSetList';
import ChannelSetModal from './views/ChannelSet/ChannelSetModal';
import CatalogList from './views/Catalog/CatalogList';
import CatalogDetailsPage from './views/Catalog/CatalogDetailsPage';
import { RouterNames } from './constants';

const router = new VueRouter({
  routes: [
    {
      name: RouterNames.CHANNELS,
      path: '/channels/:listType',
      props: true,
      component: ChannelList,
      children: [
        {
          name: RouterNames.CHANNEL_DETAILS,
          path: ':channelId',
          component: ChannelModal,
          props: true,
        },
      ],
    },
    {
      name: RouterNames.CHANNEL_SETS,
      path: '/collections',
      component: ChannelSetList,
      children: [
        {
          name: RouterNames.CHANNEL_SET_DETAILS,
          path: ':channelSetId',
          component: ChannelSetModal,
          props: true,
        },
      ],
    },
    {
      name: RouterNames.CATALOG_ITEMS,
      path: '/public',
      component: CatalogList,
      children: [
        {
          name: RouterNames.CATALOG_DETAILS,
          path: ':itemID',
          component: CatalogDetailsPage,
          props: true,
        },
      ],
    },
    // Catch-all for unrecognized URLs
    {
      path: '*',
      redirect: { name: RouterNames.CATALOG_ITEMS },
    },
  ],
});

export default router;
