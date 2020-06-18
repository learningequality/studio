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

      <VToolbarTitle>
        {{ title || $tr('title') }}
      </VToolbarTitle>
      <VSpacer />
      <VToolbarItems>
        <template v-if="loggedIn">
          <VMenu offsetY>
            <template #activator="{ on }">
              <VBtn flat style="text-transform: none;" v-on="on">
                <Icon>person</Icon>
                <span class="mx-2 subheading">{{ user.first_name }}</span>
                <Icon>arrow_drop_down</Icon>
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
      </VToolbarItems>

      <template v-if="$slots.tabs" #extension>
        <VTabs
          show-arrows
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
    props: {
      title: {
        type: String,
        required: false,
      },
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
      help: 'Help and support',
      logIn: 'Log In',
      logOut: 'Log Out',
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

  /deep/ .v-tabs__div {
    min-width: 160px;
  }

</style>
