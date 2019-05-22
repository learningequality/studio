<template>
  <Dialog ref="saveprompt" :header="header" :text="text">
    <template v-slot:content>
      <VCheckbox
        v-model="dontShowAgain"
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
        required: true,
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
        if (!_.contains(this.getMessages(), this.messageID)) this.dialog = true;
      },
      close() {
        if (this.dontShowAgain) {
          let messages = this.getMessages();
          messages.push(this.messageID);
          localStorage['dont_show_messages'] = messages;
        }
        this.dialog = false;
      },
    },
  };

</script>
