<template>

  <VTextField
    v-if="token"
    v-model="displayToken"
    :title="$tr('copyPrompt')"
    :appendIcon="copyIcon"
    readonly
    color="primary"
    :hideDetails="true"
    single-line
    style="max-width: max-content; padding: 0;"
    @click:append.stop="copyToken"
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
            return 'content_paste';
        }
      },
      displayToken() {
        return this.token.slice(0, 5) + '-' + this.token.slice(5);
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
