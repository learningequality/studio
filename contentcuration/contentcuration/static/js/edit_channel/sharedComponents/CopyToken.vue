<template>
  <div>
    <input
      ref="tokenText"
      type="text"
      :value="token"
      :title="$tr('copyPrompt')"
      size="15"
      readonly
    >
    <a
      class="material-icons copy-id-btn"
      :title="$tr('copyPrompt')"
      :data-gtag="token"
      @click.stop="copyToken"
    >
      {{ copyIcon }}
    </a>
  </div>
</template>

<script>

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
        let element = this.$refs.tokenText;
        element.select();
        try {
          document.execCommand('copy');
          this.copyStatus = copyStatusCodes.SUCCESS;
        } catch (e) {
          this.copyStatus = copyStatusCodes.FAILED;
        }
        setTimeout(() => {
          this.copyStatus = copyStatusCodes.IDLE;
        }, 2500);
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../less/global-variables.less';
  .copy-id-btn {
    padding: 3px;
    font-size: 16pt;
    color: @gray-500;
    vertical-align: sub;
    &:hover {
      color: @blue-500;
    }
  }
  input {
    display: inline-block;
    width: 120px;
    padding: 2px;
    font-size: 11pt;
    font-weight: bold;
    color: @gray-700;
    text-align: center;
    background-color: @gray-300;
    border: 0;
  }

</style>
