<template>

  <RouterLink
    v-if="to"
    ref="tabElement"
    :to="to"
    :class="[
      tabClasses, 
      $computedClass({
        ':active': { backgroundColor: 'rgba(0, 0, 0, 0.2)' },
        ':focus': { ...$coreOutline, outlineOffset: 0 }
      })
    ]"
    :style="tabStyles"
    :aria-current="isActive ? 'page' : null"
    :tabindex="tabindex"
    @click="$emit('click', $event)"
    @keydown="$emit('keydown', $event)"
  >
    <span class="studio-navigation-tab-content">
      <slot></slot>
      <span
        v-if="showBadge"
        class="studio-navigation-tab-badge"
        :aria-label="badgeAriaLabel"
      >
        {{ badgeValue }}
      </span>
    </span>
  </RouterLink>

</template>


<script>

  export default {
    name: 'StudioNavigationTab',
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
          'studio-navigation-tab-active': this.isActive,
          notranslate: this.notranslate,
        };
      },
      tabStyles() {
        return {
          color: this.$themeTokens.text,
        };
      },
      
      isActive() {
        if (!this.to || !this.$route) return false;

        const targetRoute = this.$router.resolve(this.to);
        return this.$route.path === targetRoute.route.path;
      },
      showBadge() {
        return this.badgeValue > 0;
      },
      badgeAriaLabel() {
        return `${this.badgeValue} notification${this.badgeValue !== 1 ? 's' : ''}`;
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
    min-width: 160px;
    max-width: 264px;
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
    outline: none;
    user-select: none;
    transition: 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
  }

  .studio-navigation-tab:not(.studio-navigation-tab-active) {
    opacity: 0.7;
  }


  .studio-navigation-tab-content {
    position: relative;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .studio-navigation-tab-badge {
    position: absolute;
    top: -11px;
    right: -22px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    font-size: 14px;
    color: white;
    background-color: black;
    border-radius: 50%;
    transition: 0.3s;
  }

</style>