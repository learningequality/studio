import VueRouter from 'vue-router';
import { RouterNames } from './constants';
import TreeView from './views/TreeView';
import StagingTreePage from './pages/StagingTreePage';
import store from './store';
import AddPreviousStepsPage from './pages/AddPreviousStepsPage';
import AddNextStepsPage from './pages/AddNextStepsPage';
import TrashModal from './views/trash/TrashModal';
import SearchOrBrowseWindow from './views/ImportFromChannels/SearchOrBrowseWindow';
import ReviewSelectionsPage from './views/ImportFromChannels/ReviewSelectionsPage';
import EditModal from './components/edit/EditModal';
import { RouterNames as ChannelRouterNames } from 'frontend/channelList/constants';
import Sandbox from 'shared/views/Sandbox';
import ChannelModal from 'shared/views/channel/ChannelModal';
import ChannelDetailsModal from 'shared/views/channel/ChannelDetailsModal';

const router = new VueRouter({
  routes: [
    {
      name: RouterNames.SANDBOX,
      path: '/sandbox/:nodeId',
      props: true,
      component: Sandbox,
      beforeEnter: (to, from, next) => {
        const channelPromise = store.dispatch('currentChannel/loadChannel');
        const nodePromise = store.dispatch('contentNode/loadContentNode', to.params.nodeId);
        // api call to get ancestors if nodeId is a child descendant???
        return Promise.all([channelPromise, nodePromise])
          .then(() => next())
          .catch(() => {});
      },
    },
    {
      name: RouterNames.TREE_ROOT_VIEW,
      path: '/',
      beforeEnter: (to, from, next) => {
        return store.dispatch('currentChannel/loadChannel').then(channel => {
          const nodeId = channel.root_id;
          return next({
            name: RouterNames.TREE_VIEW,
            params: {
              nodeId,
            },
            replace: true,
          });
        });
      },
    },
    {
      name: RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
      path: '/import/:destNodeId/browse/:channelId?/:nodeId?',
      component: SearchOrBrowseWindow,
      props: true,
    },
    {
      name: RouterNames.IMPORT_FROM_CHANNELS_SEARCH,
      path: '/import/:destNodeId/search/:searchTerm',
      component: SearchOrBrowseWindow,
      props: true,
    },
    {
      name: RouterNames.IMPORT_FROM_CHANNELS_REVIEW,
      path: '/import/:destNodeId/review',
      component: ReviewSelectionsPage,
      props: true,
    },
    // Redirect to staging URL with root node ID
    {
      name: RouterNames.STAGING_TREE_VIEW_REDIRECT,
      path: '/staging',
      beforeEnter: (to, from, next) => {
        return store.dispatch('currentChannel/loadChannel').then(channel => {
          return next({
            name: RouterNames.STAGING_TREE_VIEW,
            params: {
              nodeId: channel.staging_root_id || '',
            },
            replace: true,
          });
        });
      },
    },
    {
      name: RouterNames.STAGING_TREE_VIEW,
      path: '/staging/:nodeId/:detailNodeId?',
      props: true,
      component: StagingTreePage,
    },
    {
      name: RouterNames.ADD_PREVIOUS_STEPS,
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
      name: RouterNames.ADD_NEXT_STEPS,
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
      name: RouterNames.TRASH,
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
      name: ChannelRouterNames.CHANNEL_DETAILS,
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
      name: ChannelRouterNames.CHANNEL_EDIT,
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
      name: RouterNames.CONTENTNODE_DETAILS,
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
      name: RouterNames.ADD_TOPICS,
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
      name: RouterNames.ADD_EXERCISE,
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
      name: RouterNames.UPLOAD_FILES,
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
      name: RouterNames.ORIGINAL_SOURCE_NODE_IN_TREE_VIEW,
      path: '/originalSourceNode/:originalSourceNodeId',
      beforeEnter: (to, from, next) => {
        return store
          .dispatch('contentNode/loadContentNodeByNodeId', to.params.originalSourceNodeId)
          .then(node => {
            next({
              name: RouterNames.TREE_VIEW,
              params: {
                nodeId: node.parent,
                detailNodeId: node.id,
              },
            });
          });
      },
    },
    {
      name: RouterNames.TREE_VIEW,
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
