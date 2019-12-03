<template>

  <v-app>
    <transition name="fade" mode="out-in">
      <router-view />
    </transition>
  </v-app>

</template>


<script>

  export default {
    name: 'Catalog',
  };

</script>


<style lang="less">

  html {
    overflow-y: auto !important;
    .title,
    .display-1 {
      font-family: 'Noto Sans' !important;
    }
  }

</style>
