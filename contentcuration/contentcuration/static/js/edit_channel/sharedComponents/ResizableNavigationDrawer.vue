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
        default: 10,
      },
      maxWidth: {
        type: Number,
        default: window.innerWidth * 0.7,
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
    computed: {
      drawerElement() {
        return this.$refs.drawer.$el;
      },
    },
    beforeMount() {
      this.drawer.open = this.open;
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
        let width = Math.min(Math.max(this.minWidth, e.clientX), this.maxWidth) + 'px';
        this.drawerElement.style.width = localStorage['edit-modal-width'] = width;
      },
      handleMouseDown(event) {
        // Don't select items on drag
        event.stopPropagation();
        event.preventDefault();

        if (event.offsetX < 12) {
          this.drawerElement.style.transition = 'initial';
          document.addEventListener('mousemove', this.resize, false);
        }
      },
      handleMouseUp() {
        this.drawerElement.style.transition = '';
        this.drawer.width = this.drawerElement.style.width;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', this.resize, false);
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
