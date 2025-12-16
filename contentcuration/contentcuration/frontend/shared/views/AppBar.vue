<template>

  <div>
    <VToolbar
      app
      :clipped-left="!$isRTL"
      :clipped-right="$isRTL"
      color="appBar"
      height="56"
      :tabs="Boolean($slots.tabs)"
    >
      <VToolbarSideIcon
        v-if="loggedIn"
        @click="drawer = true"
      />
      <VToolbarSideIcon
        v-else
        :href="homeLink"
        exact
        color="appBar"
        class="ma-0"
        style="border-radius: 8px"
      >
        <KLogo
          altText="Kolibri Logo with background"
          :size="36"
        />
      </VToolbarSideIcon>

      <VToolbarTitle>
        {{ title || $tr('title') }}
      </VToolbarTitle>
      <VSpacer />
      <VToolbarItems>
        <template v-if="loggedIn">
          <BaseMenu>
            <template #activator="{ on }">
              <VBtn
                flat
                style="text-transform: none"
                v-on="on"
              >
                <KIconButton
                  :disabled="true"
                  icon="person"
                  color="black"
                />
                <span class="mx-2 subheading">{{ user.first_name }}</span>
                <KIconButton
                  :disabled="true"
                  icon="dropdown"
                  color="black"
                />
              </VBtn>
            </template>
            <VList>
              <VListTile
                v-if="user.is_admin"
                :href="administrationLink"
              >
                <VListTileAction>
                  <KIconButton
                    :disabled="true"
                    icon="people"
                  />
                </VListTileAction>
                <VListTileTitle v-text="$tr('administration')" />
              </VListTile>
              <VListTile @click="showNotificationsModal">
                <VListTileAction>
                  <KIconButton
                    :disabled="true"
                    icon="cloud"
                  />
                </VListTileAction>
                <VListTileTitle v-text="notificationsLabel$()" />
              </VListTile>
              <VListTile :href="settingsLink">
                <VListTileAction>
                  <KIconButton
                    :disabled="true"
                    icon="settings"
                  />
                </VListTileAction>
                <VListTileTitle v-text="$tr('settings')" />
              </VListTile>
              <VListTile @click="showLanguageModal = true">
                <VListTileAction>
                  <KIconButton
                    :disabled="true"
                    icon="language"
                  />
                </VListTileAction>
                <VListTileTitle v-text="$tr('changeLanguage')" />
              </VListTile>
              <VListTile
                href="http://kolibri-studio.readthedocs.io/en/latest/index.html"
                target="_blank"
              >
                <VListTileAction>
                  <KIconButton
                    :disabled="true"
                    icon="openNewTab"
                  />
                </VListTileAction>
                <VListTileTitle v-text="$tr('help')" />
              </VListTile>
              <VListTile @click="logout">
                <VListTileAction>
                  <KIconButton
                    :disabled="true"
                    icon="logout"
                  />
                </VListTileAction>
                <VListTileTitle v-text="$tr('logOut')" />
              </VListTile>
            </VList>
          </BaseMenu>
        </template>
        <template v-else>
          <BaseMenu>
            <template #activator="{ on }">
              <VBtn
                flat
                style="text-transform: none"
                v-on="on"
              >
                <Icon icon="person" />
                <Icon icon="dropdown" />
              </VBtn>
            </template>
            <VList>
              <VListTile :href="'/accounts/'">
                <VListTileAction>
                  <Icon icon="login" />
                </VListTileAction>
                <VListTileTitle v-text="$tr('logIn')" />
              </VListTile>
              <VListTile @click="showLanguageModal = true">
                <VListTileAction>
                  <Icon icon="language" />
                </VListTileAction>
                <VListTileTitle v-text="$tr('changeLanguage')" />
              </VListTile>
            </VList>
          </BaseMenu>
        </template>
      </VToolbarItems>

      <template
        v-if="$slots.tabs"
        #extension
      >
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
  import Tabs from 'shared/views/Tabs';
  import MainNavigationDrawer from 'shared/views/MainNavigationDrawer';
  import LanguageSwitcherModal from 'shared/languageSwitcher/LanguageSwitcherModal';
  import { Modals } from 'shared/constants';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  export default {
    name: 'AppBar',
    components: {
      LanguageSwitcherModal,
      MainNavigationDrawer,
      Tabs,
    },
    setup() {
      const { notificationsLabel$ } = communityChannelsStrings;
      return {
        notificationsLabel$,
      };
    },
    props: {
      title: {
        type: String,
        required: false,
        default: null,
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
      showNotificationsModal() {
        this.$router.push({
          query: {
            ...this.$route.query,
            modal: Modals.NOTIFICATIONS,
          },
        });
      },
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


<style lang="scss" scoped>

  .v-toolbar {
    z-index: 5;
  }

  .kolibri-icon {
    border-radius: 8px;
  }

  ::v-deep .v-tabs__div {
    min-width: 160px;
  }

</style>
