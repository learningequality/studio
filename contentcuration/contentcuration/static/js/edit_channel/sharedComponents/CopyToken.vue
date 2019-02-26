<template>

  <div>
    <input type="text" ref="tokenText" :value="token" :title="$tr('copyPrompt')" size='15' readonly/>
    <span
      class="material-icons copy-id-btn"
      :title="$tr('copyPrompt')"
      @click.stop="copyToken"
    >{{copyIcon}}</span>
  </div>

</template>

<script>

const copyStatusCodes = {
  IDLE: "IDLE",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
}

export default {
  name: 'CopyToken',
  $trs: {
    copyPrompt: "Copy token to import channel into Kolibri",
  },
  data() {
    return {
      copyStatus: copyStatusCodes.IDLE
    }
  },
  props: {
    token: {
      type: String,
      required: true
    }
  },
  computed: {
    copyIcon() {
      switch(this.copyStatus) {
        case copyStatusCodes.SUCCESS:
          return "check"
        case copyStatusCodes.FAILED:
          return "clear"
        default:
          return "content_paste"
      }
    }
  },
  methods: {
    copyToken() {
      let element = this.$refs.tokenText;
      element.select();
      try {
        document.execCommand("copy");
        this.copyStatus = copyStatusCodes.SUCCESS;
      } catch (e) {
        this.copyStatus = copyStatusCodes.FAILED;
      }
      setTimeout(() => {
        this.copyStatus = copyStatusCodes.IDLE;
      }, 2500);
    }
  }
};

</script>


<style lang="less" scoped>

@import '../../../less/global-variables.less';
.copy-id-btn{
  padding:3px;
  font-size: 16pt;
  vertical-align: sub;
  &:hover { color:@blue-500; }
}
input {
  display: inline-block;
  padding: 2px;
  background-color: @gray-300;
  font-size: 11pt;
  border:none;
  font-weight: bold;
  width: 120px;
  text-align: center;
  color: @gray-700;
}

</style>
