<template>

  <MessageDialog
    v-model="open"
    :header="header"
    :text="text"
  >
    <slot></slot>
    <VCheckbox
      v-if="messageId"
      v-model="dontShowAgain"
      color="primary"
      :label="$tr('dontShowAgain')"
    />
    <template #buttons="{ close }">
      <VSpacer />
      <VBtn
        depressed
        color="primary"
        data-test="ok"
        @click="close"
      >
        {{ $tr('closeButtonLabel') }}
      </VBtn>
    </template>
  </MessageDialog>

</template>


<script>

  import MessageDialog from './MessageDialog';

  export default {
    name: 'Alert',
    components: {
      MessageDialog,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      header: {
        type: String,
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
      messageId: {
        type: String,
        required: false,
        default: null,
      },
    },
    computed: {
      open: {
        get() {
          return Boolean(!this.dontShowAgain && this.value);
        },
        set(open) {
          this.$emit('input', open);
        },
      },
      dontShowAgain: {
        get() {
          return this.messageId
            ? Boolean(localStorage[`dont_show_messages_${this.messageId}`])
            : false;
        },
        set(value) {
          if (value) {
            localStorage[`dont_show_messages_${this.messageId}`] = true;
          } else {
            delete localStorage[`dont_show_messages_${this.messageId}`];
          }
        },
      },
    },
    methods: {
      /**
       * @public
       */
      prompt() {
        this.open = true;
      },
    },
    $trs: {
      closeButtonLabel: 'OK',
      dontShowAgain: "Don't show this message again",
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep label {
    margin: 0;
    font-weight: normal;
  }

  .v-input--checkbox {
    margin-bottom: -25px;
  }

</style>
