<template>

  <div>
    <VChip label class="ml-0">
      <div class="label">
        {{ value }}
      </div>
    </VChip>
    <VBtn
      v-if="clipboardAvailable"
      icon
      small
      right
      data-test="copy"
      @click="copyToClipboard"
    >
      <Icon small>
        content_copy
      </Icon>
    </VBtn>
  </div>

</template>


<script>

  export default {
    name: 'ClipboardChip',
    props: {
      value: {
        type: String,
        required: true,
      },
      successMessage: {
        default: 'Value copied to clipboard',
        type: String,
      },
    },
    computed: {
      clipboardAvailable() {
        return Boolean(navigator.clipboard);
      },
    },
    methods: {
      copyToClipboard() {
        if (this.clipboardAvailable) {
          navigator.clipboard.writeText(this.value).then(() => {
            this.$store.dispatch('showSnackbarSimple', this.successMessage);
          });
        }
      },
    },
  };

</script>


<style lang="less" scoped>

  div {
    white-space: nowrap;
  }

  div.label {
    max-width: 8em;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .VBtn:hover::before,
  .VBtn:focus::before {
    background-color: transparent;
  }

</style>
