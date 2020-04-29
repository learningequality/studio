import VueRouter from 'vue-router';
import ChannelList from './views/Channel/ChannelList';
import ChannelSetList from './views/ChannelSet/ChannelSetList';
import ChannelSetModal from './views/ChannelSet/ChannelSetModal';
import CatalogList from './views/Channel/CatalogList';
import { RouterNames, ListTypes } from './constants';
import ChannelDetailsModal from 'shared/views/channel/ChannelDetailsModal';
import ChannelModal from 'shared/views/channel/ChannelModal';
import { updateTabTitle } from 'shared/i18n/utils';

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
          path: ':channelId/details',
          component: ChannelDetailsModal,
          props: true,
        },
        {
          name: RouterNames.CHANNEL_EDIT,
          path: ':channelId/edit',
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
          path: ':channelId',
          component: ChannelDetailsModal,
          props: true,
        },
      ],
    },
    // Catch-all for unrecognized URLs
    {
      path: '*',
      redirect: { name: RouterNames.CHANNELS, params: { listType: ListTypes.EDITABLE } },
    },
  ],
});

function hasQueryParams(route) {
  return !!Object.keys(route.query).length;
}

router.beforeEach((to, from, next) => {
  if (!hasQueryParams(to) && hasQueryParams(from)) {
    next({
      name: to.name,
      query: {
        ...from.query,
        // Getting NavigationDuplicated for any query,
        // so just get a unique string to make it always unique
        query_id: Math.random()
          .toString(36)
          .substring(7),
      },
    });
  } else {
    next();
  }
  updateTabTitle();
});

export default router;
