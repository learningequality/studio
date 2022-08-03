<template>

  <VTextField
    v-if="token"
    v-model="displayToken"
    :title="$tr('copyPrompt')"
    appendIcon="content_copy"
    readonly
    color="primary"
    :hideDetails="true"
    single-line
    box
    style="padding: 0;"
    class="notranslate"
    :loading="loading"
    @click:append.stop="copyToken"
    @click.stop.prevent=""
  />

</template>

<script>

  import * as clipboard from 'clipboard-polyfill';

  export default {
    name: 'CopyToken',
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
    },
    methods: {
      copyToken() {
        clipboard
          .writeText(this.displayToken)
          .then(() => {
            let text = this.successText || this.$tr('copiedTokenId');
            this.$store.dispatch('showSnackbar', { text });
            this.$analytics.trackEvent('copy_token');
            this.$emit('copied');
          })
          .catch(() => {
            this.$store.dispatch('showSnackbar', { text: this.$tr('copyFailed') });
          });
      },
    },
    $trs: {
      copyPrompt: 'Copy token to import channel into Kolibri',
      copiedTokenId: 'Token copied',
      copyFailed: 'Copy failed',
    },
  };

</script>

<style lang="less" scoped>

  .v-text-field /deep/ input[type='text'] {
    color: var(--v-grey-darken1) !important;
  }

  .v-text-field /deep/ .v-input__slot::before {
    border-style: dotted !important;
  }

</style>
