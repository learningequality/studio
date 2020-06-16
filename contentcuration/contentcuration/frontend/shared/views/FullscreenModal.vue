<template>

  <VDialog
    ref="dialog"
    :value="value"
    attach="body"
    fullscreen
    scrollable
    app
    persistent
    transition="dialog-bottom-transition"
  >
    <VCard style="overflow-y: auto;">
      <VToolbar :color="color" dark fixed :extension-height="48">
        <VToolbarItems>
          <slot name="close">
            <VBtn flat icon exact data-test="close" @click="$emit('input', false)">
              <Icon>clear</Icon>
            </VBtn>
          </slot>
        </VToolbarItems>
        <VToolbarTitle>
          <slot name="header">
            {{ header }}
          </slot>
        </VToolbarTitle>
        <VSpacer />
        <slot name="action"></slot>
        <template v-if="$slots.tabs" #extension>
          <VTabs
            color="primary"
            slider-color="white"
            align-with-title
          >
            <slot name="tabs"></slot>
          </VTabs>
        </template>
      </VToolbar>
      <VContainer style="margin-top: 64px;">
        <slot></slot>
      </VContainer>
      <BottomToolBar v-if="$slots.bottom" color="white" flat>
        <OfflineText />
        <VSpacer />
        <slot name="bottom"></slot>
      </BottomToolBar>
      <OfflineText v-else bottom />
    </VCard>
  </VDialog>

</template>

<script>

  import OfflineText from './OfflineText';
  import BottomToolBar from './BottomToolBar';

  export default {
    name: 'FullscreenModal',
    components: {
      OfflineText,
      BottomToolBar,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      header: {
        type: String,
        required: false,
      },
      color: {
        type: String,
        default: 'primary',
      },
    },
    watch: {
      value(val) {
        this.hideHTMLScroll(!!val);
      },
    },
    mounted() {
      this.hideHTMLScroll(true);
    },
    methods: {
      hideHTMLScroll(hidden) {
        document.querySelector('html').style = hidden
          ? 'overflow-y: hidden !important;'
          : 'overflow-y: auto !important';
      },
    },
  };

</script>


<style lang="less" scoped>

  .v-toolbar__title {
    font-weight: bold;
  }

  /deep/ .v-tabs__div {
    min-width: 160px;
  }
  /deep/ .v-tabs__container {
    padding: 0;
  }

</style>
