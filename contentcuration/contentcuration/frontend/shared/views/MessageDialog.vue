<template>

  <VDialog
    v-model="dialog"
    v-bind="$attrs"
    width="400"
  >
    <VCard class="px-2 py-3">
      <VCardTitle class="pb-0">
        <h1 class="font-weight-bold title">
          {{ header }}
        </h1>
      </VCardTitle>

      <VCardText
        class="pb-4 pt-3"
        data-test="text"
      >
        <p>{{ text }}</p>
        <slot></slot>
      </VCardText>
      <VCardActions data-test="buttons">
        <VSpacer />
        <slot
          name="buttons"
          :close="close"
        ></slot>
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
        required: false,
        default: '',
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


<style lang="scss" scoped>

  p {
    font-size: 12pt;
  }

  ::v-deep .v-btn {
    font-weight: bold;
  }

</style>
