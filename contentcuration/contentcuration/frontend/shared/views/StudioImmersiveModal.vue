<template>

  <div
    v-if="value"
    class="modal-wrapper"
  >
    <KToolbar
      :textColor="dark ? 'white' : 'black'"
      :style="toolbarStyle"
    >
      <template #icon>
        <KIconButton
          icon="close"
          :ariaLabel="$tr('close')"
          :tooltip="$tr('close')"
          :color="dark ? $themeTokens.textInverted : $themeTokens.text"
          data-test="close"
          @click="$emit('input', false)"
        />
      </template>

      <template #default>
        <span class="notranslate">
          <slot name="header">{{ title }}</slot>
        </span>
      </template>

      <template #actions>
        <slot name="action"></slot>
      </template>
    </KToolbar>
    <StudioOfflineAlert :offset="64" />
    <StudioPage
      class="modal-content"
      :offline="offline"
    >
      <slot></slot>
    </StudioPage>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import StudioOfflineAlert from './StudioOfflineAlert';
  import StudioPage from './StudioPage';

  export default {
    name: 'StudioImmersiveModal',
    components: {
      StudioOfflineAlert,
      StudioPage,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      title: {
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
      toolbarStyle() {
        const backgroundColor =
          this.color === 'appBarDark'
            ? this.$themePalette.grey.v_900
            : this.$themeTokens[this.color] || this.color;
        return {
          backgroundColor,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 17,
        };
      },
    },
    watch: {
      value(val) {
        this.hideHTMLScroll(!!val);
        if (val) {
          document.addEventListener('keydown', this.handleKeyDown);
        } else {
          document.removeEventListener('keydown', this.handleKeyDown);
        }
      },
    },
    beforeDestroy() {
      this.hideHTMLScroll(false);
      document.removeEventListener('keydown', this.handleKeyDown);
    },
    methods: {
      hideHTMLScroll(hidden) {
        document.querySelector('html').style = hidden
          ? 'overflow-y: hidden !important;'
          : 'overflow-y: auto !important';
      },
      handleKeyDown(event) {
        if (event.key === 'Escape') {
          this.$emit('input', false);
        }
      },
    },
    $trs: {
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  .modal-wrapper {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 17;
    display: flex;
    flex-direction: column;
    background-color: white;
  }

  .modal-content {
    flex: 1;
    width: 100%;
    overflow-y: auto;
  }

</style>
