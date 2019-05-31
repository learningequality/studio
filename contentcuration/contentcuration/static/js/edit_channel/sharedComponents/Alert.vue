<template>
  <Dialog ref="alert" :header="header" :text="text">
    <template v-slot:content>
      <VCheckbox
        v-if="messageID"
        v-model="dontShowAgain"
        color="primary"
        :label="$tr('dontShowAgain')"
      />
    </template>
    <template v-slot:buttons>
      <VSpacer />
      <VBtn depressed color="primary" @click="close">
        {{ $tr('closeButtonLabel') }}
      </VBtn>
    </template>
  </Dialog>
</template>

<script>

  import _ from 'underscore';
  import Dialog from './Dialog.vue';

  export default {
    name: 'Alert',
    $trs: {
      closeButtonLabel: 'OK',
      dontShowAgain: "Don't show this message again",
    },
    components: {
      Dialog,
    },
    props: {
      header: {
        type: String,
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
      messageID: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        dialog: false,
        dontShowAgain: false,
      };
    },
    methods: {
      getMessages() {
        return (localStorage['dont_show_messages'] || '').split(',');
      },
      prompt() {
        if (!this.messageID || !_.contains(this.getMessages(), this.messageID)) {
          this.$refs.alert.prompt();
        }
      },
      close() {
        if (this.dontShowAgain) {
          let messages = this.getMessages();
          messages.push(this.messageID);
          localStorage['dont_show_messages'] = messages;
        }
        this.$refs.alert.close();
      },
    },
  };

</script>

<style lang="less" scoped>

  /deep/ label {
    margin: 0;
    font-weight: normal;
  }
  .v-input--checkbox {
    margin-bottom: -25px;
  }

</style>
