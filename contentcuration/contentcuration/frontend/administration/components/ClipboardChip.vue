<template>

  <div>
    <VChip label>
      <div class="label">
        {{ value }}
      </div>
    </VChip>
    <VBtn icon small right @click="copyToClipboard">
      <VIcon small>
        content_copy
      </VIcon>
    </VBtn>
  </div>

</template>


<script>

  export default {
    name: 'ClipboardChip',
    props: {
      value: String,
      successMessage: {
        default: 'Value copied to clipboard',
        type: String,
      },
    },
    methods: {
      copyToClipboard() {
        navigator.clipboard.writeText(this.value).then(() => {
          this.$store.dispatch('showSnackbarSimple', this.successMessage);
        });
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
