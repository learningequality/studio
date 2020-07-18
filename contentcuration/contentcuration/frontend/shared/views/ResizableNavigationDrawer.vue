<template>

  <VNavigationDrawer
    ref="drawer"
    v-model="drawer.open"
    v-bind="$attrs"
    :width="drawer.width"
    :right="right"
    :class="right? 'drawer-right': 'drawer-left'"
    @input="v => $emit('input', v)"
  >
    <div class="drawer-contents">
      <slot></slot>
    </div>
  </VNavigationDrawer>

</template>

<script>

  export default {
    name: 'ResizableNavigationDrawer',
    props: {
      minWidth: {
        type: Number,
        default: 10,
      },
      maxWidth: {
        type: Number,
        default: window.innerWidth - 100,
      },
      open: {
        type: Boolean,
        default: true,
      },
      localName: {
        type: String,
        required: true,
      },
      right: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        drawer: {
          open: true,
          width: 300,
        },
      };
    },
    computed: {
      drawerElement() {
        return this.$refs.drawer.$el;
      },
      localStorageName() {
        return this.localName + '-drawer-width';
      },
    },
    beforeMount() {
      this.drawer.open = this.open;
      this.drawer.width = localStorage[this.localStorageName] || this.drawer.width;
    },
    mounted() {
      this.$nextTick(() => {
        const drawerBorder = this.drawerElement.querySelector('.v-navigation-drawer__border');
        drawerBorder.addEventListener('mousedown', this.handleMouseDown, false);
        document.addEventListener('mouseup', this.handleMouseUp, false);
      });
    },
    methods: {
      resize(e) {
        document.body.style.cursor = 'col-resize';
        let offset = this.right ? window.innerWidth - e.clientX : e.clientX;
        let width = Math.min(Math.max(this.minWidth, offset), this.maxWidth);
        this.drawerElement.style.width = localStorage[this.localStorageName] = width + 'px';
      },
      handleMouseDown(event) {
        // Don't select items on drag
        event.stopPropagation();
        event.preventDefault();

        document.body.style.pointerEvents = 'none';
        document.querySelectorAll('iframe, embed').forEach(iframe => {
          iframe.style.pointerEvents = 'none';
        });

        if (event.offsetX < 12) {
          this.drawerElement.style.transition = 'initial';
          document.addEventListener('mousemove', this.resize, false);
        }
      },
      handleMouseUp() {
        this.drawerElement.style.transition = '';
        this.drawer.width = this.drawerElement.style.width;
        document.body.style.cursor = '';
        document.body.style.pointerEvents = 'unset';
        document.querySelectorAll('iframe, embed').forEach(iframe => {
          iframe.style.pointerEvents = 'unset';
        });
        document.removeEventListener('mousemove', this.resize, false);
      },
    },
    $trs: {},
  };

</script>

<style lang="less" scoped>

  .drawer-left /deep/ .v-navigation-drawer__border {
    margin-left: 3px;
    border-right: 1px solid var(--v-grey-lighten4);
  }
  .drawer-right /deep/ .v-navigation-drawer__border {
    margin-right: 3px;
    border-left: 1px solid var(--v-grey-lighten4);
  }

  /deep/ .v-navigation-drawer__border {
    width: 3px;
    height: 100%;
    cursor: col-resize;
    background: transparent !important;
  }

  .drawer-contents {
    width: 100%;
    height: inherit;
    overflow: auto;
  }

</style>
