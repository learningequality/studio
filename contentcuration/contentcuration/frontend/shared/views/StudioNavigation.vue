<template>

  <div
    ref="studioNavigation"
    class="studio-navigation"
    :style="{
      backgroundColor: $themeTokens.appBar,
      color: $themeTokens.text,
    }"
  >
    <SkipNavigationLink />

    <KToolbar
      type="clear"
      :style="{
        backgroundColor: $themeTokens.appBar,
        height: '56px',
      }"
      :raised="false"
    >
      <template #icon>
        <!-- Menu button for logged in users -->
        <KIconButton
          v-if="loggedIn"
          icon="menu"
          :color="$themeTokens.text"
          :ariaLabel="$tr('openMenu')"
          @click="toggleSidePanel"
        />

        <!-- Logo link for non-logged in users -->
        <KExternalLink
          v-else
          :href="homeLink"
          class="studio-navigation__logo-link"
        >
          <KLogo
            altText="Kolibri Logo with background"
            :size="36"
          />
        </KExternalLink>
      </template>

      <template #brand>
        <span class="studio-navigation__title">
          {{ title || $tr('title') }}
        </span>
      </template>

      <template #actions>
        <div
          ref="studioNavigationActions"
          aria-live="polite"
          class="studio-navigation__actions"
        >
          <template v-if="loggedIn">
            <KButton
              appearance="flat-button"
              style="text-transform: none"
              :ariaLabel="$tr('userMenuLabel')"
            >
              <KIconButton
                :disabled="true"
                icon="person"
                color="black"
              />
              <span class="mx-2 subheading">
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
            </KButton>
          </template>

          <template v-else>
            <KButton
              appearance="flat-button"
              style="text-transform: none"
              :ariaLabel="$tr('guestMenuLabel')"
              class="guest-menu-button"
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
            </KButton>
          </template>
        </div>
      </template>
    </KToolbar>

    <!-- Tabs extension area (for when tabs are provided) -->
    <div
      v-if="hasTabs"
      class="studio-navigation__tabs-extension"
      :aria-label="$tr('mainNavigationLabel')"
    >
      <div
        ref="tabsContainer"
        role="tablist"
        class="studio-navigation__tabs-container"
        @keydown="handleTabsKeydown"
      >
        <slot name="tabs"></slot>
      </div>
    </div>

    <!-- Side panel (replaces MainNavigationDrawer) -->
    <SidePanelModal
      v-if="loggedIn && sidePanelOpen"
      alignment="left"
      sidePanelWidth="300px"
      :aria-label="$tr('navigationMenu')"
      closeButtonIconType="clear"
      immersive
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
        <div class="sidepanel-content">
          <nav class="side-panel-nav">
            <KExternalLink
              :href="channelsLink"
              class="side-panel-nav-item subheading"
              appearance="flat-button"
              :appearanceOverrides="navItemAppearance"
              @click.native="sidePanelOpen = false"
            >
              <KIconButton
                :disabled="true"
                icon="home"
              />
              <span class="side-panel-nav-text">{{ $tr('channelsLink') }}</span>
            </KExternalLink>

            <KExternalLink
              v-if="user?.is_admin"
              :href="administrationLink"
              class="side-panel-nav-item subheading"
              appearance="flat-button"
              :appearanceOverrides="navItemAppearance"
              @click.native="sidePanelOpen = false"
            >
              <KIconButton
                :disabled="true"
                icon="people"
              />
              <span class="side-panel-nav-text">{{ $tr('administrationLink') }}</span>
            </KExternalLink>

            <KExternalLink
              :href="settingsLink"
              class="side-panel-nav-item subheading"
              appearance="flat-button"
              :appearanceOverrides="navItemAppearance"
              @click.native="
                sidePanelOpen = false;
                trackClick('Settings');
              "
            >
              <KIconButton
                :disabled="true"
                icon="settings"
              />
              <span class="side-panel-nav-text">{{ $tr('settingsLink') }}</span>
            </KExternalLink>

            <KExternalLink
              appearance="flat-button"
              class="side-panel-nav-item subheading"
              :appearanceOverrides="navItemAppearance"
              @click.native.prevent="openLanguageModal"
            >
              <KIconButton
                :disabled="true"
                icon="language"
              />
              <span class="side-panel-nav-text">{{ $tr('changeLanguage') }}</span>
            </KExternalLink>

            <KExternalLink
              :href="helpLink"
              class="side-panel-nav-item subheading"
              appearance="flat-button"
              :appearanceOverrides="navItemAppearance"
              @click.native="
                sidePanelOpen = false;
                trackClick('Help');
              "
            >
              <KIconButton
                :disabled="true"
                icon="openNewTab"
              />
              <span class="side-panel-nav-text">{{ $tr('helpLink') }}</span>
            </KExternalLink>

            <KExternalLink
              appearance="flat-button"
              class="side-panel-nav-item subheading"
              :appearanceOverrides="navItemAppearance"
              @click.native.prevent="logout"
            >
              <KIconButton
                :disabled="true"
                icon="logout"
              />
              <span class="side-panel-nav-text">{{ $tr('logoutLink') }}</span>
            </KExternalLink>
          </nav>

          <div class="side-panel-footer">
            <div class="side-panel-logo">
              <KLogo
                altText="Kolibri logo"
                :showBackground="true"
                :size="88"
              />
            </div>

            <KExternalLink
              :href="copyrightLink"
              class="side-panel-copyright"
              openInNewTab
              @click.native="sidePanelOpen = false"
            >
              {{ $tr('copyright', { year: new Date().getFullYear() }) }}
            </KExternalLink>

            <p class="side-panel-feedback">
              <KExternalLink
                href="https://community.learningequality.org/c/support/studio"
                openInNewTab
                @click.native="sidePanelOpen = false"
              >
                {{ $tr('giveFeedback') }}
              </KExternalLink>
            </p>
          </div>
        </div>
      </template>
    </SidePanelModal>

    <!-- Language Switcher Modal -->
    <LanguageSwitcherModal
      v-if="showLanguageModal"
      :style="{ color: $themeTokens.text }"
      @cancel="showLanguageModal = false"
    />
  </div>

</template>


<script>

  import { mapActions, mapState, mapGetters } from 'vuex';
  import LanguageSwitcherModal from '../languageSwitcher/LanguageSwitcherModal.vue';
  import SidePanelModal from './SidePanelModal';
  import SkipNavigationLink from './SkipNavigationLink.vue';

  export default {
    name: 'StudioNavigation',
    components: {
      SidePanelModal,
      SkipNavigationLink,
      LanguageSwitcherModal,
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
      navItemAppearance() {
        return {
          justifyContent: 'flex-start',
          fontSize: '16px',
          textTransform: 'none',
          height: '48px',
        };
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
    },
    mounted() {
      this.updateTabIndices();
    },
    updated() {
      // Update tab indices whenever tabs change
      this.$nextTick(() => {
        this.updateTabIndices();
      });
    },
    methods: {
      ...mapActions(['logout']),
      toggleSidePanel() {
        this.sidePanelOpen = !this.sidePanelOpen;
      },
      handleUserMenuSelect(item) {
        switch (item.value) {
          case 'administration':
            window.location.href = this.administrationLink;
            break;
          case 'settings':
            window.location.href = this.settingsLink;
            break;
          case 'change-language':
            this.showLanguageModal = true;
            break;
          case 'help':
            window.open(this.helpLink, '_blank');
            this.trackClick('Help');
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
      handleTabsKeydown(event) {
        // Get all tab elements
        const tabs = this.getTabElements();
        if (!tabs.length) return;

        // Find currently focused tab
        const currentIndex = tabs.findIndex(
          tab => tab === event.target || tab.contains(event.target),
        );

        if (currentIndex === -1) return;

        let nextIndex = currentIndex;

        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            // Move to previous tab (or wrap to last)
            nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
            // Reverse for RTL
            if (this.$isRTL) {
              nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
            }
            break;

          case 'ArrowRight':
            event.preventDefault();
            // Move to next tab (or wrap to first)
            nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
            // Reverse for RTL
            if (this.$isRTL) {
              nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
            }
            break;

          case 'Home':
            event.preventDefault();
            nextIndex = 0;
            break;

          case 'End':
            event.preventDefault();
            nextIndex = tabs.length - 1;
            break;

          default:
            return;
        }

        // Focus the next tab
        this.focusTab(tabs[nextIndex]);
      },
      getTabElements() {
        // Get all tab children from the slot
        if (!this.$refs.tabsContainer) return [];

        // Find all interactive elements that represent tabs
        const tabs = Array.from(
          this.$refs.tabsContainer.querySelectorAll('a[role], button[role="tab"], a[href]'),
        );

        return tabs;
      },
      focusTab(tabElement) {
        if (!tabElement) return;

        // Try to call focus method on Vue component instance if available
        const vueInstance = tabElement.__vueParentComponent?.ctx;
        if (vueInstance?.focus) {
          vueInstance.focus();
        } else {
          // Fallback to native focus
          tabElement.focus();
        }
      },
      updateTabIndices() {
        // Update tabindex for roving tabindex pattern
        const tabs = this.getTabElements();
        if (!tabs.length) return;

        // Find active tab or use first tab
        const activeTab = tabs.find(
          tab =>
            tab.getAttribute('aria-current') === 'page' ||
            tab.getAttribute('aria-selected') === 'true',
        );
        const focusableTab = activeTab || tabs[0];

        // Set tabindex: 0 for focusable tab, -1 for others
        tabs.forEach(tab => {
          tab.setAttribute('tabindex', tab === focusableTab ? '0' : '-1');
        });
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
    position: sticky;
    top: 0;
    z-index: 5;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .studio-navigation__logo-link {
    display: flex;
    align-items: center;
    padding: 4px;
    text-decoration: none;
    border-radius: 8px;

    &:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
  }

  .studio-navigation__title {
    margin-left: 16px;
    font-size: 20px;
    font-weight: 500;
  }

  .studio-navigation__actions {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  /* Tabs extension area */
  .studio-navigation__tabs-extension {
    @extend %dropshadow-2dp;
  }

  .studio-navigation__tabs-container {
    display: flex;
    align-items: center;
    min-height: 48px;
    padding: 0 16px;

    /* Focus within styling for keyboard navigation */
    &:focus-within {
      outline: none;
    }
  }

  /* Side panel styles */
  .side-panel-header {
    display: flex;
    align-items: center;
    min-height: 60px;
    padding: 0 16px;
  }

  .side-panel-title {
    margin-left: 16px;
    font-size: 20px;
    font-weight: 500;
  }

  .sidepanel-content {
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

  .side-panel-nav-item {
    display: flex;
    gap: 12px;
    width: 100%;
    margin: 0;
    padding: 8px 16px;
  }
  .side-panel-nav-item.button {
    text-align: start;
  }

  .side-panel-nav-text {
    font-size: 16px;
    font-weight: 500;
  }

  .side-panel-footer {
    padding: 24px;
    text-align: left;
  }

  .side-panel-logo {
    margin-bottom: 16px;
  }

  .side-panel-copyright {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    text-decoration: none;
  }

  .side-panel-feedback {
    margin: 0;

    a {
      font-size: 14px;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  /* Mobile styles */
  @media (max-width: 767px) {
    .studio-navigation__title {
      margin-left: 12px;
      font-size: 18px;
    }

    .studio-navigation__tabs-container {
      padding: 0 12px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .studio-navigation__user-name {
      display: none;
    }

    .studio-navigation__actions {
      gap: 8px;
    }
  }

  /* RTL Support */
  [dir='rtl'] {
    .studio-navigation__title {
      margin-right: 16px;
      margin-left: 0;
    }

    .side-panel-title {
      margin-right: 16px;
      margin-left: 0;
    }

    .side-panel-nav-item {
      text-align: right;
    }
  }

</style>