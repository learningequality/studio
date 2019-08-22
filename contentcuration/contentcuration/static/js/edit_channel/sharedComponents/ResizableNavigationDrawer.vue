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
        default: window.innerWidth - 100,
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

  @border-color: @gray-200;

  /deep/ .v-navigation-drawer__border {
    width: 9px;
    height: 100%;
    // width: 10px;
    // cursor: col-resize;
    // background: transparent !important;
    // border-right: 1px solid @gray-300;
    margin-left: 10px;
    cursor: col-resize;
    background-color: @gray-100 !important;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='9' height='30'><path d='M3 0 v30 M6 0 v30' fill='none' stroke='darkgray'/></svg>");
    background-repeat: no-repeat;
    background-position: 50% 45%;
    border-right: 1px solid @border-color;
    border-left: 1px solid @border-color;
  }

</style>
