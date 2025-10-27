<template>

  <MessageDialog
    v-model="show"
    :header="title"
    :text="text"
  >
    <div
      v-if="errorText"
      class="error-text pa-2 ma-3 red lighten-4 red--text"
    >
      {{ errorText }}
    </div>
    <template #buttons="{ close }">
      <VBtn
        flat
        data-test="close"
        @click="close"
      >
        {{ cancelButtonText }}
      </VBtn>
      <VBtn
        color="primary"
        dark
        data-test="confirm"
        :disabled="disableSubmit"
        @click="$emit('confirm')"
      >
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
      errorText: {
        type: String,
        default: '',
      },
      disableSubmit: {
        type: Boolean,
        default: false,
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


<style lang="scss" scoped></style>
