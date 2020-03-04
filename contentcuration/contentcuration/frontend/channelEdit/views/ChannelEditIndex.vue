<template>

  <VApp>
    <ToolBar v-if="currentChannel" color="white">
      <VToolbarSideIcon @click="drawer = true" />
      <VToolbarTitle class="notranslate">
        {{ currentChannel.name }}
      </VToolbarTitle>
      <VToolbarItems class="ml-4">
        <IconButton icon="info" :text="$tr('channelDetails')" />
        <IconButton icon="edit" :text="$tr('editChannel')" />
        <IconButton icon="delete" :text="$tr('openTrash')" />
      </VToolbarItems>
      <VSpacer />
      <VToolbarItems>
        <VBtn flat color="primary" class="hidden-sm-and-down">
          {{ $tr('publishButton') }}
        </VBtn>
        <VMenu offset-y>
          <template #activator="{ on }">
            <VBtn flat icon v-on="on">
              <Icon>more_horiz</Icon>
            </VBtn>
          </template>
          <VList>
            <VListTile class="hidden-md-and-up" @click.stop>
              <VListTileTitle>{{ $tr('publishButton') }}</VListTileTitle>
            </VListTile>
            <VListTile @click.stop>
              <VListTileTitle>{{ $tr('getToken') }}</VListTileTitle>
            </VListTile>
            <VListTile @click.stop>
              <VListTileTitle>{{ $tr('shareChannel') }}</VListTileTitle>
            </VListTile>
            <VListTile @click.stop>
              <VListTileTitle>{{ $tr('syncChannel') }}</VListTileTitle>
            </VListTile>
          </VList>
        </VMenu>
      </VToolbarItems>
    </ToolBar>
    <ChannelNavigationDrawer v-model="drawer" />
    <VContent class="pa-0">
      <router-view />
    </VContent>
    <GlobalSnackbar />
  </VApp>

</template>


<script>

  import { mapGetters } from 'vuex';
  import ChannelNavigationDrawer from './ChannelNavigationDrawer';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';

  export default {
    name: 'ChannelEditIndex',
    components: {
      GlobalSnackbar,
      IconButton,
      ChannelNavigationDrawer,
      ToolBar,
    },
    data() {
      return {
        drawer: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel']),
    },
    $trs: {
      channelDetails: 'View channel details',
      editChannel: 'Edit channel details',
      openTrash: 'Open trash',
      publishButton: 'Publish',
      getToken: 'Get token',
      shareChannel: 'Share channel',
      syncChannel: 'Sync channel',
    },
  };

</script>


<style lang="less" scoped>

</style>
