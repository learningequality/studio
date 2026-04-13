<template>

  <SidePanelModal
    v-if="isOpen"
    alignment="left"
    sidePanelWidth="300px"
    :aria-label="$tr('navigationMenu')"
    closeButtonIconType="close"
    closeButtonPosition="left"
    immersive
    fixedWidth
    @closePanel="$emit('close')"
  >
    <template #header>
      <div class="navigation-menu-header">
        <span class="navigation-menu-title">
          {{ $tr('title') }}
        </span>
      </div>
    </template>

    <template #default>
      <div class="navigation-menu-content">
        <nav>
          <ul class="navigation-menu-nav">
            <StudioSideNavOption
              :label="$tr('channels')"
              :link="channelsLink"
              icon="home"
              :active="isActive(channelsLink)"
              @click="handleOptionClick"
            />

            <StudioSideNavOption
              v-if="user && user.is_admin"
              :label="$tr('administration')"
              :link="administrationLink"
              icon="people"
              :active="isActive(administrationLink)"
              @click="handleOptionClick"
            />

            <StudioSideNavOption
              :label="notificationsLabel$()"
              icon="bell"
              @click="showNotificationsModal"
              @keydown.native.enter="showNotificationsModal"
            >
              <template #default>
                <WithNotificationIndicator>
                  <KIcon
                    icon="bell"
                    class="menu-icon"
                    :color="$themeTokens.text"
                  />
                </WithNotificationIndicator>
                <span class="option-label">
                  {{ notificationsLabel$() }}
                </span>
              </template>
            </StudioSideNavOption>

            <StudioSideNavOption
              :label="$tr('settings')"
              :link="settingsLink"
              icon="settings"
              :active="isActive(settingsLink)"
              @click="handleOptionClick"
            />

            <StudioSideNavOption
              :label="$tr('changeLanguage')"
              icon="language"
              @select="handleLanguageChange"
            />

            <StudioSideNavOption
              :label="$tr('help')"
              icon="openNewTab"
              @select="handleHelp"
            />

            <StudioSideNavOption
              :label="$tr('signOut')"
              icon="logout"
              @select="handleLogout"
            />
          </ul>
        </nav>

        <div class="navigation-menu-footer">
          <div>
            <KLogo
              altText="Kolibri logo"
              :showBackground="true"
              :size="88"
            />
          </div>

          <KExternalLink
            :href="copyrightLink"
            class="navigation-menu-copyright"
            :text="$tr('copyright', { year: new Date().getFullYear() })"
            openInNewTab
            @click.native="handleOptionClick"
          />

          <KExternalLink
            href="https://community.learningequality.org/c/support/studio"
            openInNewTab
            :text="$tr('giveFeedback')"
            @click.native="handleOptionClick"
          />
        </div>
      </div>
      <NotificationsModal />
    </template>
  </SidePanelModal>

</template>


<script>

  import { mapState } from 'vuex';
  import SidePanelModal from '../SidePanelModal';
  import WithNotificationIndicator from '../WithNotificationIndicator.vue';
  import StudioSideNavOption from './StudioSideNavOption.vue';
  import { Modals } from 'shared/constants';
  import NotificationsModal from 'shared/views/NotificationsModal/index.vue';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  export default {
    name: 'StudioNavigationSidePanel',
    components: {
      NotificationsModal,
      SidePanelModal,
      StudioSideNavOption,
      WithNotificationIndicator,
    },
    setup() {
      const { notificationsLabel$ } = communityChannelsStrings;
      return {
        notificationsLabel$,
      };
    },
    props: {
      isOpen: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
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
      copyrightLink() {
        return 'https://learningequality.org/';
      },
    },
    methods: {
      isActive(link) {
        return window.location.pathname === link;
      },
      handleOptionClick() {
        this.$emit('close');
      },
      handleLanguageChange() {
        this.$emit('close');
        this.$emit('openLanguageModal');
      },
      handleHelp() {
        this.$emit('close');
        if (this.$analytics) {
          this.$analytics.trackClick('general', 'User dropdown - Help');
        }
        window.open(this.helpLink, '_blank', 'noopener,noreferrer');
      },
      handleLogout() {
        this.$emit('close');
        this.$emit('logout');
      },
      showNotificationsModal() {
        this.$emit('close');
        this.$router.push({
          query: {
            ...this.$route.query,
            modal: Modals.NOTIFICATIONS,
          },
        });
        if (this.$analytics) {
          this.$analytics.trackClick('general', 'User dropdown - Notifications');
        }
      },
    },
    $trs: {
      title: 'Kolibri Studio',
      navigationMenu: 'Navigation menu',
      channels: 'Channels',
      administration: 'Administration',
      settings: 'Settings',
      changeLanguage: 'Change language',
      help: 'Help and support',
      signOut: 'Sign out',
      copyright: '© {year} Learning Equality',
      giveFeedback: 'Give feedback',
    },
  };

</script>


<style lang="scss" scoped>

  .navigation-menu-header {
    display: flex;
    align-items: center;
    height: 56px;
    padding-right: 74px;
  }

  .navigation-menu-title {
    margin-left: 16px;
    font-size: 20px;
    font-weight: 500;
  }

  .navigation-menu-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .navigation-menu-nav {
    padding: 8px 12px;
    margin: 0;
    list-style: none;
  }

  .navigation-menu-footer {
    padding: 24px;
    text-align: left;
  }

  .navigation-menu-copyright {
    margin-bottom: 24px;
    font-size: 14px;
  }

</style>
