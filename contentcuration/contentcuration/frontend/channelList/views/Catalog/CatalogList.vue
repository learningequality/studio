<template>

  <div>
    <v-navigation-drawer clipped app>
      <CatalogFilters />
    </v-navigation-drawer>
    <v-container fluid>
      <LoadingText v-if="loading" />
      <v-layout v-else grid wrap>
        <v-flex xs12>
          <p class="title">
            {{ $tr('resultsText', {count: itemList.length}) }}
          </p>
        </v-flex>
        <v-flex xs12>
          <CatalogListItem v-for="item in itemList" :key="item.id" :itemID="item.id" />
        </v-flex>
      </v-layout>
    </v-container>
    <keep-alive>
      <router-view v-if="$route.params.itemID" :key="$route.params.itemID" />
    </keep-alive>
  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import CatalogListItem from './CatalogListItem';
  import CatalogFilters from './CatalogFilters';
  import LoadingText from 'shared/views/LoadingText';

  export default {
    name: 'CatalogList',
    components: {
      CatalogListItem,
      LoadingText,
      CatalogFilters,
    },
    data() {
      return {
        loading: true,
        loadError: false,
      };
    },
    computed: {
      ...mapGetters('catalog', ['itemList']),
    },
    mounted() {
      this.loadCatalog();
    },
    methods: {
      ...mapActions('catalog', ['loadCatalogList']),
      loadCatalog() {
        this.loading = true;
        return this.loadCatalogList()
          .then(() => {
            this.loading = false;
          })
          .catch(() => {
            this.loadError = true;
            this.loading = false;
          });
      },
    },
    $trs: {
      resultsText: '{count, plural,\n =1 {# result found}\n other {# results found}}',
    },
  };

</script>


<style lang="less" scoped>

</style>
