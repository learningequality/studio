<template>

  <v-container fluid>
    <LoadingText v-if="loading" />
    <v-layout v-else grid wrap>
      <v-flex xs12>
        <p class="title">
          {{ $tr('resultsText', {count: items.length}) }}
        </p>
      </v-flex>
      <v-flex xs12>
        <CatalogListItem v-for="item in items" :key="item.id" :item="item" />
      </v-flex>
    </v-layout>
  </v-container>

</template>


<script>

  import LoadingText from '../../shared/views/LoadingText';
  import CatalogListItem from './CatalogListItem';
  import client from 'shared/client';

  export default {
    name: 'CatalogList',
    components: {
      CatalogListItem,
      LoadingText,
    },
    data() {
      return {
        loading: false,
        items: [],
        loadError: false,
      };
    },
    mounted() {
      this.loadCatalog();
    },
    methods: {
      loadCatalog() {
        this.loading = true;
        return client
          .get(window.Urls.catalog_list())
          .then(response => {
            this.loading = false;
            this.items = response.data;
          })
          .catch(() => {
            this.loadError = true;
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
