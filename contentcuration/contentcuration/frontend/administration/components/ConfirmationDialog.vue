<template>

  <MessageDialog
    v-model="show"
    :header="title"
    :text="text"
  >
    <template #buttons="{close}">
      <VBtn color="primary" flat @click="close">
        {{ $tr('cancel') }}
      </VBtn>
      <VBtn color="primary" dark @click="confirmHandler">
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
      value: Boolean,
      title: String,
      text: String,
      confirmButtonText: String,
      confirmHandler: Function,
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
    $trs: {
      cancel: 'Cancel',
    },
  };

</script>


<style lang="less" scoped>
</style>
