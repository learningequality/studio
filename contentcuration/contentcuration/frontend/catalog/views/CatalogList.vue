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
              Kolibri Channel Catalog
            </v-list-tile-title>
          </v-list-tile>
        </v-list>
      </v-toolbar>

      <v-divider />
      <v-container>
        <v-text-field
          :label="$tr('searchLabel')"
          prepend-inner-icon="search"
        />
        <LanguageDropdown />
      </v-container>

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
              {{ $tr('resultsText', {count: channels.length}) }}
            </p>
          </v-flex>
          <v-flex v-for="channel in channels" :key="channel.id" xs12>
            <v-card :to="{name: 'CatalogDetails', params: {channelID: channel.id}}">
              <v-container>
                <v-layout row>
                  <v-flex xs3>
                    <VImg :src="channel.thumbnail_url" :aspect-ratio="16/9" />
                  </v-flex>
                  <v-flex xs9>
                    <h1 class="display-1">
                      {{ channel.name }}
                    </h1>
                    <br>
                    <p>{{ channel.description }}</p>
                  </v-flex>
                </v-layout>
              </v-container>
            </v-card>
          </v-flex>


        </v-layout>
      </v-container>
    </v-content>
  </v-container>

</template>


<script>

  import client from 'shared/client';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown';

  export default {
    name: 'CatalogList',
    components: {
      LanguageDropdown,
    },
    data() {
      return {
        loading: false,
        channels: [],
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
            this.channels = response.data;
          })
          .catch(() => {
            this.loadError = true;
          });
      },
    },
    $trs: {
      loadingText: 'Loading',
      searchLabel: 'Keywords',
      resultsText: '{count, plural,\n =1 {# channel found}\n other {# channels found}}',
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
