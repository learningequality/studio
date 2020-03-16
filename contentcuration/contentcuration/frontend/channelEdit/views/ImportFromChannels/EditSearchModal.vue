<template>

  <VCard class="pa-2">
    <VCardTitle>
      <h2>{{ $tr('editSavedSearchTitle') }}</h2>
    </VCardTitle>
    <form @submit.prevent="handleSubmit">
      <VCardText>
        <VTextField
          v-model="searchTerm"
          solo
          outline
          autofocus
        />
      </VCardText>
      <VCardActions>
        <VLayout row justify-end>
          <VBtn flat @click="handleCancel">
            {{ $tr('cancelAction') }}
          </VBtn>
          <VBtn type="submit" color="primary">
            {{ $tr('saveChangesAction') }}
          </VBtn>
        </VLayout>
      </VCardActions>
    </form>
  </VCard>

</template>


<script>

  export default {
    name: 'EditSearchModal',
    props: {
      editedSearch: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        searchTerm: this.editedSearch.searchTerm,
      };
    },
    methods: {
      handleCancel() {
        this.$emit('cancel');
      },
      handleSubmit() {
        this.$store.dispatch('showSnackbarSimple', this.$tr('changesSavedSnackbar'));
        this.$emit('submit', { ...this.editedSearch, searchTerm: this.searchTerm });
      },
    },
    $trs: {
      editSavedSearchTitle: 'Edit saved search',
      cancelAction: 'Cancel',
      saveChangesAction: 'Save changes',
      changesSavedSnackbar: 'Changes saved',
    },
  };

</script>


<style lang="scss" scoped></style>
