<template>

  <div
    v-if="value"
    class="modal-wrapper"
  >
    <KToolbar
      :textColor="dark ? 'white' : 'black'"
      :style="{ backgroundColor: toolbarBackgroundColor }"
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
        <span class="notranslate toolbar-title">
          <slot name="header">{{ title }}</slot>
        </span>
      </template>

      <template #actions>
        <slot name="action"></slot>
      </template>
    </KToolbar>

    <StudioOfflineAlert :offset="64" />

    <StudioPage
      :offline="offline"
      :marginTop="contentMarginTop"
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
      toolbarBackgroundColor() {
        return this.color === 'appBarDark'
          ? this.$themePalette.grey.v_900
          : this.$themeTokens[this.color] || this.color;
      },
      contentMarginTop() {
        return this.offline ? 112 : 64;
      },
    },
    mounted() {
      this.hideHTMLScroll(true);
      const handleKeyDown = event => {
        if (event.key === 'Escape') {
          this.$emit('input', false);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      this.$once('hook:beforeDestroy', () => {
        this.hideHTMLScroll(false);
        document.removeEventListener('keydown', handleKeyDown);
      });
    },
    methods: {
      hideHTMLScroll(hidden) {
        document.querySelector('html').style = hidden
          ? 'overflow-y: hidden !important;'
          : 'overflow-y: auto !important';
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
    overflow-y: auto;
    background-color: white;
  }

  .toolbar-title {
    display: block;
    max-width: calc(100% - 80px);
    margin-inline-start: 16px;
    margin-inline-end: 16px;
    white-space: nowrap;
  }

</style>
