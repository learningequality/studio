<template>

  <VTextField
    v-if="token"
    v-model="displayToken"
    :title="$tr('copyPrompt')"
    :appendOuterIcon="copyIcon"
    readonly
    color="primary"
    :hideDetails="true"
    single-line
    style="padding: 0;"
    class="notranslate"
    @click:append-outer.stop="copyToken"
    @click.stop.prevent=""
  />

</template>

<script>

  import * as clipboard from 'clipboard-polyfill';

  const copyStatusCodes = {
    IDLE: 'IDLE',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
  };

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
    },
    data() {
      return {
        copyStatus: copyStatusCodes.IDLE,
      };
    },
    computed: {
      copyIcon() {
        switch (this.copyStatus) {
          case copyStatusCodes.SUCCESS:
            return 'check';
          case copyStatusCodes.FAILED:
            return 'clear';
          default:
            return 'content_copy';
        }
      },
      displayToken() {
        return this.hyphenate ? this.token.slice(0, 5) + '-' + this.token.slice(5) : this.token;
      },
    },
    methods: {
      copyToken() {
        clipboard
          .writeText(this.displayToken)
          .then(() => {
            this.copyStatus = copyStatusCodes.SUCCESS;
          })
          .catch(() => {
            this.copyStatus = copyStatusCodes.FAILED;
          })
          .then(() => {
            setTimeout(() => {
              this.copyStatus = copyStatusCodes.IDLE;
            }, 2500);
          });
      },
    },
    $trs: {
      copyPrompt: 'Copy token to import channel into Kolibri',
    },
  };

</script>
