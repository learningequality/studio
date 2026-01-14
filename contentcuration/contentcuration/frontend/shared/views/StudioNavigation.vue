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
    <header>
      
      <KToolbar
        type="clear"
        :style="{
          overflowX: 'auto',  
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
          <div
            class="text-truncate"
            style="max-width: 160px"
          >
            <span class="studio-navigation__title">
              {{ title || $tr('title') }}
            </span>
          </div>
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

    </header>

    

    <!-- Tabs extension area (for when tabs are provided) -->
    <div
      v-if="hasTabs"
      :aria-label="$tr('mainNavigationLabel')"
    >
      <div class="studio-navigation__tabs-wrapper">
        <div
          v-if="isOverflowing && canScrollLeft"
          class="scroll-button scroll-button--left"
          :style="{ backgroundColor: $themeTokens.appBar }"
          @click="scrollTabs(-300)"
        >
          <KIconButton
            icon="chevronLeft"
            :color="$themeTokens.text"
            :ariaLabel="$tr('scrollLeft')"
          />
        </div>

        <div
          ref="tabsContainer"
          class="studio-navigation__tabs-container"
          @keydown="handleTabsKeydown"
        >
          <slot name="tabs"></slot>
        </div>

        <div
          v-if="isOverflowing && canScrollRight"
          class="scroll-button scroll-button--right"
          :style="{ backgroundColor: $themeTokens.appBar }"
          @click="scrollTabs(300)"
        >
          <KIconButton
            icon="chevronRight"
            :color="$themeTokens.text"
            :ariaLabel="$tr('scrollRight')"
          />
        </div>
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
            <div
              class="side-panel-nav-item"
              @click="navigateToChannels"
            >
              <KIconButton
                :disabled="true"
                icon="home"
              />
              <span class="subheading">{{ $tr('channelsLink') }}</span>
            </div>

            <div
              v-if="user?.is_admin"
              class="side-panel-nav-item"
              @click="navigateToAdministration"
            >
              <KIconButton
                :disabled="true"
                icon="people"
              />
              <span class="subheading">{{ $tr('administrationLink') }}</span>
            </div>

            <div
              class="side-panel-nav-item"
              @click="navigateToSettings"
            >
              <KIconButton
                :disabled="true"
                icon="settings"
              />
              <span class="subheading">{{ $tr('settingsLink') }}</span>
            </div>

            <div
              class="side-panel-nav-item"
              @click="openLanguageModal"
            >
              <KIconButton
                :disabled="true"
                icon="language"
              />
              <span class="subheading">{{ $tr('changeLanguage') }}</span>
            </div>

            <div
              class="side-panel-nav-item"
              @click="navigateToHelp"
            >
              <KIconButton
                :disabled="true"
                icon="openNewTab"
              />
              <span class="subheading">{{ $tr('helpLink') }}</span>
            </div>

            <div
              class="side-panel-nav-item"
              @click="handleLogout"
            >
              <KIconButton
                :disabled="true"
                icon="logout"
              />
              <span class="subheading">{{ $tr('logoutLink') }}</span>
            </div>
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
        windowWidth: 0,
        isOverflowing: false,
        canScrollLeft: false,
        canScrollRight: false,
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
      this.updateWindowWidth();
      window.addEventListener('resize', this.updateWindowWidth);
      const el = this.$refs.tabsContainer;
      if (el) {
        el.addEventListener('scroll', this.checkScrollPositions);
        this.checkScrollPositions();
        
        const resizeObserver = new ResizeObserver(this.checkScrollPositions);
        resizeObserver.observe(el);
      }
    },
    updated() {
      this.$nextTick(() => {
        this.updateTabIndices();
      });
    },
    beforeDestroy() {
      window.removeEventListener('resize', this.updateWindowWidth);
    },
    methods: {
      ...mapActions(['logout']),
      toggleSidePanel() {
        this.sidePanelOpen = !this.sidePanelOpen;
      },
      checkScrollPositions() {
        const el = this.$refs.tabsContainer;
        if (!el) return;

        this.isOverflowing = el.scrollWidth > el.clientWidth;
        this.canScrollLeft = el.scrollLeft > 0;

        const atEnd = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth;
        this.canScrollRight = !atEnd;
      },
      scrollTabs(distance) {
        const container = this.$refs.tabsContainer;
        if (container) {
          const scrollDirection = this.$isRTL ? -distance : distance;
          container.scrollBy({ left: scrollDirection, behavior: 'smooth' });
        }
      },
      closeSidePanelAndNavigate(url) {
        this.sidePanelOpen = false;
        window.location.href = url;
      },
      navigateToChannels() {
        this.closeSidePanelAndNavigate(this.channelsLink);
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
      updateWindowWidth() {
        this.windowWidth = window.innerWidth;
      },
      handleTabsKeydown(event) {
        const tabs = this.getTabElements();
        if (!tabs.length) return;

        const currentIndex = tabs.findIndex(
          tab => tab === event.target || tab.contains(event.target),
        );

        if (currentIndex === -1) return;

        let nextIndex = currentIndex;

        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
            if (this.$isRTL) {
              nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
            }
            break;

          case 'ArrowRight':
            event.preventDefault();
            nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
            if (this.$isRTL) {
              nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
            }
            break;

          default:
            return;
        }

        this.focusTab(tabs[nextIndex]);
      },
      getTabElements() {
        if (!this.$refs.tabsContainer) return [];

        const tabs = Array.from(
          this.$refs.tabsContainer.querySelectorAll('a[role], button[role="tab"], a[href]'),
        );

        return tabs;
      },
      focusTab(tabElement) {
        if (!tabElement) return;

        const vueInstance = tabElement.__vueParentComponent?.ctx;
        if (vueInstance?.focus) {
          vueInstance.focus();
        } else {
          tabElement.focus();
        }
      },
      updateTabIndices() {
        const tabs = this.getTabElements();
        if (!tabs.length) return;

        const activeTab = tabs.find(
          tab =>
            tab.getAttribute('aria-current') === 'page' ||
            tab.getAttribute('aria-selected') === 'true',
        );
        const focusableTab = activeTab || tabs[0];

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
      scrollLeft: 'Scroll tabs left',
      scrollRight: 'Scroll tabs right',
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
    display: block;
    width: 100%;
    font-size: 20px;
    font-weight: 500;
    padding-inline-start: 20px;
  }

  .text-truncate {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .studio-navigation__actions {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .studio-navigation__tabs-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .scroll-button {
    position: absolute;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    z-index: 5;
    cursor: pointer;
    user-select: none;
    padding: 0 4px;
    transition: background-color 0.2s ease;
  
    
    &--left {
      left: 0;
      padding-right: 8px;
    }
    
    &--right {
      right: 0;
      padding-left: 8px;
     
    }
  }

  .studio-navigation__tabs-container {
    display: flex;
    flex: 1;
    padding: 0 24px;
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

  .side-panel-nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 4px 16px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.048);
    }
  }

  .side-panel-footer {
    padding: 24px;
    text-align: left;
  }

  .side-panel-copyright {
    margin-bottom: 24px;
    font-size: 14px;
  }

</style>