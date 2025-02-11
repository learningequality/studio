<template>

  <MessageDialog
    v-model="show"
    :header="title"
    :text="text"
  >
    <template #buttons="{ close }">
      <VBtn flat data-test="close" @click="close">
        {{ cancelButtonText }}
      </VBtn>
      <VBtn color="primary" dark data-test="confirm" @click="$emit('confirm')">
        {{ confirmButtonText }}
      </VBtn>
    </template>
  </MessageDialog>

</template>


<script>

  import MessageDialog from 'shared/views/MessageDialog';

  export default {
    name: 'ConfirmationDialog',
    components: { MessageDialog },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
      confirmButtonText: {
        type: String,
        required: true,
      },
      cancelButtonText: {
        type: String,
        default: 'Cancel',
      },
    },
    computed: {
      show: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
    },
  };

</script>


<style lang="scss" scoped>
</style>
