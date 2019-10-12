<template>

  <VApp>
    <AppBar>
    </AppBar>
    <VContent>
      <VContainer fluid>
        <router-view/>
      </VContainer>
    </VContent>
  </VApp>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import AppBar from 'shared/views/AppBar';

  export default {
    name: 'ChannelEditIndex',
    components: {
      AppBar,
    },
  };

</script>


<style lang="less" scoped>

</style>
