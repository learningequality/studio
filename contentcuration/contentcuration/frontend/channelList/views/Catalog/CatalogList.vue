<template>

  <div>
    <v-btn
      v-if="$vuetify.breakpoint.smAndDown"
      color="primary"
      flat
      @click.stop="drawer = true"
    >
      {{ $tr('searchText') }}
    </v-btn>
    <v-navigation-drawer
      v-model="drawer"
      :permanent="$vuetify.breakpoint.mdAndUp"
      app
      clipped
    >
      <div v-if="$vuetify.breakpoint.smAndDown" style="text-align: right;">
        <v-btn icon flat>
          <v-icon @click="drawer = false">
            clear
          </v-icon>
        </v-btn>
      </div>
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
        drawer: false,
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
      searchText: 'Search',
    },
  };

</script>


<style lang="less" scoped>

</style>
