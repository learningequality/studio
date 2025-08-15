<template>

  <div class="token-input-wrapper">
    <KCircularLoader
      v-if="loading"
      :shouldShow="loading"
      size="38"
      class="loader"
    />
    <template v-else>
      <KTextbox
        ref="tokenInput"
        :value="displayToken"
        readonly
        class="notranslate token-input"
        label=" "
        :floatingLabel="false"
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
    align-items: center;
    width: 100%;
    height: 48px;
    background-color: #ebebeb !important;
  }

  .loader {
    margin: auto;
  }

  .token-input {
    display: flex;
    flex: 1;
    align-items: center;
    margin: 0;
  }

  .token-input ::v-deep(.mh),
  .token-input ::v-deep(.textbox) {
    width: 100% !important;
    max-width: none !important;
  }

  .token-input ::v-deep(.ui-textbox) {
    margin: 0;
    box-shadow: none;
  }

  .token-input ::v-deep(.ui-textbox-feedback) {
    display: none !important;
  }

  .token-input ::v-deep(.ui-textbox-input) {
    width: 100%;
    height: 38px !important;
    padding-right: 38px;
    overflow-x: auto;
    font-size: large;
    line-height: 2px;
    color: #333333;
    white-space: nowrap;
    background-color: #ebebeb !important;
  }

  .token-input ::v-deep(.ui-textbox-label) {
    background: none !important;
  }

  .copy-button {
    opacity: 0.8;
  }

  .copy-button:hover {
    opacity: 1;
  }

</style>
