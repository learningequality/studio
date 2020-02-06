<template>

  <VApp>
    <AppBar />
    <VContent>
      <VContainer fluid>
        <router-view />
      </VContainer>
    </VContent>
  </VApp>

</template>


<script>

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
