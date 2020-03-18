<template>

  <PrimaryDialog v-model="open" :header="header" :text="text">
    <slot></slot>
    <VCheckbox
      v-if="messageId"
      v-model="dontShowAgain"
      color="primary"
      :label="$tr('dontShowAgain')"
    />
    <template v-slot:buttons>
      <VSpacer />
      <VBtn depressed color="primary" @click="close">
        {{ $tr('closeButtonLabel') }}
      </VBtn>
    </template>
  </PrimaryDialog>

</template>

<script>

  import PrimaryDialog from './PrimaryDialog';

  export default {
    name: 'Alert',
    components: {
      PrimaryDialog,
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
      messageId: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        value: false,
      };
    },
    data() {
      if (this.messageId) {
        return {
          dontShowAgain: window.localStorage.getItem(`dont_show_messages_${this.messageId}`),
        };
      }
      return {};
    },
    computed: {
      open: {
        get() {
          return Boolean(!this.dontShowAgain && this.value);
        },
        set(open) {
          this.value = open;
        },
      },
    },
    watch: {
      dontShowAgain(newVal, oldVal) {
        if (newVal && !oldVal && this.messageId) {
          window.localStorage.setItem(`dont_show_messages_${this.messageId}`, true);
        }
      },
    },
    methods: {
      /*
       * @public
       */
      prompt() {
        this.open = true;
      },
      /*
       * @public
       */
      close() {
        this.open = false;
      },
    },
    $trs: {
      closeButtonLabel: 'OK',
      dontShowAgain: "Don't show this message again",
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
