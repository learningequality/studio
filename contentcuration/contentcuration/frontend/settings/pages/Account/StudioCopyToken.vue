<template>

  <div :class="{ 'token-input-wrapper-small': isSmall() }">
    <div
      v-if="show('loader', loading, 500)"
      class="loader"
    >
      <KCircularLoader />
    </div>
    <KTextbox
      v-else
      :value="displayToken"
      readonly
      class="notranslate token-input"
      :label="$tr('token')"
      :floatingLabel="false"
      :appearanceOverrides="{ maxWidth: 'none !important', width: '100% !important' }"
    >
      <template #innerAfter>
        <KIconButton
          icon="copy"
          :tooltip="$tr('tooltipText')"
          class="copy-button"
          @click="copyToClipboard"
        />
      </template>
    </KTextbox>
  </div>

</template>


<script>

  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'StudioCopyToken',
    setup() {
      const { show } = useKShow();
      const { windowBreakpoint } = useKResponsiveWindow();

      return { show, windowBreakpoint };
    },
    props: {
      token: {
        type: String,
        required: true,
      },
      hyphenate: {
        type: Boolean,
        default: true,
      },
      successText: {
        type: String,
        required: false,
        default: null,
      },
      loading: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      displayToken() {
        return this.hyphenate ? this.token.slice(0, 5) + '-' + this.token.slice(5) : this.token;
      },
      clipboardAvailable() {
        return Boolean(navigator.clipboard);
      },
    },
    methods: {
      isSmall() {
        return this.windowBreakpoint <= 1;
      },
      copyToClipboard() {
        if (!this.token.trim()) {
          this.$store.dispatch('showSnackbarSimple', this.$tr('copyFailed'));
          return;
        }
        if (this.clipboardAvailable) {
          navigator.clipboard
            .writeText(this.displayToken)
            .then(() => {
              const text = this.successText || this.$tr('copiedTokenId');
              this.$store.dispatch('showSnackbar', { text });
              this.$analytics.trackEvent('copy_token');
              this.$emit('copied');
            })
            .catch(() => {
              this.$store.dispatch('showSnackbar', { text: this.$tr('copyFailed') });
            });
        }
      },
    },
    $trs: {
      copiedTokenId: 'Token copied',
      copyFailed: 'Copy failed',
      token: 'Token',
      tooltipText: 'Copy token to import channel into Kolibri',
    },
  };

</script>


<style scoped>

  .loader {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 70px;
  }

  .copy-button {
    margin: 0 0.5rem 0.5rem 0;
    opacity: 0.8;
  }

  .copy-button:hover {
    opacity: 1;
  }

  .token-input-wrapper-small {
    min-width: 100%;
    margin-right: 0.5rem;
  }

</style>
