// include all logic in "base" entrypoint
import Vue from 'vue';
import VueRouter from 'vue-router';
import CatalogList from './views/CatalogList.vue';
import CatalogDetailsPage from './views/CatalogDetailsPage.vue';

Vue.use(VueRouter);

const router = new VueRouter({
  routes: [
    {
      name: 'CatalogList',
      path: '/',
      component: CatalogList,
    },
    {
      path: '/:itemID',
      name: 'CatalogDetails',
      component: CatalogDetailsPage,
    },
  ],
});

export default router;
module.exports = router;
