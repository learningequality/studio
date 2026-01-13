<template>

  <RouterLink
    v-if="to"
    ref="tabElement"
    :to="to"
    :class="tabClasses"
    :style="tabStyles"
    :aria-current="isActive ? 'page' : null"
    :tabindex="tabindex"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <span class="studio-navigation-tab__content">
      <slot></slot>
      <span
        v-if="showBadge"
        class="studio-navigation-tab__badge"
        :aria-label="badgeAriaLabel"
      >
        {{ formattedBadgeValue }}
      </span>
    </span>
    <span
      v-if="isActive"
      class="studio-navigation-tab__indicator"
      :style="indicatorStyles"
      aria-hidden="true"
    ></span>
  </RouterLink>

</template>


<script>

  export default {
    name: 'StudioNavigationTab',
    inject: ['$themeTokens'],
    props: {
      to: {
        type: [String, Object],
        default: null,
      },
      badgeValue: {
        type: Number,
        default: 0,
      },
      notranslate: {
        type: Boolean,
        default: false,
      },
      tabindex: {
        type: Number,
        default: 0,
      },
    },
    computed: {
      tabClasses() {
        return {
          'studio-navigation-tab': true,
          'studio-navigation-tab--active': this.isActive,
          notranslate: this.notranslate,
        };
      },
      tabStyles() {
        return {
          color: this.$themeTokens.text,
        };
      },
      indicatorStyles() {
        return {
          backgroundColor: this.$themeTokens.surface,
        };
      },
      isActive() {
        // Check if current route matches this tab's route
        if (!this.to || !this.$route) return false;

        const targetRoute = this.$router.resolve(this.to);
        return this.$route.path === targetRoute.route.path;
      },
      showBadge() {
        return this.badgeValue > 0;
      },
      formattedBadgeValue() {
        return this.badgeValue > 99 ? '99+' : this.badgeValue.toString();
      },
      badgeAriaLabel() {
        if (!this.showBadge) return null;
        const count = this.badgeValue > 99 ? 'more than 99' : this.badgeValue;
        return `${count} notification${this.badgeValue !== 1 ? 's' : ''}`;
      },
    },
    methods: {
      handleClick(event) {
        this.$emit('click', event);
      },
      handleKeydown(event) {
        // Emit keydown event for parent to handle navigation
        this.$emit('keydown', event);
      },
    },
  };

</script>


<style scoped>

  .studio-navigation-tab {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 160px;
    height: 100%;
    min-height: 48px;
    padding: 6px 12px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    color: inherit;
    text-decoration: none;
    text-transform: uppercase;
    white-space: normal;
    cursor: pointer;
    background: transparent;
    border: none;
    outline: none;
    user-select: none;
    transition: 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  }

  .studio-navigation-tab:not(.studio-navigation-tab--active) {
    opacity: 0.7;
  }

  .studio-navigation-tab:focus-visible {
    outline: 2px solid currentcolor;
    outline-offset: -2px;
  }

  .studio-navigation-tab__content {
    position: relative;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .studio-navigation-tab__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    color: white;
    background-color: black;
    border-radius: 10px;
  }

  .studio-navigation-tab__indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
  }

</style>