<template>

  <VApp>
    <ToolBar dense :color="$themeTokens.primary" :style="{ color: $themeTokens.textInverted }">
      <VToolbarSideIcon @click="drawer = true" />
      <VToolbarTitle class="notranslate">
      {{ $tr('settingsTitle') }}
      </VToolbarTitle>
      <VSpacer />
      <VMenu offsetY>
        <template v-slot:activator="{ on }">
          {{ user.email }}
          <VBtn icon v-on="on">
            <Icon>
              account_circle
            </Icon>
          </VBtn>
        </template>


        <VList>
          <VListTile v-if="user.is_admin" :href="administrationLink">
            <VListTileTitle v-text="$tr('administration')" />
          </VListTile>
          <VListTile :href="settingsLink">
            <VListTileTitle v-text="$tr('settings')" />
          </VListTile>
          <VListTile
            href="http://kolibri-studio.readthedocs.io/en/latest/index.html"
            target="_blank"
          >
            <VListTileTitle v-text="$tr('help')" />
          </VListTile>
          <VListTile @click="logout">
            <VListTileTitle v-text="$tr('logOut')" />
          </VListTile>
        </VList>
      </VMenu>
      <VTabs slot="extension" :color="$themeTokens.primary">
        <VTab :to="{ name: RouterNames.ACCOUNT }">
          {{ $tr('accountLabel') }}
        </VTab>
        <VTab :to="{ name: RouterNames.STORAGE }">
          {{ $tr('storageLabel') }}
        </VTab>
        <VTab :to="{ name: RouterNames.USING_STUDIO }">
          {{ $tr('usingStudioLabel') }}
        </VTab>
      </VTabs>
    </ToolBar>
    <div style="margin-top: 30px;margin-left: 40px; margin-right: auto;"> 
      <router-view />
    </div>
    <GlobalSnackbar />
  </VApp>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';
  import { RouterNames } from '../constants';
  import ToolBar from 'shared/views/ToolBar';

  export default {
    name: 'SettingsIndex',
    components: { GlobalSnackbar, ToolBar },
    data() {
      return {
        drawer: false,
      };
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      RouterNames() {
        return RouterNames;
      },
      settingsLink() {
        return window.Urls.settings();
      },
      administrationLink() {
        return window.Urls.administration();
      },
    },
    methods: {
      ...mapActions(['logout']),
    },
    $trs: {
      settingsTitle: 'Settings',
      accountLabel: 'Account',
      storageLabel: 'Storage',
      usingStudioLabel: 'Using studio',
      administration: 'Administration',
      settings: 'Settings',
      help: 'Help',
      logOut: 'Log Out',
    },
  };

</script>


<style scoped lang="scss">

  /deep/.v-btn .v-btn__content .v-icon {
    color: white;
  }

  /deep/.v-tabs__item {
    color: white !important;
  }

  /deep/.v-tabs__slider.accent {
    background-color: white !important;
  }

  /deep/.v-toolbar__content {
    border-bottom-width: 0;
  }

</style>
