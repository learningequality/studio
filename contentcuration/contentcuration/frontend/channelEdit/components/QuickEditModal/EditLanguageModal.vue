<template>
  <KModal
    :title="$tr('editLanguage')"
    :submitText="$tr('saveAction')"
    :cancelText="$tr('cancelAction')"
    data-test="edit-langugage"
    @submit="handleSave"
    @cancel="close"
  >
    <div>
      <KRadioButton
        v-for="language in languageOptions"
        :key="language.id"
        v-model="selectedLanguage"
        :value="language.id"
        :label="languageText(language)"
      />
    </div>
  </KModal>
</template>


<script>
  import { LanguagesList } from 'shared/leUtils/Languages';

  import { mapGetters } from 'vuex';

  export default {
    name: 'EditLanguageModal',
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
    },
    mounted() {
      console.log("nodeIds", this.nodeIds[0]);
      console.log("getContentNodeChildren", this.getContentNodeChildren(this.nodeIds[0]));
    },
    data() {
      return {
        selectedLanguage: '',
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodeChildren']),
      languageOptions() {
        return LanguagesList;
      },
    },
    methods: {
      validateLanguage() {
        return true;
      },
      languageText(langObject) {
        return this.$tr('languageItemText', { language: langObject.native_name, code: langObject.id });
      },
      close() {
        this.$emit('close');
      },
      handleSave() {
        if (!this.validateLanguage()) {
          return;
        }

        this.$store.dispatch('showSnackbarSimple', this.$tr('editedLanguage', { count: this.nodes.length }));
        this.close();
      },
    },
    $trs: {
      editLanguage: 'Edit Language',
      languageItemText: '{language} ({code})',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      fieldRequired: 'Field is required',
      editedLanguage: 'Edited language for {count, number, integer} {count, plural, one {resource} other {resources}}',
    },
  };

</script>
