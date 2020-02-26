<template>

  <VDialog v-model="dialog" width="400">
    <VCard class="px-2 py-3">
      <VCardTitle class="pb-0">
        <h1 class="title font-weight-bold">
          {{ header }}
        </h1>
      </VCardTitle>

      <VCardText class="pt-3 pb-4">
        <p>{{ text }}</p>
        <slot></slot>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <slot name="buttons" :close="close"></slot>
      </VCardActions>
    </VCard>
  </VDialog>

</template>

<script>

  export default {
    name: 'MessageDialog',
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
    },
    computed: {
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
    },
    methods: {
      close() {
        this.dialog = false;
      },
    },
  };

</script>

<style lang="less" scoped>

  p {
    font-size: 12pt;
  }

  /deep/ .v-btn {
    font-weight: bold;
  }

</style>
