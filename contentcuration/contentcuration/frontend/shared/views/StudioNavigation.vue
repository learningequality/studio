<template>

  <div
    ref="studioNavigation"
    class="studio-navigation"
    :style="{
      backgroundColor: $themeTokens.appBar,
      color: $themeTokens.text,
    }"
  >
    
    <header>
      <SkipNavigationLink />
      
      <KToolbar
        type="clear"
        :style="[
          {
            overflowX: 'hidden',  
            backgroundColor: $themeTokens.appBar,
            height: '56px',
          },
          containerStyles
        ]"
        :raised="false"
      >
        <template #icon>
          <KIconButton
            v-if="loggedIn"
            icon="menu"
            :color="$themeTokens.text"
            :ariaLabel="$tr('openMenu')"
            @click="toggleSidePanel"
          />
          <KExternalLink
            v-else
            :href="homeLink"
            class="studio-navigation-logo-link"
          >
            <KLogo
              altText="Kolibri Logo with background"
              :size="36"
            />
          </KExternalLink>
        </template>

        <template #brand>
          <div
            class="studio-navigation-title-container"
            style="max-width: 160px"
          >
            <span>
              {{ truncatedTitle }}
            </span>
          </div>
        </template>

        <template #actions>
          <div
            ref="studioNavigationActions"
            aria-live="polite"
            class="studio-navigation-actions"
          >
            <template v-if="loggedIn">
              <div
                class="studio-navigation-menu"
                :aria-label="$tr('userMenuLabel')"
              >
                <KIconButton
                  :disabled="true"
                  icon="person"
                  color="black"
                />
                <span
                  class="mx-2 subheading"
                >
                  {{ user.first_name }}
                </span>
                <KIconButton
                  :disabled="true"
                  icon="dropdown"
                  color="black"
                />

                <KDropdownMenu
                  :options="userMenuItems"
                  :hasIcons="true"
                  @select="handleUserMenuSelect"
                />
              </div>
            </template>

            <template v-else>
              <div
                class="studio-navigation-menu"
                :aria-label="$tr('guestMenuLabel')"
              >
                <KIconButton
                  :disabled="true"
                  icon="person"
                  color="black"
                />
                <KIconButton
                  :disabled="true"
                  icon="dropdown"
                  color="black"
                />

                <KDropdownMenu
                  :options="guestMenuItems"
                  :hasIcons="true"
                  @select="handleGuestMenuSelect"
                />
              </div>
            </template>
          </div>
        </template>
      </KToolbar>

    </header>
    <div
      v-if="hasTabs"
      :aria-label="$tr('mainNavigationLabel')"
    >
      <div 
        class="studio-navigation-tabs-wrapper"
        :style="tabsWrapperStyles"
      >
        <div
          ref="tabsContainer"
          class="studio-navigation-tabs-container"
          :style="containerStyles"
        >
          <slot name="tabs"></slot>
        </div>
      </div>
    </div>
    <SidePanelModal
      v-if="loggedIn && sidePanelOpen"
      alignment="left"
      sidePanelWidth="300px"
      :aria-label="$tr('navigationMenu')"
      closeButtonIconType="clear"
      immersive
      fixedWidth
      @closePanel="sidePanelOpen = false"
    >
      <template #header>
        <div class="side-panel-header">
          <span class="side-panel-title">
            {{ $tr('title') }}
          </span>
        </div>
      </template>

      <template #default>
        <div class="side-panel-content">
          <nav class="side-panel-nav">
            <SidePanelOption
              :label="$tr('channelsLink')"
              :link="channelsLink"
              icon="home"
              @click="sidePanelOpen = false"
            />

            <SidePanelOption
              v-if="user?.is_admin"
              :label="$tr('administrationLink')"
              :link="administrationLink"
              icon="people"
              @click="sidePanelOpen = false"
            />

            <SidePanelOption
              :label="$tr('settingsLink')"
              :link="settingsLink"
              icon="settings"
              @click="sidePanelOpen = false"
            />

            <!-- Action buttons (no links) -->
            <SidePanelOption
              :label="$tr('changeLanguage')"
              icon="language"
              @select="openLanguageModal"
            />

            <SidePanelOption
              :label="$tr('helpLink')"
              icon="openNewTab"
              @select="navigateToHelp"
            />

            <SidePanelOption
              :label="$tr('logoutLink')"
              icon="logout"
              @select="handleLogout"
            />
          </nav>

          <div class="side-panel-footer">
            <div>
              <KLogo
                altText="Kolibri logo"
                :showBackground="true"
                :size="88"
              />
            </div>

            <KExternalLink
              :href="copyrightLink"
              class="side-panel-copyright"
              :text="$tr('copyright', { year: new Date().getFullYear() })"
              openInNewTab
              @click.native="sidePanelOpen = false"
            />

            <KExternalLink
              href="https://community.learningequality.org/c/support/studio"
              openInNewTab
              :text="$tr('giveFeedback')"
              @click.native="sidePanelOpen = false"
            />
          </div>
        </div>
      </template>
    </SidePanelModal>
    <LanguageSwitcherModal
      v-if="showLanguageModal"
      :style="{ color: $themeTokens.text }"
      @cancel="showLanguageModal = false"
    />
  </div>

</template>


<script>

  import { mapActions, mapState, mapGetters } from 'vuex';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import LanguageSwitcherModal from '../languageSwitcher/LanguageSwitcherModal.vue';
  import SidePanelModal from './SidePanelModal';
  import SkipNavigationLink from './SkipNavigationLink.vue';
  import SidePanelOption from './SidePanelOption.vue';


  export default {
    name: 'StudioNavigation',
    components: {
      SidePanelModal,
      SidePanelOption,
      SkipNavigationLink,
      LanguageSwitcherModal,
    },
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      return {
        windowBreakpoint,
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
        sidePanelOpen: false,
        showLanguageModal: false,
        toolbarWidth: 0,
      };
    },
    
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      ...mapGetters(['loggedIn']),
      hasTabs() {
        return !!this.$slots.tabs;
      },
      homeLink() {
        return window.Urls?.channels() || '/';
      },
      channelsLink() {
        return window.Urls?.channels() || '/channels';
      },
      administrationLink() {
        return window.Urls?.administration() || '/administration';
      },
      settingsLink() {
        return window.Urls?.settings() || '/settings';
      },
      helpLink() {
        return 'https://kolibri-studio.readthedocs.io/en/latest/index.html';
      },
      copyrightLink() {
        return 'https://learningequality.org/';
      },
      truncatedTitle() {
        const displayTitle = this.title || this.$tr('title');
        const offset = (this.$refs.studioNavigationActions?.clientWidth || 0) + 100;
        const averageCharWidth = 10;
        const availableWidth = this.toolbarWidth - offset;
        const maxChars = availableWidth > 0 ? Math.floor(availableWidth / averageCharWidth) : 1;
        return this.truncateText(displayTitle, maxChars);
      },
      containerStyles() {
        return {
          padding: this.windowBreakpoint <= 3 ? '0 16px' : '0 24px',
        };
      },
      userMenuItems() {
        const items = [];

        if (this.user?.is_admin) {
          items.push({
            label: this.$tr('administration'),
            value: 'administration',
            icon: 'people',
          });
        }

        items.push(
          {
            label: this.$tr('settings'),
            value: 'settings',
            icon: 'settings',
          },
          {
            label: this.$tr('changeLanguage'),
            value: 'change-language',
            icon: 'language',
          },
          {
            label: this.$tr('help'),
            value: 'help',
            icon: 'openNewTab',
          },
          {
            label: this.$tr('logOut'),
            value: 'logout',
            icon: 'logout',
          },
        );

        return items;
      },
      guestMenuItems() {
        return [
          {
            label: this.$tr('logIn'),
            value: 'login',
            icon: 'login',
          },
          {
            label: this.$tr('changeLanguage'),
            value: 'change-language',
            icon: 'language',
          },
        ];
      },
      tabsWrapperStyles() {
        return {
          padding: this.windowBreakpoint <= 2 ? '0 48px' : '0',
        };
      },
    },
    mounted() {
      this.updateWindowWidth();
      this.updateToolbarWidth();
      window.addEventListener('resize', this.handleResize);
    },
    updated() {
      this.$nextTick(() => {
        this.updateToolbarWidth();
      });
    },
    beforeDestroy() {
      window.removeEventListener('resize', this.handleResize);
    },
    methods: {
      ...mapActions(['logout']),
      toggleSidePanel() {
        this.sidePanelOpen = !this.sidePanelOpen;
      },

      closeSidePanelAndNavigate(url) {
        this.sidePanelOpen = false;
        window.location.href = url;
      },
      navigateToAdministration() {
        this.closeSidePanelAndNavigate(this.administrationLink);
      },
      navigateToSettings() {
        this.trackClick('Settings');
        this.closeSidePanelAndNavigate(this.settingsLink);
      },
      navigateToHelp() {
        this.sidePanelOpen = false;
        this.trackClick('Help');
        window.open(this.helpLink, '_blank', 'noopener,noreferrer');
      },
      handleLogout() {
        this.sidePanelOpen = false;
        this.logout();
      },
      handleUserMenuSelect(item) {
        switch (item.value) {
          case 'administration':
            this.navigateToAdministration();
            break;
          case 'settings':
            this.navigateToSettings();
            break;
          case 'change-language':
            this.showLanguageModal = true;
            break;
          case 'help':
            this.trackClick('Help');
            window.open(this.helpLink, '_blank');
            break;
          case 'logout':
            this.logout();
            break;
        }
      },
      handleGuestMenuSelect(item) {
        switch (item.value) {
          case 'login':
            window.location.href = '/accounts/';
            break;
          case 'change-language':
            this.showLanguageModal = true;
            break;
        }
      },
      trackClick(label) {
        if (this.$analytics) {
          this.$analytics.trackClick('general', `User dropdown - ${label}`);
        }
      },
      openLanguageModal() {
        this.sidePanelOpen = false;
        this.showLanguageModal = true;
      },
      handleResize() {
        this.updateToolbarWidth();
      },
      updateToolbarWidth() {
        this.toolbarWidth = this.$refs.studioNavigation?.clientWidth || 0;
      },
      truncateText(value, maxLength) {
        if (value && value.length > maxLength) {
          return value.substring(0, maxLength) + '...';
        }
        return value;
      },

    },
    $trs: {
      title: 'Kolibri Studio',
      openMenu: 'Open navigation menu',
      navigationMenu: 'Navigation menu',
      mainNavigationLabel: 'Main navigation',
      userMenuLabel: 'User menu',
      guestMenuLabel: 'Guest menu',
      administration: 'Administration',
      changeLanguage: 'Change language',
      settings: 'Settings',
      help: 'Help and support',
      logIn: 'Sign in',
      logOut: 'Sign out',
      channelsLink: 'Channels',
      administrationLink: 'Administration',
      settingsLink: 'Settings',
      helpLink: 'Help and support',
      logoutLink: 'Sign out',
      copyright: '© {year} Learning Equality',
      giveFeedback: 'Give feedback',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .studio-navigation {
    top: 0;
    z-index: 5;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.42);
  }

  .studio-navigation-logo-link {
    border-radius: 8px;
  }

  .studio-navigation-title-container {
    white-space: nowrap;
    font-size: 20px;
    font-weight: 500;
    padding-inline-start: 20px;
  }


  .studio-navigation-actions {
    display: flex;
    align-items: center;
  }

  .studio-navigation-tabs-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  

  .studio-navigation-tabs-container {
    position: relative;
    display: flex;
    flex: 1;
    overflow-x: auto;
    height: 48px;
    list-style-type: none;
    white-space: nowrap;
    scrollbar-width: none;
    scroll-behavior: auto;
  }

  /* Side panel styles */
  .side-panel-header {
    display: flex;
    align-items: center;
    height: 63.2px;
    padding-right: 74px;
  }

  .side-panel-title {
    margin-left: 16px;
    font-size: 20px;
    font-weight: 500;
  }

  .side-panel-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  ::v-deep .side-panel-content {
    padding: 0 !important;
  }

  .side-panel-nav {
    padding: 8px 0;
  }


  .side-panel-footer {
    padding: 24px;
    text-align: left;
  }

  .side-panel-copyright {
    margin-bottom: 24px;
    font-size: 14px;
  }
  .studio-navigation-menu {
    cursor: pointer;
    transition: background-color 0.2s ease;
    &:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
  }

</style>