<template>

  <VApp>
    <AppBar>
      <template #tabs show-arrows>
        <VLayout justify-start>
          <VTab :to="channelsLink">
            Channels
          </VTab>
          <VTab :to="usersLink">
            Users
          </VTab>
        </VLayout>
      </template>
    </AppBar>
    <VContent>
      <VContainer fluid>
        <RouterView />
      </VContainer>
    </VContent>
    <GlobalSnackbar />
  </VApp>

</template>


<script>

  import { channelsLink, usersLink } from '../router';
  import AppBar from 'shared/views/AppBar';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';

  export default {
    name: 'AdministrationIndex',
    components: {
      AppBar,
      GlobalSnackbar,
    },
    computed: {
      channelsLink,
      usersLink,
    },
  };

</script>


<style lang="less">

  h1 {
    font-size: 24px;
  }

  td {
    height: 49px !important;
    white-space: nowrap;
  }

</style>
