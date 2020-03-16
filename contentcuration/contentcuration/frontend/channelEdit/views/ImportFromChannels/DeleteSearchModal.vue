<template>

  <VCard class="pa-2">
    <VCardTitle>
      <h2>{{ $tr('deleteSearchTitle') }}</h2>
    </VCardTitle>
    <VCardText>
      <p> {{ $tr('deleteConfirmation') }}</p>
    </VCardText>
    <VCardActions class="text-xs-right">
      <VLayout row justify-end>
        <VBtn flat @click="handleCancel">
          {{ $tr('cancelAction') }}
        </VBtn>
        <VBtn color="primary" @click="handleSubmit">
          {{ $tr('deleteAction') }}
        </VBtn>
      </VLayout>
    </VCardActions>
  </VCard>

</template>


<script>

  export default {
    name: 'DeleteSearchModal',
    methods: {
      handleCancel() {
        this.$emit('cancel');
      },
      handleSubmit() {
        this.$emit('submit');
      },
    },
    $trs: {
      deleteSearchTitle: 'Delete saved search',
      deleteConfirmation: 'Are you sure you want to delete this saved search?',
      cancelAction: 'Cancel',
      deleteAction: 'Delete',
    },
  };

</script>


<style lang="scss" scoped></style>
