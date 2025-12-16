<template>

  <div>
    <VNavigationDrawer
      v-model="drawer"
      fixed
      temporary
      style="z-index: 1000"
      :right="$isRTL"
    >
      <VToolbar :color="color">
        <VBtn
          flat
          icon
          :tabindex="handleclickTab"
          @click="drawer = false"
        >
          <KIconButton
            icon="clear"
            color="black"
          />
        </VBtn>
        <VToolbarTitle class="notranslate"> Kolibri Studio </VToolbarTitle>
      </VToolbar>
      <VList>
        <VListTile
          :href="channelsLink"
          :tabindex="handleclickTab"
        >
          <VListTileAction>
            <KIconButton
              :disabled="true"
              icon="home"
            />
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle>{{ $tr('channelsLink') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
        <VListTile
          v-if="user.is_admin"
          :href="administrationLink"
          :tabindex="handleclickTab"
        >
          <VListTileAction>
            <KIconButton
              :disabled="true"
              icon="people"
            />
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle>{{ $tr('administrationLink') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
        <VListTile
          :tabindex="handleclickTab"
          @click="showNotificationsModal"
        >
          <VListTileAction>
            <KIconButton
              :disabled="true"
              icon="cloud"
            />
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle>{{ notificationsLabel$() }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
        <VListTile
          :href="settingsLink"
          :tabindex="handleclickTab"
          @click="trackClick('Settings')"
        >
          <VListTileAction>
            <KIconButton
              :disabled="true"
              icon="settings"
            />
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle>{{ $tr('settingsLink') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
        <VListTile @click="openLanguageModal">
          <VListTileAction>
            <KIconButton
              :disabled="true"
              icon="language"
            />
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle v-text="$tr('changeLanguage')" />
          </VListTileContent>
        </VListTile>
        <VListTile
          :href="helpLink"
          :tabindex="handleclickTab"
          target="_blank"
          @click="trackClick('Help')"
        >
          <VListTileAction>
            <KIconButton
              :disabled="true"
              icon="openNewTab"
            />
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle>{{ $tr('helpLink') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
        <VListTile @click="logout">
          <VListTileAction>
            <KIconButton
              :disabled="true"
              icon="logout"
            />
          </VListTileAction>
          <VListTileContent class="subheading">
            <VListTileTitle>{{ $tr('logoutLink') }}</VListTileTitle>
          </VListTileContent>
        </VListTile>
      </VList>
      <VContainer>
        <KLogo
          altText="Kolibri logo"
          :showBackground="true"
          :size="88"
        />
        <ActionLink
          :text="$tr('copyright', { year: new Date().getFullYear() })"
          href="https://learningequality.org/"
          target="_blank"
          :tabindex="handleclickTab"
        />
        <p class="mt-4">
          <ActionLink
            href="https://community.learningequality.org/c/support/studio"
            target="_blank"
            :text="$tr('giveFeedback')"
            :tabindex="handleclickTab"
          />
        </p>
      </VContainer>
    </VNavigationDrawer>

    <LanguageSwitcherModal
      v-if="showLanguageModal"
      :style="{ color: $themeTokens.text }"
      @cancel="showLanguageModal = false"
    />

    <NotificationsModal />
  </div>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import LanguageSwitcherModal from 'shared/languageSwitcher/LanguageSwitcherModal';
  import { Modals } from 'shared/constants';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import NotificationsModal from 'shared/views/NotificationsModal/index.vue';

  export default {
    name: 'MainNavigationDrawer',
    components: {
      LanguageSwitcherModal,
      NotificationsModal,
    },
    setup() {
      const { notificationsLabel$ } = communityChannelsStrings;
      return {
        notificationsLabel$,
      };
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      color: {
        type: String,
        default: 'appBar',
      },
    },
    data() {
      return {
        showLanguageModal: false,
      };
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      handleclickTab() {
        if (this.value) {
          return 0;
        } else {
          return -1;
        }
      },
      drawer: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      channelsLink() {
        return window.Urls.channels();
      },
      administrationLink() {
        return window.Urls.administration();
      },
      settingsLink() {
        return window.Urls.settings();
      },
      helpLink() {
        return 'https://kolibri-studio.readthedocs.io/en/latest/index.html';
      },
    },
    methods: {
      ...mapActions(['logout']),
      trackClick(label) {
        this.$analytics.trackClick('general', `User dropdown - ${label}`);
      },
      openLanguageModal() {
        this.drawer = false;
        this.showLanguageModal = true;
      },
      showNotificationsModal() {
        this.$router.push({
          query: {
            ...this.$route.query,
            modal: Modals.NOTIFICATIONS,
          },
        });
        this.trackClick('Notifications');
      },
    },
    $trs: {
      channelsLink: 'Channels',
      administrationLink: 'Administration',
      settingsLink: 'Settings',
      changeLanguage: 'Change language',
      helpLink: 'Help and support',
      logoutLink: 'Sign out',
      copyright: '© {year} Learning Equality',
      giveFeedback: 'Give feedback',
    },
  };

</script>


<style lang="scss" scoped></style>
