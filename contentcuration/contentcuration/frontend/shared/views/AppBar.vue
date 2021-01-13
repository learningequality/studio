<template>

  <div>
    <VToolbar
      app
      dark
      :clipped-left="!$isRTL"
      :clipped-right="$isRTL"
      color="primary"
      height="56"
      :tabs="Boolean($slots.tabs)"
    >
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
          <Menu>
            <template #activator="{ on }">
              <VBtn flat style="text-transform: none;" v-on="on">
                <Icon>person</Icon>
                <span class="mx-2 subheading">{{ user.first_name }}</span>
                <Icon>arrow_drop_down</Icon>
              </VBtn>
            </template>
            <VList>
              <VListTile v-if="user.is_admin" :href="administrationLink">
                <VListTileAction>
                  <Icon>people</Icon>
                </VListTileAction>
                <VListTileTitle v-text="$tr('administration')" />
              </VListTile>
              <VListTile :href="settingsLink">
                <VListTileAction>
                  <Icon>settings</Icon>
                </VListTileAction>
                <VListTileTitle v-text="$tr('settings')" />
              </VListTile>
              <VListTile
                @click="showLanguageModal = true"
              >
                <VListTileAction>
                  <Icon>language</Icon>
                </VListTileAction>
                <VListTileTitle v-text="$tr('changeLanguage')" />
              </VListTile>
              <VListTile
                href="http://kolibri-studio.readthedocs.io/en/latest/index.html"
                target="_blank"
              >
                <VListTileAction>
                  <Icon>open_in_new</Icon>
                </VListTileAction>
                <VListTileTitle v-text="$tr('help')" />
              </VListTile>
              <VListTile @click="logout">
                <VListTileAction>
                  <Icon>exit_to_app</Icon>
                </VListTileAction>
                <VListTileTitle v-text="$tr('logOut')" />
              </VListTile>
            </VList>
          </Menu>
        </template>
        <VBtn v-else href="/accounts" flat>
          {{ $tr('logIn') }}
        </VBtn>
      </VToolbarItems>

      <template v-if="$slots.tabs" #extension>
        <Tabs slider-color="white">
          <slot name="tabs"></slot>
        </Tabs>
      </template>
    </VToolbar>

    <MainNavigationDrawer v-model="drawer" />

    <LanguageSwitcherModal
      v-if="showLanguageModal"
      :style="{ color: $themeTokens.text }"
      @cancel="showLanguageModal = false"
    />

  </div>

</template>


<script>

  import { mapActions, mapState, mapGetters } from 'vuex';
  import KolibriLogo from './KolibriLogo';
  import Tabs from 'shared/views/Tabs';
  import MainNavigationDrawer from 'shared/views/MainNavigationDrawer';
  import LanguageSwitcherModal from 'shared/languageSwitcher/LanguageSwitcherModal';

  export default {
    name: 'AppBar',
    components: {
      KolibriLogo,
      LanguageSwitcherModal,
      MainNavigationDrawer,
      Tabs,
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
        showLanguageModal: false,
      };
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      ...mapGetters(['loggedIn']),
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
      title: 'Kolibri Studio',
      administration: 'Administration',
      changeLanguage: 'Change language',
      settings: 'Settings',
      help: 'Help and support',
      logIn: 'Sign in',
      logOut: 'Sign out',
    },
  };

</script>

<style lang="less" scoped>

  .v-toolbar {
    z-index: 5;
  }

  .kolibri-icon {
    border-radius: 8px;
  }

  /deep/ .v-tabs__div {
    min-width: 160px;
  }

</style>
