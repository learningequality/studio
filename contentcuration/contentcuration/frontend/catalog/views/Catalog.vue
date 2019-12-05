<template>

  <v-app>
    <AppBar />
    <v-navigation-drawer clipped app>
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

  import AppBar from '../../shared/views/AppBar';
  import CatalogFilters from './CatalogFilters';

  export default {
    name: 'Catalog',
    components: {
      AppBar,
      CatalogFilters,
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

  .v-tooltip__content {
    max-width: 200px;
    text-align: center;
  }

  .v-content {
    background-color: white;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition-timing-function: ease;
    transition-duration: 0.3s;
    transition-property: opacity;
  }

</style>
