<template>

  <MessageDialog
    v-model="show"
    :header="title"
    :text="text"
  >
    <template #buttons="{close}">
      <v-btn color="primary" flat @click="close">
        {{ $tr('cancel') }}
      </v-btn>
      <v-btn color="primary" dark @click="confirmHandler">
        {{ confirmButtonText }}
      </v-btn>
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
