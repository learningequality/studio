<template>

  <VNavigationDrawer
    v-model="drawer"
    absolute
    temporary
  >
    <VToolbar color="primary" dark>
      <VBtn flat icon @click="drawer = false">
        <Icon>clear</Icon>
      </VBtn>
      <VToolbarTitle class="notranslate">
        Kolibri Studio
      </VToolbarTitle>
    </VToolbar>
    <VList>
      <VListTile :href="editableChannelsLink">
        <VListTileAction>
          <Icon>home</Icon>
        </VListTileAction>
        <VListTileContent class="subheading">
          <VListTileTitle>{{ $tr('editableChannelsLink') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>
      <VListTile :href="starredChannelsLink">
        <VListTileAction>
          <Icon>star</Icon>
        </VListTileAction>
        <VListTileContent class="subheading">
          <VListTileTitle>{{ $tr('starredChannelsLink') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>
      <VListTile :href="viewOnlyChannelsLink">
        <VListTileAction>
          <Icon color="red">
            outdoor_grill
          </Icon>
        </VListTileAction>
        <VListTileContent class="subheading">
          <VListTileTitle>{{ $tr('viewOnlyChannelsLink') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>
      <VListTile :href="publicChannelsLink">
        <VListTileAction>
          <Icon>public</Icon>
        </VListTileAction>
        <VListTileContent class="subheading">
          <VListTileTitle>{{ $tr('publicChannelsLink') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>
      <VListTile :href="channelSetsLink">
        <VListTileAction>
          <Icon>view_list</Icon>
        </VListTileAction>
        <VListTileContent class="subheading">
          <VListTileTitle>{{ $tr('channelSetsLink') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>
      <VDivider />
      <VListTile v-if="user.is_admin" :href="administrationLink">
        <VListTileAction>
          <Icon>people</Icon>
        </VListTileAction>
        <VListTileContent class="subheading">
          <VListTileTitle>{{ $tr('administrationLink') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>
      <VListTile :href="settingsLink">
        <VListTileAction>
          <Icon>settings</Icon>
        </VListTileAction>
        <VListTileContent class="subheading">
          <VListTileTitle>{{ $tr('settingsLink') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>
      <VListTile :href="helpLink" target="_blank">
        <VListTileAction>
          <Icon>help_outline</Icon>
        </VListTileAction>
        <VListTileContent class="subheading">
          <VListTileTitle>{{ $tr('helpLink') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>
      <VListTile :href="logoutLink">
        <VListTileAction>
          <Icon>exit_to_app</Icon>
        </VListTileAction>
        <VListTileContent class="subheading">
          <VListTileTitle>{{ $tr('logoutLink') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>
    </VList>
  </VNavigationDrawer>

</template>


<script>

  import { mapState } from 'vuex';

  export default {
    name: 'ChannelNavigationDrawer',
    props: {
      value: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      drawer: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      editableChannelsLink() {
        return '/channels/#/channels/edit';
      },
      viewOnlyChannelsLink() {
        return '/channels/#/channels/view';
      },
      publicChannelsLink() {
        return '/channels/#/channels/public';
      },
      starredChannelsLink() {
        return '/channels/#/channels/bookmark';
      },
      channelSetsLink() {
        return '/channels/#/channels/collections';
      },
      administrationLink() {
        return '/administration';
      },
      settingsLink() {
        return '/settings/profile';
      },
      helpLink() {
        return 'https://kolibri-studio.readthedocs.io/en/latest/index.html';
      },
      logoutLink() {
        return '/accounts/logout';
      },
    },
    $trs: {
      editableChannelsLink: 'My Channels',
      viewOnlyChannelsLink: 'View-Only',
      publicChannelsLink: 'Public',
      starredChannelsLink: 'Starred',
      channelSetsLink: 'Collections',
      administrationLink: 'Administration',
      settingsLink: 'Settings',
      helpLink: 'Help',
      logoutLink: 'Log out',
    },
  };

</script>


<style lang="less" scoped>

</style>
