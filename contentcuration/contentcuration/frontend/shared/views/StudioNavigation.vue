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
        ref="toolbar"
        type="clear"
        :style="{
          overflowX: 'hidden',  
          backgroundColor: $themeTokens.appBar,
          height: '56px',
        }"
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
    <div
      v-if="hasTabs"
      :aria-label="$tr('mainNavigationLabel')"
    >
      <div 
        class="studio-navigation-tabs-wrapper"
        :style="tabsWrapperStyles"
      >
        <div
          v-if="isOverflowing && canScrollLeft"
          class="scroll-button scroll-button-left"
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
          class="studio-navigation-tabs-container"
          :class="{ 'is-dragging': isDragging }"
          @mousedown="handleDragStart"
          @touchstart="handleDragStart"
        >
          <slot name="tabs"></slot>
          <div
            class="sliding-indicator"
            :style="[indicatorStyle, { backgroundColor: $themeTokens.surface }]"
          ></div>
        </div>

        <div
          v-if="isOverflowing && canScrollRight"
          class="scroll-button scroll-button-right"
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


  export default {
    name: 'StudioNavigation',
    components: {
      SidePanelModal,
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
        windowWidth: 0,
        isOverflowing: false,
        canScrollLeft: false,
        canScrollRight: false,
        toolbarWidth: 0,
        indicatorStyle: {
          width: '0px',
          transform: 'translateX(0px)',
        },
        // Drag state
        isDragging: false,
        dragStartX: 0,
        dragStartScrollLeft: 0,
        currentTranslateX: 0,
        dragVelocity: 0,
        lastDragX: 0,
        lastDragTime: 0,
        potentialDrag: false,
        dragStarted: false,
        // Resize debounce
        resizeTimeout: null,
        resizeObserverTimeout: null,
        resizeObserver: null,
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
          padding: this.windowBreakpoint <= 3 ? '0 16px' : '0 24px',
        };
      },
    },
    watch: {
      '$route'() {
        this.$nextTick(() => {
          this.moveIndicator();
        });
      },
      windowBreakpoint() {
        // Clear existing timeout
        if (this.resizeTimeout) {
          clearTimeout(this.resizeTimeout);
        }
        
        // Wait 2 seconds before centering
        this.resizeTimeout = setTimeout(() => {
          this.centerActiveTab();
        }, 2000);
      },
    },
    mounted() {
      this.updateWindowWidth();
      this.updateToolbarWidth();
      window.addEventListener('resize', this.handleResize);
      window.addEventListener('resize', this.moveIndicator);
      
      // Use requestAnimationFrame to ensure DOM is painted
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.moveIndicator();
            this.setupDragListeners();
            this.checkScrollPositions();
            
            // Add a small delay before centering to ensure all styles are applied
            setTimeout(() => {
              this.centerActiveTab();
            }, 100);
          });
        });
      });
      
      const el = this.$refs.tabsContainer;
      if (el) {
        el.addEventListener('scroll', this.checkScrollPositions);
        
        // Initial check with delay
        setTimeout(() => {
          this.checkScrollPositions();
        }, 150);
        
        const resizeObserver = new ResizeObserver(() => {
          // Debounce the resize observer
          if (this.resizeObserverTimeout) {
            clearTimeout(this.resizeObserverTimeout);
          }
          this.resizeObserverTimeout = setTimeout(() => {
            this.checkScrollPositions();
          }, 100);
        });
        resizeObserver.observe(el);
        this.resizeObserver = resizeObserver;
      }
    },
    updated() {
      this.$nextTick(() => {
        this.updateToolbarWidth();
      });
    },
    beforeDestroy() {
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('resize', this.moveIndicator);
      
      // Clear all timeouts
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      if (this.resizeObserverTimeout) {
        clearTimeout(this.resizeObserverTimeout);
      }
      
      // Disconnect resize observer
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      
      // Remove scroll listener
      const el = this.$refs.tabsContainer;
      if (el) {
        el.removeEventListener('scroll', this.checkScrollPositions);
      }
      
      // Remove drag event listeners
      this.removeDragListeners();
    },
    methods: {
      ...mapActions(['logout']),
      toggleSidePanel() {
        this.sidePanelOpen = !this.sidePanelOpen;
      },
      moveIndicator() {
        const container = this.$refs.tabsContainer;
        if (!container) return;
        const activeTab = container.querySelector('.studio-navigation-tab-active');

        if (activeTab) {
          const containerRect = container.getBoundingClientRect();
          const tabRect = activeTab.getBoundingClientRect();
          const leftPosition = tabRect.left - containerRect.left + container.scrollLeft;

          this.indicatorStyle = {
            width: `${tabRect.width}px`,
            transform: `translateX(${leftPosition}px)`,
          };
        }
      },
      centerActiveTab() {
        const container = this.$refs.tabsContainer;
        if (!container) {
          // Retry after a short delay if container isn't ready
          setTimeout(() => {
            if (this.$refs.tabsContainer) {
              this.centerActiveTab();
            }
          }, 100);
          return;
        }
        
        // Wait for overflow check to complete
        if (!this.isOverflowing) {
          setTimeout(() => {
            this.checkScrollPositions();
            if (this.isOverflowing) {
              this.centerActiveTab();
            }
          }, 50);
          return;
        }
        
        const activeTab = container.querySelector('.studio-navigation-tab-active');
        if (!activeTab) return;

        const containerWidth = container.clientWidth;
        const tabRect = activeTab.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate position to center the active tab
        const tabLeft = tabRect.left - containerRect.left + container.scrollLeft;
        const tabCenter = tabLeft + (tabRect.width / 2);
        const targetScroll = tabCenter - (containerWidth / 2);
        
        // Clamp to valid scroll range
        const maxScroll = container.scrollWidth - container.clientWidth;
        const clampedScroll = Math.max(0, Math.min(maxScroll, targetScroll));
        
        container.style.scrollBehavior = 'auto';
        container.style.transition = 'scroll-left 0.6s ease-in-out';
        
        container.scrollTo({
          left: clampedScroll,
          behavior: 'smooth'
        });

        setTimeout(() => {
          container.style.transition = '';
          container.style.scrollBehavior = 'smooth';
          this.checkScrollPositions();
        }, 600);
      },
      checkScrollPositions() {
        const el = this.$refs.tabsContainer;
        if (!el) return;

        // Force a reflow to get accurate measurements
        void el.offsetHeight;

        this.isOverflowing = el.scrollWidth > el.clientWidth;
        
        // Use a small threshold to account for rounding errors
        const threshold = 1;
        this.canScrollLeft = el.scrollLeft > threshold;

        const atEnd = Math.ceil(el.scrollLeft + el.clientWidth) >= (el.scrollWidth - threshold);
        this.canScrollRight = !atEnd && this.isOverflowing;
      },
      scrollTabs(distance) {
        const container = this.$refs.tabsContainer;
        if (container) {
          const scrollDirection = this.$isRTL ? -distance : distance;
          container.scrollBy({ left: scrollDirection, behavior: 'smooth' });
        }
      },
      setupDragListeners() {
        const container = this.$refs.tabsContainer;
        if (!container) {
          return;
        }

        // Add event listeners to document for global tracking
        document.addEventListener('mousemove', this.handleDragMove, { passive: false });
        document.addEventListener('mouseup', this.handleDragEnd);
        document.addEventListener('touchmove', this.handleDragMove, { passive: false });
        document.addEventListener('touchend', this.handleDragEnd);
        document.addEventListener('touchcancel', this.handleDragEnd);
      },
      removeDragListeners() {
        document.removeEventListener('mousemove', this.handleDragMove);
        document.removeEventListener('mouseup', this.handleDragEnd);
        document.removeEventListener('touchmove', this.handleDragMove);
        document.removeEventListener('touchend', this.handleDragEnd);
        document.removeEventListener('touchcancel', this.handleDragEnd);
      },
      // Drag handlers
      handleDragStart(e) {
        const container = this.$refs.tabsContainer;
        
        if (!container || !this.isOverflowing) {
          return;
        }
        
        this.isDragging = false;
        this.dragStarted = false;
        const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        this.dragStartX = clientX;
        this.dragStartScrollLeft = container.scrollLeft;
        this.currentTranslateX = 0;
        this.lastDragX = clientX;
        this.lastDragTime = Date.now();
        this.dragVelocity = 0;
        this.potentialDrag = true;
      },
      handleDragMove(e) {
        if (!this.potentialDrag && !this.isDragging) return;

        const container = this.$refs.tabsContainer;
        if (!container) return;

        const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const deltaX = clientX - this.dragStartX;
        
        // If movement is more than 5px, consider it a drag (not a click)
        if (!this.dragStarted && Math.abs(deltaX) > 5) {
          this.dragStarted = true;
          this.isDragging = true;
          this.potentialDrag = false;
          
          e.preventDefault();
          e.stopPropagation();
          
          container.style.scrollBehavior = 'auto';
          container.style.transition = 'none';
        }
        
        if (!this.isDragging) return;

        e.preventDefault();
        e.stopPropagation();

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastDragTime;

        if (deltaTime > 0) {
          this.dragVelocity = (clientX - this.lastDragX) / deltaTime;
        }

        this.lastDragX = clientX;
        this.lastDragTime = currentTime;

        const newScrollLeft = this.dragStartScrollLeft - deltaX;
        const maxScroll = container.scrollWidth - container.clientWidth;

        // Allow over-scrolling with resistance
        if (newScrollLeft < 0) {
          const overScroll = Math.abs(newScrollLeft);
          const resistance = Math.min(overScroll * 0.7, 600);
          container.scrollLeft = 0;
          this.currentTranslateX = resistance;
        } else if (newScrollLeft > maxScroll) {
          const overScroll = newScrollLeft - maxScroll;
          const resistance = Math.min(overScroll * 0.7, 600);
          container.scrollLeft = maxScroll;
          this.currentTranslateX = -resistance;
        } else {
          container.scrollLeft = newScrollLeft;
          this.currentTranslateX = 0;
        }

        container.style.transform = `translateX(${this.currentTranslateX}px)`;
      },
      handleDragEnd() {
        if (!this.potentialDrag && !this.isDragging) return;

        const container = this.$refs.tabsContainer;
        if (!container) return;

        // If no drag movement, allow the click to happen
        if (this.potentialDrag && !this.dragStarted) {
          this.potentialDrag = false;
          return;
        }

        this.isDragging = false;
        this.potentialDrag = false;
        this.dragStarted = false;

        // Animate back if over-scrolled
        if (this.currentTranslateX !== 0) {
          container.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          container.style.transform = 'translateX(0px)';
          
          setTimeout(() => {
            container.style.transition = '';
            container.style.scrollBehavior = 'smooth';
            this.currentTranslateX = 0;
            this.checkScrollPositions();
          }, 350);
        } else {
          container.style.scrollBehavior = 'smooth';
          
          // Add momentum scrolling
          const absVelocity = Math.abs(this.dragVelocity);
          if (absVelocity > 0.5) {
            const momentum = this.dragVelocity * 400;
            const currentScroll = container.scrollLeft;
            const targetScroll = currentScroll - momentum;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const clampedScroll = Math.max(0, Math.min(maxScroll, targetScroll));
            
            container.scrollTo({
              left: clampedScroll,
              behavior: 'smooth'
            });
          }
          
          setTimeout(() => {
            this.checkScrollPositions();
          }, 50);
        }

        this.dragVelocity = 0;
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
      handleResize() {
        this.updateWindowWidth();
        this.updateToolbarWidth();
        
        // Clear existing timeout
        if (this.resizeTimeout) {
          clearTimeout(this.resizeTimeout);
        }
        
        // Wait 2 seconds after resize stops before centering
        this.resizeTimeout = setTimeout(() => {
          this.centerActiveTab();
        }, 1000);
      },
      updateWindowWidth() {
        this.windowWidth = window.innerWidth;
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

  .studio-navigation-logo-link {
    display: flex;
    align-items: center;
    padding: 4px;
    text-decoration: none;
    border-radius: 8px;

    &:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
  }

  .studio-navigation-title-container {
    display: block;    
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
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
  
    
    &-left {
      left: 0;
      padding-right: 8px;
    }
    
    &-right {
      right: 0;
      padding-left: 8px;
     
    }
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
    scroll-behavior: smooth;
    cursor: grab;
    user-select: none;
    will-change: transform;

    &::-webkit-scrollbar {
      display: none;
    }

    &.is-dragging {
      cursor: grabbing;
      scroll-behavior: auto;
      
      * {
        pointer-events: none;
      }
    }
  }

  .sliding-indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
    pointer-events: none; 
    z-index: 1;
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