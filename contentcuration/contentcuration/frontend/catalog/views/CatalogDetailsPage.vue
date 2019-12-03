<template>

  <v-container fluid>
    <v-content>
      <router-link :to="{name: 'CatalogList'}">
        Back
      </router-link>
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
        <div v-else>
          {{ channel }}
        </div>
      </v-container>
    </v-content>
  </v-container>

</template>


<script>

  import client from 'shared/client';

  export default {
    name: 'CatalogDetailsPage',
    data() {
      return {
        loading: false,
        channel: null,
        loadError: false,
      };
    },
    mounted() {
      this.loadCatalogChannel();
    },
    methods: {
      loadCatalogChannel() {
        this.loading = true;
        return client
          .get(window.Urls.get_catalog_details(this.$route.params.itemID))
          .then(response => {
            this.loading = false;
            this.channel = response.data;
          })
          .catch(() => {
            this.loadError = true;
          });
      },
    },
    $trs: {
      loadingText: 'Loading',
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
