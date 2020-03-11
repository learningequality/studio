<template>

  <VTextField
    v-if="token"
    v-model="displayToken"
    :title="$tr('copyPrompt')"
    appendOuterIcon="content_copy"
    readonly
    color="primary"
    :hideDetails="true"
    single-line
    box
    style="padding: 0;"
    class="notranslate"
    @click:append-outer.stop="copyToken"
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
          })
          .catch(() => {
            this.$store.dispatch('showSnackbar', { text: this.$tr('copyFailed') });
          });
      },
    },
    $trs: {
      copyPrompt: 'Copy token to import channel into Kolibri',
      copiedTokenId: 'Copied token ID',
      copyFailed: 'Copy failed',
    },
  };

</script>
