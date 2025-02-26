<template>

  <VDialog
    ref="dialog"
    :value="value"
    app
    fullscreen
    scrollable
    persistent
    transition="dialog-bottom-transition"
    v-bind="$attrs"
  >
    <VCard style="overflow-y: auto">
      <VToolbar
        :color="color"
        :dark="dark"
        fixed
        :extension-height="48"
        clipped-left
        clipped-right
      >
        <VToolbarItems>
          <slot name="close">
            <VBtn flat icon exact data-test="close" @click="$emit('input', false)">
              <Icon icon="clear" :color="$themeTokens.textInverted" />
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
          <Tabs :color="color" slider-color="white" align-with-title>
            <slot name="tabs"></slot>
          </Tabs>
        </template>
      </VToolbar>
      <OfflineText toolbar :offset="topToolbarHeight" />
      <VContainer :style="`margin-top: ${contentOffset}px;`" fluid class="pa-0">
        <slot></slot>
      </VContainer>
      <BottomBar v-if="$slots.bottom">
        <slot name="bottom"></slot>
      </BottomBar>
    </VCard>
  </VDialog>

</template>

<script>

  import { mapState } from 'vuex';
  import OfflineText from './OfflineText';
  import BottomBar from './BottomBar';
  import Tabs from './Tabs';

  export default {
    name: 'FullscreenModal',
    components: {
      OfflineText,
      BottomBar,
      Tabs,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      header: {
        type: String,
        required: false,
        default: '',
      },
      color: {
        type: String,
        default: 'appBarDark',
      },
      dark: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      ...mapState({
        offline: state => !state.connection.online,
      }),
      topToolbarHeight() {
        return this.$slots.tabs && this.$slots.tabs.length ? 112 : 64;
      },
      contentOffset() {
        return this.topToolbarHeight + (this.offline ? 48 : 0);
      },
    },
    watch: {
      value(val) {
        this.hideHTMLScroll(!!val);
      },
    },
    activated() {
      this.hideHTMLScroll(true);
    },
    deactivated() {
      this.hideHTMLScroll(false); // Ensure scroll is restored when the component is destroyed
    },
    mounted() {
      this.$refs.dialog.initDetach();
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

<style lang="scss" scoped>

  ::v-deep .v-tabs__div {
    min-width: 160px;
  }

  ::v-deep .v-tabs__container {
    padding: 0;
  }

</style>
