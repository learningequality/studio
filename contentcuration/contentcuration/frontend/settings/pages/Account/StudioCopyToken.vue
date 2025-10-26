<template>

  <div :class="['token-input-wrapper', { 'token-input-wrapper-small': isSmall() }]">
    <KCircularLoader
      v-if="show('loader', loading, 500)"
      class="loader"
    />
    <template v-else>
      <KTextbox
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
            :tooltip="$tr('copyTokenButton')"
            class="copy-button"
            @click="copyToClipboard"
          />
        </template>
      </KTextbox>
    </template>
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
      token: { type: String, required: true },
      loading: { type: Boolean, default: false },
      hyphenate: { type: Boolean, default: true },
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
      copyTokenButton: 'Copy token',
      copiedTokenId: 'Token copied',
      copyFailed: 'Copy failed',
      token: 'Token',
    },
  };

</script>


<style scoped>

  .token-input-wrapper {
    display: flex;
    align-items: start;
    justify-content: center;
  }

  .loader {
    margin: auto;
  }

  .token-input {
    flex: 1;
    width: 100%;
    max-width: none;
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
