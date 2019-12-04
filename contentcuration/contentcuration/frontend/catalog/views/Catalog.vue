<template>

  <v-app>
    <v-navigation-drawer absolute app>
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

      <transition name="fade">
        <router-view />
      </transition>
    </v-content>
  </v-app>

</template>


<script>

  import CatalogFilters from './CatalogFilters';

  export default {
    name: 'Catalog',
    components: {
      CatalogFilters,
    },
    $trs: {
      catalogTitle: 'Kolibri Channel Catalog',
    },
  };

</script>


<style lang="less">

  html {
    overflow-y: auto !important;
    .title,
    .display,
    .display-1,
    .subheading,
    .v-toolbar__title,
    .v-chip__content {
      font-family: 'Noto Sans' !important;
    }
  }

  body * {
    font-family: 'Noto Sans';
  }

  .fade-enter-active,
  .fade-leave-active {
    transition-timing-function: ease;
    transition-duration: 0.3s;
    transition-property: opacity;
  }

</style>
