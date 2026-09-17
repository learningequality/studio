<template>

  <div>
    <VChip
      label
      class="ml-0"
    >
      <div class="label">
        {{ value }}
      </div>
    </VChip>
    <VBtn
      v-if="clipboardAvailable"
      ref="copyButton"
      icon
      small
      right
      @click="copyToClipboard"
    >
      <Icon icon="copy" />
    </VBtn>
  </div>

</template>


<script>

  import useKSnackbar from 'kolibri-design-system/lib/composables/useKSnackbar';

  export default {
    name: 'ClipboardChip',
    setup() {
      const { createSnackbar } = useKSnackbar();
      return { createSnackbar };
    },
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
            this.createSnackbar({
              text: this.successMessage,
              autoDismiss: true,
              announce: true,
              duration: 6000,
            });
          });
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  div {
    white-space: nowrap;
  }

  div.label {
    max-width: 8em;
    overflow: hidden;
    text-overflow: ellipsis;
  }

</style>
