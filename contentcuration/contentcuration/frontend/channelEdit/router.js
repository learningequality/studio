import VueRouter from 'vue-router';
import { RouteNames } from './constants';
import TreeView from './views/TreeView';
import StagingTreePage from './pages/StagingTreePage';
import store from './store';
import AddPreviousStepsPage from './pages/AddPreviousStepsPage';
import AddNextStepsPage from './pages/AddNextStepsPage';
import TrashModal from './views/trash/TrashModal';
import SearchOrBrowseWindow from './views/ImportFromChannels/SearchOrBrowseWindow';
import ReviewSelectionsPage from './views/ImportFromChannels/ReviewSelectionsPage';
import EditModal from './components/edit/EditModal';
import ChannelDetailsModal from 'shared/views/channel/ChannelDetailsModal';
import ChannelModal from 'shared/views/channel/ChannelModal';
import { RouteNames as ChannelRouteNames } from 'frontend/channelList/constants';

const importBeforeEnter = function (to, from, next) {
  const promises = [
    // search recommendations require ancestors to be loaded
    store.dispatch('contentNode/loadAncestors', { id: to.params.destNodeId }),
  ];

  if (!store.getters['currentChannel/currentChannel']) {
    // ensure the current channel is loaded, in case of hard refresh on this route.
    // alternatively, the page could be reactive to this getter's value, although that doesn't
    // seem to work properly
    promises.push(store.dispatch('currentChannel/loadChannel'));
  }

  return Promise.all(promises).then(() => next());
};

const router = new VueRouter({
  routes: [
    {
      name: RouteNames.TREE_ROOT_VIEW,
      path: '/',
      beforeEnter: (to, from, next) => {
        return store.dispatch('currentChannel/loadChannel').then(channel => {
          if (channel) {
            const nodeId = channel.root_id;
            return next({
              name: RouteNames.TREE_VIEW,
              params: {
                nodeId,
              },
              replace: true,
            });
          }
        });
      },
    },
    {
      name: RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
      path: '/import/:destNodeId/browse/:channelId?/:nodeId?',
      component: SearchOrBrowseWindow,
      props: true,
      beforeEnter: importBeforeEnter,
    },
    {
      name: RouteNames.IMPORT_FROM_CHANNELS_SEARCH,
      path: '/import/:destNodeId/search/:searchTerm',
      component: SearchOrBrowseWindow,
      props: true,
      beforeEnter: importBeforeEnter,
    },
    {
      name: RouteNames.IMPORT_FROM_CHANNELS_REVIEW,
      path: '/import/:destNodeId/review',
      component: ReviewSelectionsPage,
      props: true,
    },
    // Redirect to staging URL with root node ID
    {
      name: RouteNames.STAGING_TREE_VIEW_REDIRECT,
      path: '/staging',
      beforeEnter: (to, from, next) => {
        return store.dispatch('currentChannel/loadChannel').then(channel => {
          return next({
            name: RouteNames.STAGING_TREE_VIEW,
            params: {
              nodeId: channel.staging_root_id || '',
            },
            replace: true,
          });
        });
      },
    },
    {
      name: RouteNames.STAGING_TREE_VIEW,
      path: '/staging/:nodeId/:detailNodeId?',
      props: true,
      component: StagingTreePage,
    },
    {
      name: RouteNames.ADD_PREVIOUS_STEPS,
      path: '/:nodeId/:detailNodeId?/details/:detailNodeIds/previous-steps/:targetNodeId',
      props: true,
      component: AddPreviousStepsPage,
      beforeEnter: (to, from, next) => {
        const { targetNodeId } = to.params;
        const promises = [
          store.dispatch('currentChannel/loadChannel'),
          store.dispatch('contentNode/loadRelatedResources', targetNodeId),
        ];

        return Promise.all(promises)
          .catch(error => {
            throw new Error(error);
          })
          .then(() => next());
      },
    },
    {
      name: RouteNames.ADD_NEXT_STEPS,
      path: '/:nodeId/:detailNodeId?/details/:detailNodeIds/next-steps/:targetNodeId',
      props: true,
      component: AddNextStepsPage,
      beforeEnter: (to, from, next) => {
        const { targetNodeId } = to.params;
        const promises = [
          store.dispatch('currentChannel/loadChannel'),
          store.dispatch('contentNode/loadRelatedResources', targetNodeId),
        ];

        return Promise.all(promises)
          .catch(error => {
            throw new Error(error);
          })
          .then(() => next());
      },
    },
    {
      name: RouteNames.TRASH,
      path: '/:nodeId/:detailNodeId?/trash',
      component: TrashModal,
      props: true,
      beforeEnter: (to, from, next) => {
        return store
          .dispatch('currentChannel/loadChannel')
          .catch(error => {
            throw new Error(error);
          })
          .then(() => next());
      },
    },
    {
      name: ChannelRouteNames.CHANNEL_DETAILS,
      path: '/:nodeId/:detailNodeId?/channel/:channelId/details',
      component: ChannelDetailsModal,
      props: true,
      beforeEnter: (to, from, next) => {
        return store
          .dispatch('currentChannel/loadChannel')
          .catch(error => {
            throw new Error(error);
          })
          .then(() => next());
      },
    },
    {
      name: ChannelRouteNames.CHANNEL_EDIT,
      path: '/:nodeId/:detailNodeId?/channel/:channelId/:tab',
      component: ChannelModal,
      props: true,
      beforeEnter: (to, from, next) => {
        return store
          .dispatch('currentChannel/loadChannel')
          .catch(error => {
            throw new Error(error);
          })
          .then(() => next());
      },
    },
    {
      name: RouteNames.CONTENTNODE_DETAILS,
      path: '/:nodeId/:detailNodeId?/details/:detailNodeIds/:tab?/:targetNodeId?',
      props: true,
      component: EditModal,
      beforeEnter: (to, from, next) => {
        return store
          .dispatch('currentChannel/loadChannel')
          .catch(error => {
            throw new Error(error);
          })
          .then(() => next());
      },
    },
    {
      name: RouteNames.ADD_TOPICS,
      path: '/:nodeId/:detailNodeId?/topics/:detailNodeIds/:tab?',
      props: true,
      component: EditModal,
      beforeEnter: (to, from, next) => {
        return store
          .dispatch('currentChannel/loadChannel')
          .catch(error => {
            throw new Error(error);
          })
          .then(() => next());
      },
    },
    {
      name: RouteNames.ADD_EXERCISE,
      path: '/:nodeId/:detailNodeId?/exercise/:detailNodeIds/:tab?',
      props: true,
      component: EditModal,
      beforeEnter: (to, from, next) => {
        return store
          .dispatch('currentChannel/loadChannel')
          .catch(error => {
            throw new Error(error);
          })
          .then(() => next());
      },
    },
    {
      name: RouteNames.UPLOAD_FILES,
      path: '/:nodeId/:detailNodeId?/upload/:detailNodeIds?/:tab?',
      props: true,
      component: EditModal,
      beforeEnter: (to, from, next) => {
        return store
          .dispatch('currentChannel/loadChannel')
          .catch(error => {
            throw new Error(error);
          })
          .then(() => next());
      },
    },
    {
      name: RouteNames.ORIGINAL_SOURCE_NODE_IN_TREE_VIEW,
      path: '/originalSourceNode/:originalSourceNodeId',
      beforeEnter: (to, from, next) => {
        return store
          .dispatch('contentNode/loadContentNodeByNodeId', to.params.originalSourceNodeId)
          .then(node => {
            next({
              name: RouteNames.TREE_VIEW,
              params: {
                nodeId: node.parent,
                detailNodeId: node.id,
              },
            });
          });
      },
    },
    {
      name: RouteNames.TREE_VIEW,
      path: '/:nodeId/:detailNodeId?',
      props: true,
      component: TreeView,
      beforeEnter: (to, from, next) => {
        return store
          .dispatch('currentChannel/loadChannel')
          .catch(error => {
            throw new Error(error);
          })
          .then(() => next());
      },
    },
  ],
});

export default router;
