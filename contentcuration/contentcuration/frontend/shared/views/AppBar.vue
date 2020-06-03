<template>

  <div>
    <VToolbar app dark clipped-left color="primary" :tabs="Boolean($slots.tabs)">
      <VToolbarSideIcon v-if="loggedIn" @click="drawer = true" />
      <VToolbarSideIcon
        v-else
        :href="homeLink"
        exact
        color="white"
        class="ma-0"
        style="border-radius: 8px;"
      >
        <KolibriLogo />
      </VToolbarSideIcon>

      <VToolbarTitle class="notranslate">
        {{ $tr('title') }}
      </VToolbarTitle>
      <VSpacer />

      <template v-if="loggedIn">
        <VToolbarTitle class="white--text">
          {{ $tr('helloUser', { username: user.first_name }) }}
        </VToolbarTitle>
        <VMenu offsetY>
          <template v-slot:activator="{ on }">
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
      </template>
      <VBtn v-else href="/accounts" flat>
        {{ $tr('logIn') }}
      </VBtn>

      <template v-if="$slots.tabs" #extension>
        <VTabs
          fixedTabs
          showArrows
          color="transparent"
          sliderColor="white"
        >
          <slot name="tabs"></slot>
        </VTabs>
      </template>
    </VToolbar>

    <MainNavigationDrawer v-model="drawer" />
  </div>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import KolibriLogo from './KolibriLogo';
  import MainNavigationDrawer from 'shared/views/MainNavigationDrawer';

  export default {
    name: 'AppBar',
    components: {
      MainNavigationDrawer,
      KolibriLogo,
    },
    data() {
      return {
        drawer: false,
      };
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
        loggedIn: state => state.session.loggedIn,
      }),
      settingsLink() {
        return window.Urls.settings();
      },
      administrationLink() {
        return window.Urls.administration();
      },
      homeLink() {
        return window.Urls.channels();
      },
    },
    methods: {
      ...mapActions(['logout']),
    },
    $trs: {
      title: 'Kolibri Studio Beta',
      administration: 'Administration',
      settings: 'Settings',
      help: 'Help',
      logIn: 'Log In',
      logOut: 'Log Out',
      helloUser: 'Hello, { username }',
    },
  };

</script>

<style lang="less" scoped>

  /deep/ .v-tabs__icon--next,
  /deep/ .v-tabs__icon--prev {
    margin-top: 10px;
  }
  .kolibri-icon {
    border-radius: 8px;
  }

</style>
