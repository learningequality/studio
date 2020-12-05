<template>

  <MessageDialog v-model="dialog" :header="$tr('editSavedSearchTitle')">
    <VForm ref="form" lazy-validation @submit.prevent="handleSubmit">
      <VTextField
        v-model="searchTerm"
        box
        autofocus
        required
        :rules="rules"
        maxlength="200"
        :label="$tr('searchTitleLabel')"
      />
    </VForm>
    <template #buttons="{ close }">
      <VBtn flat @click="close">
        {{ $tr('cancelAction') }}
      </VBtn>
      <VBtn color="primary" @click="handleSubmit">
        {{ $tr('saveChangesAction') }}
      </VBtn>
    </template>
  </MessageDialog>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import MessageDialog from 'shared/views/MessageDialog';

  export default {
    name: 'EditSearchModal',
    components: {
      MessageDialog,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      searchId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        searchTerm: '',
      };
    },
    computed: {
      ...mapGetters('importFromChannels', ['getSavedSearch']),
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      editedSearch() {
        return this.getSavedSearch(this.searchId);
      },
      rules() {
        return [v => Boolean(v && v.trim()) || this.$tr('fieldRequired')];
      },
    },
    watch: {
      searchId(newId) {
        if (newId) {
          this.searchTerm = this.editedSearch.name;
        }
      },
    },
    mounted() {
      this.searchTerm = this.editedSearch.name;
    },
    methods: {
      ...mapActions('importFromChannels', ['updateSearch']),
      handleSubmit() {
        if (this.$refs.form.validate()) {
          this.updateSearch({
            id: this.searchId,
            name: this.searchTerm,
          }).then(() => {
            this.$emit('submit');
            this.$store.dispatch('showSnackbarSimple', this.$tr('changesSavedSnackbar'));
          });
        }
      },
    },
    $trs: {
      editSavedSearchTitle: 'Edit search title',
      searchTitleLabel: 'Search title',
      cancelAction: 'Cancel',
      saveChangesAction: 'Save',
      changesSavedSnackbar: 'Changes saved',
      fieldRequired: 'Field is required',
    },
  };

</script>


<style lang="scss" scoped></style>
