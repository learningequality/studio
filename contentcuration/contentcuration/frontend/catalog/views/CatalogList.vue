<template>

  <v-container fluid>
    <v-navigation-drawer permanent absolute app>
      <v-toolbar flat>
        <v-list>
          <v-list-tile>
            <v-list-tile-action>
              <VImg src="/static/img/kolibri_login.png" contain max-width="32" />
            </v-list-tile-action>
            <v-list-tile-title>
              {{ $tr('catalogTitle') }}
            </v-list-tile-title>
          </v-list-tile>
        </v-list>
      </v-toolbar>

      <v-divider />
      <CatalogFilters />

    </v-navigation-drawer>
    <v-content>
      <v-container fluid fill-height>
        <v-layout v-if="loading" align-center justify-center fill-height class="loading-text">
          <v-flex xs12>
            <v-progress-circular
              :size="70"
              :width="7"
              color="grey"
              indeterminate
            />
            <p>{{ $tr('loadingText') }}</p>
          </v-flex>
        </v-layout>
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
    </v-content>
  </v-container>

</template>


<script>

  import CatalogListItem from './CatalogListItem';
  import CatalogFilters from './CatalogFilters';
  import client from 'shared/client';

  export default {
    name: 'CatalogList',
    components: {
      CatalogFilters,
      CatalogListItem,
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
      catalogTitle: 'Kolibri Channel Catalog',
      loadingText: 'Loading',
      resultsText: '{count, plural,\n =1 {# result found}\n other {# results found}}',
    },
  };

</script>


<style lang="less" scoped>

  .loading-text {
    min-height: 50vh;
    text-align: center;
    p {
      margin-top: 20px;
      font-size: 14pt;
      color: gray;
    }
  }

</style>
