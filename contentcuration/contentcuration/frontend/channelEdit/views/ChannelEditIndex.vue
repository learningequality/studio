<template>

  <VApp>
    <AppBar />
    <VContent>
      <VContainer fluid>
        <keep-alive>
          <router-view :key="$route.name" />
        </keep-alive>
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


<style lang="less">

</style>
