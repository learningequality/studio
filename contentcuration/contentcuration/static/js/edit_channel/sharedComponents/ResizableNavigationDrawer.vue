<template>
  <VNavigationDrawer
    ref="drawer"
    v-model="drawer.open"
    v-bind="$attrs"
    :width="drawer.width"
  >
    <slot name="content"></slot>
  </VNavigationDrawer>
</template>

<script>

  export default {
    name: 'ResizableNavigationDrawer',
    $trs: {},
    props: {
      minWidth: {
        type: Number,
        default: 150,
      },
      maxWidth: {
        type: Number,
        default: window.innerWidth / 2,
      },
      open: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        drawer: {
          open: true,
          width: localStorage['edit-modal-width'] || 300,
        },
      };
    },
    beforeMount() {
      this.drawer.open = this.open;
    },
    mounted() {
      this.$nextTick(this.setResizeEvents);
    },
    methods: {
      resize(e) {
        document.body.style.cursor = 'col-resize';
        let width = Math.min(Math.max(this.minWidth, e.clientX), this.maxWidth) + 'px';
        this.$refs.drawer.$el.style.width = localStorage['edit-modal-width'] = width;
      },
      setResizeEvents() {
        const el = this.$refs.drawer.$el;
        const drawerBorder = el.querySelector('.v-navigation-drawer__border');

        drawerBorder.addEventListener(
          'mousedown',
          e => {
            // Don't select items on drag
            e.stopPropagation();
            e.preventDefault();

            if (e.offsetX < 12) {
              el.style.transition = 'initial';
              document.addEventListener('mousemove', this.resize, false);
            }
          },
          false
        );

        document.addEventListener(
          'mouseup',
          () => {
            el.style.transition = '';
            this.drawer.width = el.style.width;
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', this.resize, false);
          },
          false
        );
      },
      removeResizeEvents() {
        const el = this.$refs.drawer.$el;
        const drawerBorder = el.querySelector('.v-navigation-drawer__border');
        drawerBorder.removeEventListener('mousedown', this.resize, false);
        document.removeEventListener(
          'mouseup',
          () => {
            el.style.transition = '';
            this.drawer.width = el.style.width;
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', this.resize, false);
          },
          false
        );
      },
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../less/global-variables.less';

  /deep/ .v-navigation-drawer__border {
    width: 10px;
    cursor: col-resize;
    background: transparent !important;
    border-right: 1px solid @gray-300;
  }

</style>
