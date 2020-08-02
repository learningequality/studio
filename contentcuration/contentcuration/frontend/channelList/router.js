import VueRouter from 'vue-router';
import ChannelList from './views/Channel/ChannelList';
import ChannelSetList from './views/ChannelSet/ChannelSetList';
import ChannelSetModal from './views/ChannelSet/ChannelSetModal';
import CatalogList from './views/Channel/CatalogList';
import { RouterNames, ListTypes } from './constants';
import CatalogFAQ from './views/Channel/CatalogFAQ';
import { updateTabTitle } from 'shared/i18n';
import ChannelDetailsModal from 'shared/views/channel/ChannelDetailsModal';
import ChannelModal from 'shared/views/channel/ChannelModal';

const router = new VueRouter({
  routes: [
    {
      name: RouterNames.CHANNELS_EDITABLE,
      path: `/channels/${ListTypes.EDITABLE}`,
      component: ChannelList,
      props: { listType: ListTypes.EDITABLE },
    },
    {
      name: RouterNames.CHANNELS_STARRED,
      path: `/channels/${ListTypes.STARRED}`,
      component: ChannelList,
      props: { listType: ListTypes.STARRED },
    },
    {
      name: RouterNames.CHANNELS_VIEW_ONLY,
      path: `/channels/${ListTypes.VIEW_ONLY}`,
      component: ChannelList,
      props: { listType: ListTypes.VIEW_ONLY },
    },
    {
      name: RouterNames.CHANNEL_DETAILS,
      path: '/channels/:channelId/details',
      component: ChannelDetailsModal,
      props: true,
    },
    {
      name: RouterNames.CHANNEL_EDIT,
      path: '/channels/:channelId/edit',
      component: ChannelModal,
      props: true,
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

router.beforeEach((to, from, next) => {
  next();
  updateTabTitle();
});

export default router;
