<template>

  <div
    v-if="value"
    class="studio-immersive-modal"
  >
    <div
      class="backdrop"
      @click="handleBackdropClick"
    ></div>
    <div class="modal-wrapper">
      <KToolbar
        :textColor="dark ? 'white' : 'black'"
        :style="toolbarStyle"
      >
        <template #icon>
          <KIconButton
            icon="close"
            :ariaLabel="$tr('close')"
            :color="dark ? $themeTokens.textInverted : $themeTokens.text"
            data-test="close"
            @click="$emit('input', false)"
          />
        </template>
        <template #default>
          <div class="toolbar-title">
            <slot name="header">
              <span class="notranslate">{{ title }}</span>
            </slot>
          </div>
        </template>
        <template #actions>
          <slot name="action"></slot>
        </template>
      </KToolbar>
      <StudioOfflineAlert :offset="64" />
      <div
        class="modal-content"
        :style="contentStyle"
      >
        <div class="content-container">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import StudioOfflineAlert from './StudioOfflineAlert';

  export default {
    name: 'StudioImmersiveModal',
    components: {
      StudioOfflineAlert,
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
      contentStyle() {
        const topOffset = this.offline ? 112 : 64;
        return {
          marginTop: `${topOffset}px`,
          height: `calc(100vh - ${topOffset}px)`,
          overflowY: 'auto',
          backgroundColor: this.$themeTokens.surface,
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
    mounted() {
      this.hideHTMLScroll(this.value);
      if (this.value) {
        document.addEventListener('keydown', this.handleKeyDown);
      }
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
      handleBackdropClick() {
        // Don't close on backdrop click (persistent modal)
        // This matches the behavior of FullscreenModal
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

  .studio-immersive-modal {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 16;
  }

  .backdrop {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 16;
    background-color: rgba(0, 0, 0, 0.5);
  }

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

  .content-container {
    max-width: 1000px;
    padding: 32px 48px;
    margin: 0 auto;
  }

  @media (max-width: 960px) {
    .content-container {
      padding: 24px;
    }
  }

  @media (max-width: 600px) {
    .content-container {
      padding: 16px;
    }
  }

  .toolbar-title {
    font-size: 20px;
    font-weight: 500;
  }

</style>
