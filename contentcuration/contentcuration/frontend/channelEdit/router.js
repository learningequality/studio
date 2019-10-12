import VueRouter from 'vue-router';
import { RouterNames } from './constants';
import Sandbox from 'shared/views/Sandbox';
import TreeView from './views/TreeView';
import client from 'shared/client';
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
        return client.get(window.Urls['channel-detail'](window.channel_id)).then(response => {
          const nodeId = response.data.main_tree;
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
      children: [
        {
          name: RouterNames.CONTENTNODE_DETAILS,
          path: 'details/:nodeId',
          props: true,
          component: EditModal,
        },
        {
          name: RouterNames.MULTI_CONTENTNODE_DETAILS,
          path: 'multidetails/:nodeIds',
          props: true,
          component: EditModal,
        },
      ],
    },
  ],
});

export default router;
