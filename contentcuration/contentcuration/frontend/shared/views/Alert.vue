<template>

  <PrimaryDialog v-model="open" :title="header">
    {{ text }}
    <slot></slot>
    <VCheckbox
      v-if="messageId"
      v-model="dontShowAgain"
      color="primary"
      :label="$tr('dontShowAgain')"
    />
    <template v-slot:actions>
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
        dontShowAgain: this.messageId
          ? Boolean(window.localStorage.getItem(`dont_show_messages_${this.messageId}`))
          : false,
      };
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
