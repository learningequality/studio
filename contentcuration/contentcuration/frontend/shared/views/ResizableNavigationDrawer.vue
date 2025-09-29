<template>

  <VNavigationDrawer
    ref="drawer"
    v-model="open"
    v-bind="$attrs"
    :width="drawerWidth"
    :right="isRight"
    :temporary="temporary"
    :permanent="permanent"
    :class="{
      'drawer-right': isRight,
      'drawer-left': !isRight,
      dragging,
      draggable: !temporary,
    }"
  >
    <div
      class="drawer-contents"
      @scroll="e => $emit('scroll', e)"
    >
      <slot></slot>
    </div>
  </VNavigationDrawer>

</template>


<script>

  import { animationThrottle } from 'shared/utils/helpers';

  export default {
    name: 'ResizableNavigationDrawer',
    props: {
      value: {
        type: Boolean,
        default: true,
      },
      minWidth: {
        type: Number,
        default: 100,
      },
      defaultWidth: {
        type: Number,
        default: 400,
      },
      maxWidth: {
        type: Number,
        default: window.innerWidth - 100,
      },
      localName: {
        type: String,
        required: true,
      },
      right: {
        type: Boolean,
        default: false,
      },
      temporary: {
        type: Boolean,
        default: false,
        validate(temporary) {
          return temporary !== this.permanent;
        },
      },
      permanent: {
        type: Boolean,
        default: false,
        validate(permanent) {
          return permanent !== this.temporary;
        },
      },
    },
    data() {
      const localStorageName = this.localName + '-drawer-width';
      return {
        dragging: false,
        width: parseFloat(localStorage[localStorageName]) || this.defaultWidth || this.minWidth,
        localStorageName,
      };
    },
    computed: {
      open: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      drawerWidth() {
        return this.temporary ? this.maxWidth : this.width;
      },
      drawerElement() {
        return this.$refs.drawer && this.$refs.drawer.$el;
      },
      isRight() {
        return this.$isRTL ? !this.right : this.right;
      },
    },
    mounted() {
      const { updateWidth } = this;
      this.throttledUpdateWidth = animationThrottle((...args) => updateWidth(...args));

      this.$nextTick(() => {
        if (this.drawerElement) {
          const drawerBorder = this.drawerElement.querySelector('.v-navigation-drawer__border');
          drawerBorder.addEventListener('mousedown', this.handleMouseDown, false);
          document.addEventListener('mouseup', this.handleMouseUp, false);
        }
      });
    },
    methods: {
      /**
       * @public
       * @return {number}
       */
      getWidth() {
        return this.width;
      },
      resize(e) {
        document.body.style.cursor = 'col-resize';
        this.throttledUpdateWidth(e.clientX);
      },
      updateWidth(clientX) {
        const offset = this.isRight ? window.innerWidth - clientX : clientX;
        this.width = localStorage[this.localStorageName] = Math.min(
          Math.max(this.minWidth, offset),
          this.maxWidth,
        );
        this.$emit('resize', this.width);
      },
      handleMouseDown(event) {
        if (this.temporary || this.dragging) {
          return;
        }

        // Don't select items on drag
        event.stopPropagation();
        event.preventDefault();

        this.dragging = true;

        document.body.style.pointerEvents = 'none';
        document.querySelectorAll('iframe, embed, video').forEach(iframe => {
          iframe.style.pointerEvents = 'none';
        });

        if (event.offsetX < 12) {
          if (this.drawerElement) {
            this.drawerElement.style.transition = 'initial';
          }
          document.addEventListener('mousemove', this.resize, false);
        }
      },
      handleMouseUp(event) {
        if (this.temporary || !this.dragging) {
          return;
        }

        this.dragging = false;
        this.throttledUpdateWidth.cancel();
        this.updateWidth(event.clientX);
        if (this.drawerElement) {
          this.drawerElement.style.transition = '';
        }

        document.body.style.cursor = '';
        document.body.style.pointerEvents = 'unset';
        document.querySelectorAll('iframe, embed, video').forEach(iframe => {
          iframe.style.pointerEvents = 'unset';
        });
        document.removeEventListener('mousemove', this.resize, false);
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  /*! rtl:begin:ignore */
  .drawer-left {
    right: auto;

    ::v-deep .v-navigation-drawer__border {
      margin-left: 3px;
      border-right: 1px solid var(--v-grey-lighten4);
    }
  }

  .drawer-right {
    left: auto;

    ::v-deep .v-navigation-drawer__border {
      margin-right: 3px;
      border-left: 1px solid var(--v-grey-lighten4);
    }
  }

  /*! rtl:end:ignore */

  .draggable ::v-deep .v-navigation-drawer__border {
    z-index: 16;
    width: 3px;
    height: 100%;
    cursor: col-resize;
    background: transparent !important;
    transition: background 0.2s ease;

    &:hover,
    &.dragging {
      background: var(--v-secondary-base) !important;
    }
  }

  .drawer-contents {
    width: 100%;
    height: inherit;
    overflow: auto;
  }

</style>
