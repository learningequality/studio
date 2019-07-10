<template>
  <VTextField
    v-if="token"
    v-model="token"
    :title="$tr('copyPrompt')"
    :prependInnerIcon="copyIcon"
    readonly
    color="primary"
    :hideDetails="true"
    style="padding: 0px;"
    @click:prepend-inner.stop="copyToken"
    @click.stop
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
    $trs: {
      copyPrompt: 'Copy token to import channel into Kolibri',
    },
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
    },
    methods: {
      copyToken() {
        clipboard
          .writeText(this.token)
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
  };

</script>
