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
        :style="[
          {
            overflowX: 'hidden',
            backgroundColor: $themeTokens.appBar,
            height: '56px',
          },
          containerStyles,
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
            style="padding-top: 8px"
          >
            <KLogo
              altText="Kolibri Logo with background"
              :size="36"
            />
          </KExternalLink>
        </template>

        <template #default>
          <div
            class="studio-navigation-title-container"
            style="flex: 1; min-width: 0"
          >
            <KTextTruncator
              :text="title || $tr('title')"
              :maxLines="1"
            />
          </div>
        </template>

        <template #actions>
          <div
            ref="studioNavigationActions"
            class="studio-navigation-actions"
          >
            <template v-if="loggedIn">
              <button
                class="studio-navigation-dropdown"
                :aria-label="$tr('userMenuLabel')"
                :class="
                  $computedClass({
                    ':focus': { ...$coreOutline, outlineOffset: 0 },
                  })
                "
              >
                <KIcon
                  icon="person"
                  style="margin: 8px; margin-top: 0; font-size: 22px"
                />
                <span class="mx-2 notranslate subheading">
                  {{ user.first_name }}
                </span>
                <KIcon
                  icon="dropdown"
                  style="margin: 8px; margin-top: 0; font-size: 22px"
                />

                <KDropdownMenu
                  :options="userMenuItems"
                  :hasIcons="true"
                  @select="handleUserMenuSelect"
                />
              </button>
            </template>

            <template v-else>
              <button
                class="studio-navigation-dropdown"
                :aria-label="$tr('guestMenuLabel')"
                :class="
                  $computedClass({
                    ':focus': { ...$coreOutline, outlineOffset: 0 },
                  })
                "
              >
                <KIcon
                  icon="person"
                  style="margin: 8px; margin-top: 0; font-size: 22px"
                />
                <KIcon
                  icon="dropdown"
                  style="margin: 8px; margin-top: 0; font-size: 22px"
                />

                <KDropdownMenu
                  :options="guestMenuItems"
                  :hasIcons="true"
                  @select="handleGuestMenuSelect"
                />
              </button>
            </template>
          </div>
        </template>
      </KToolbar>
    </header>

    <nav
      v-if="tabs && tabs.length"
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
          <StudioNavigationTab
            v-for="tab in tabs"
            :key="tab.id"
            ref="tabRefs"
            :to="tab.to"
            :badgeValue="tab.badgeValue"
            class="studio-navigation-tab-item"
            @click.native="handleTrackClick(tab)"
          >
            {{ tab.label }}
          </StudioNavigationTab>
        </div>

        <div
          v-if="overflowMenuOptions.length > 0"
          class="overflow-menu-container"
        >
          <KIconButton
            icon="optionsHorizontal"
            :color="$themeTokens.text"
            :tooltip="$tr('moreOptions')"
            appearance="flat-button"
          >
            <template #menu>
              <KDropdownMenu
                :options="overflowMenuOptions"
                @select="handleOverflowSelect"
              />
            </template>
          </KIconButton>
        </div>
      </div>
    </nav>

    <StudioNavigationSidePanel
      v-if="loggedIn"
      :isOpen="isSideNavOpen"
      @close="isSideNavOpen = false"
      @openLanguageModal="showLanguageModal = true"
      @logout="logout"
    />
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
  import debounce from 'lodash/debounce';
  import LanguageSwitcherModal from '../../languageSwitcher/LanguageSwitcherModal.vue';
  import SkipNavigationLink from './SkipNavigationLink.vue';

  import StudioNavigationTab from './StudioNavigationTab.vue';
  import StudioNavigationSidePanel from './StudioNavigationSidePanel.vue';

  const MenuOptions = {
    ADMINISTRATION: 'administration',
    SETTINGS: 'settings',
    CHANGE_LANGUAGE: 'change-language',
    HELP: 'help',
    LOGOUT: 'logout',
    LOGIN: 'login',
  };

  export default {
    name: 'StudioNavigation',
    components: {
      StudioNavigationSidePanel,
      SkipNavigationLink,
      LanguageSwitcherModal,
      StudioNavigationTab,
    },
    setup() {
      const { windowBreakpoint, windowWidth } = useKResponsiveWindow();
      return {
        windowBreakpoint,
        windowWidth,
      };
    },
    props: {
      title: {
        type: String,
        required: false,
        default: null,
      },
      tabs: {
        type: Array,
        default: () => [],
        // Structure: [{ id: '1', label: 'Tab Name', to: {...}, badgeValue: 0 }]
      },
    },
    data() {
      return {
        isSideNavOpen: false,
        showLanguageModal: false,
        toolbarWidth: 0,
        overflowMenuOptions: [],
      };
    },

    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      ...mapGetters(['loggedIn']),
      homeLink() {
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
            value: MenuOptions.ADMINISTRATION,
            icon: 'people',
          });
        }

        items.push(
          {
            label: this.$tr('settings'),
            value: MenuOptions.SETTINGS,
            icon: 'settings',
          },
          {
            label: this.$tr('changeLanguage'),
            value: MenuOptions.CHANGE_LANGUAGE,
            icon: 'language',
          },
          {
            label: this.$tr('help'),
            value: MenuOptions.HELP,
            icon: 'openNewTab',
          },
          {
            label: this.$tr('signOut'),
            value: MenuOptions.LOGOUT,
            icon: 'logout',
          },
        );

        return items;
      },
      guestMenuItems() {
        return [
          {
            label: this.$tr('signIn'),
            value: MenuOptions.LOGIN,
            icon: 'login',
          },
          {
            label: this.$tr('changeLanguage'),
            value: MenuOptions.CHANGE_LANGUAGE,
            icon: 'language',
          },
        ];
      },
      tabsWrapperStyles() {
        return {
          // Adds horizontal padding on mobile devices to ensure the overflow menu button
          // and its hover effect do not touch the screen edge.
          padding: this.windowBreakpoint <= 2 ? '0 8px' : 0,
        };
      },
    },

    watch: {
      windowWidth() {
        this.updateToolbarWidth();
        this.debouncedCalculateOverflow();
      },
      tabs: {
        handler() {
          this.$nextTick(() => {
            this.calculateOverflow();
          });
        },
        deep: true,
      },
    },
    created() {
      this.debouncedCalculateOverflow = debounce(this.calculateOverflow, 100);
    },
    mounted() {
      this.updateToolbarWidth();

      this.$nextTick(() => {
        this.calculateOverflow();
      });
    },
    updated() {
      this.$nextTick(() => {
        this.updateToolbarWidth();
      });
    },
    beforeDestroy() {
      if (this.debouncedCalculateOverflow) {
        this.debouncedCalculateOverflow.cancel();
      }
    },
    methods: {
      ...mapActions(['logout']),

      calculateOverflow() {
        const container = this.$refs.tabsContainer;
        const tabComponents = this.$refs.tabRefs;

        if (!container || !tabComponents || tabComponents.length === 0) return;

        const hiddenLinks = [];
        const containerTop = container.offsetTop;

        this.tabs.forEach((tab, index) => {
          const tabEl = tabComponents[index].$el;
          if (!tabEl) return;
          const isWrapped = tabEl.offsetTop - containerTop > 10;

          if (isWrapped) {
            hiddenLinks.push({
              label: tab.label,
              value: tab.to,
              // Update: Pass the analytics label here to avoid lookup later
              analyticsLabel: tab.analyticsLabel,
            });
          }
        });

        this.overflowMenuOptions = hiddenLinks;
      },

      handleOverflowSelect(option) {
        if (option && option.value) {
          this.$router.push(option.value);
          this.handleTrackClick(option);
        }
      },
      toggleSidePanel() {
        this.isSideNavOpen = !this.isSideNavOpen;
      },

      closeSidePanelAndNavigate(url) {
        this.isSideNavOpen = false;
        window.location.href = url;
      },
      navigateToAdministration() {
        this.closeSidePanelAndNavigate(this.administrationLink);
      },
      navigateToSettings() {
        this.trackClick('Settings');
        this.closeSidePanelAndNavigate(this.settingsLink);
      },
      handleUserMenuSelect(item) {
        switch (item.value) {
          case MenuOptions.ADMINISTRATION:
            if (this.user && this.user.is_admin) {
              this.navigateToAdministration();
            }
            break;
          case MenuOptions.SETTINGS:
            this.navigateToSettings();
            break;
          case MenuOptions.CHANGE_LANGUAGE:
            this.showLanguageModal = true;
            break;
          case MenuOptions.HELP:
            this.trackClick('Help');
            window.open(this.helpLink, '_blank');
            break;
          case MenuOptions.LOGOUT:
            this.logout();
            break;
        }
      },
      handleGuestMenuSelect(item) {
        switch (item.value) {
          case MenuOptions.LOGIN:
            window.location.href = '/accounts/';
            break;
          case MenuOptions.CHANGE_LANGUAGE:
            this.showLanguageModal = true;
            break;
        }
      },
      trackClick(label) {
        if (this.$analytics) {
          this.$analytics.trackClick('general', `User dropdown - ${label}`);
        }
      },
      updateToolbarWidth() {
        this.toolbarWidth = this.$refs.studioNavigation?.clientWidth || 0;
      },
      handleTrackClick(item) {
        if (this.$analytics && item.analyticsLabel) {
          this.$analytics.trackClick('channel_list', item.analyticsLabel);
        }
      },
    },
    $trs: {
      title: 'Kolibri Studio',
      openMenu: 'Open navigation menu',

      mainNavigationLabel: 'Main navigation',
      userMenuLabel: 'User menu',
      guestMenuLabel: 'Guest menu',
      moreOptions: 'More options',

      administration: 'Administration',
      settings: 'Settings',
      changeLanguage: 'Change language',
      help: 'Help and support',
      signIn: 'Sign in',
      signOut: 'Sign out',
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
    padding-inline-start: 20px;
    padding-top: 8px;
    //Given to remove the bottom spacing due to inline-block nature of KTextTruncator
    font-size: 20px;
    font-weight: 500;
    white-space: nowrap;
  }

  ::v-deep .k-toolbar-left {
    flex: 1;
    min-width: 0;
    //Added so that Ktexttruncator can properly truncate the title when necessary.
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
    height: 48px;
  }

  .studio-navigation-tabs-container {
    position: relative;
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    height: 48px;
    overflow: hidden;
  }

  .studio-navigation-tab-item {
    flex: 0 0 auto;
  }

  .overflow-menu-container {
    z-index: 2;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    height: 100%;
    padding-left: 8px;
    background-color: inherit;
  }

  .studio-navigation-dropdown {
    display: flex;
    align-items: center;
    height: 40px;
    cursor: pointer;
    border-radius: $radius;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
  }

</style>
