import VueRouter from 'vue-router';
import { RouterNames } from './constants';
import TreeView from './views/TreeView';
import store from './store';
import Sandbox from 'shared/views/Sandbox';
import EditModal from 'edit_channel/uploader/views/EditModal';

const router = new VueRouter({
  routes: [
    {
      name: RouterNames.SANDBOX,
      path: '/sandbox/',
      component: Sandbox,
    },
    {
      name: RouterNames.TREE_ROOT_VIEW,
      path: '/',
      beforeEnter: (to, from, next) => {
        return store
          .dispatch('channel/loadChannel', store.state.currentChannel.currentChannelId)
          .then(channel => {
            const nodeId = channel.root_id;
            return next({
              name: RouterNames.TREE_VIEW,
              params: {
                nodeId,
              },
            });
          });
      },
    },
    {
      name: RouterNames.TREE_VIEW,
      path: '/:nodeId',
      props: true,
      component: TreeView,
      beforeEnter: (to, from, next) => {
        const channelPromise = store.dispatch(
          'channel/loadChannel',
          store.state.currentChannel.currentChannelId
        );
        const treePromise = store.dispatch(
          'contentNode/loadTree',
          store.state.currentChannel.currentChannelId
        );
        return Promise.all([channelPromise, treePromise])
          .then(() => next())
          .catch(() => {});
      },
      children: [
        // TODO: instead of linking to the edit modal, this should link to
        // the ResourcePanel
        // {
        //   name: RouterNames.CONTENTNODE_DETAILS,
        //   path: 'details/:detailNodeId',
        //   props: true,
        //   component: EditModal,
        // },
        {
          name: RouterNames.VIEW_CONTENTNODES,
          path: 'view/:detailNodeIds',
          props: true,
          component: EditModal,
        },
        {
          name: RouterNames.ADD_TOPICS,
          path: 'topics/:detailNodeIds',
          props: true,
          component: EditModal,
        },
        {
          name: RouterNames.ADD_EXERCISE,
          path: 'exercise/:detailNodeIds',
          props: true,
          component: EditModal,
        },
        {
          name: RouterNames.UPLOAD_FILES,
          path: 'upload/:detailNodeIds?',
          props: true,
          component: EditModal,
        },
      ],
    },
  ],
});

export default router;
