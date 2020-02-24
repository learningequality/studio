<template>

  <VApp>
    <AppBar />
    <VContent>
      <VContainer fluid>
        <router-view />
      </VContainer>
    </VContent>
    <GlobalSnackbar />
  </VApp>

</template>


<script>

  import AppBar from 'shared/views/AppBar';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';

  export default {
    name: 'ChannelEditIndex',
    components: {
      AppBar,
      GlobalSnackbar,
    },
  };

</script>


<style lang="less" scoped>

</style>
