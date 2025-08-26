<template>

  <div class="token-input-wrapper">
    <KCircularLoader
      v-if="loading"
      size="38"
      class="loader"
    />
    <template v-else>
      <KTextbox
        ref="tokenInput"
        :value="displayToken"
        readonly
        class="notranslate token-input"
        label="Token"
        :floatingLabel="false"
        :appearanceOverrides="{ maxWidth: 'none !important', width: '100% !important' }"
      />
      <KIconButton
        icon="copy"
        :text="$tr('copyTokenButton')"
        class="copy-button"
        @click="copyToClipboard"
      />
    </template>
  </div>

</template>


<script>

  export default {
    name: 'StudioCopyToken',
    props: {
      token: { type: String, required: true },
      loading: { type: Boolean, default: false },
      hyphenate: { type: Boolean, default: true },
    },
    computed: {
      displayToken() {
        return this.hyphenate ? this.token.slice(0, 5) + '-' + this.token.slice(5) : this.token;
      },
      successMessage() {
        return this.$tr('tokenCopied');
      },
    },
    methods: {
      copyToClipboard() {
        if (!this.token.trim()) {
          this.$store.dispatch('showSnackbarSimple', this.$tr('tokenCopyFailed'));
          return;
        }
        if (navigator.clipboard) {
          navigator.clipboard
            .writeText(this.displayToken)
            .then(() => {
              this.$store.dispatch('showSnackbarSimple', this.successMessage);
            })
            .catch(() => {
              this.$store.dispatch('showSnackbarSimple', this.$tr('tokenCopyFailed'));
            });
        } else {
          this.$store.dispatch('showSnackbarSimple', this.$tr('tokenCopyFailed'));
        }
      },
    },
    $trs: {
      copyTokenButton: 'Copy token',
      tokenCopied: 'Token copied!',
      tokenCopyFailed: 'Failed to copy token.',
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
    opacity: 0.8;
  }

  .copy-button:hover {
    opacity: 1;
  }

</style>
