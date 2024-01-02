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

  import { mapGetters } from 'vuex';
  import { LanguagesList } from 'shared/leUtils/Languages';

  export default {
    name: 'EditLanguageModal',
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
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
    mounted() {
      console.log('Aa', this.nodeIds, this.getContentNodeChildren(this.nodeIds[0]));
    },
    methods: {
      validateLanguage() {
        return true;
      },
      languageText(langObject) {
        return this.$tr('languageItemText', {
          language: langObject.native_name,
          code: langObject.id,
        });
      },
      close() {
        this.$emit('close');
      },
      handleSave() {
        if (!this.validateLanguage()) {
          return;
        }

        this.$store.dispatch(
          'showSnackbarSimple',
          this.$tr('editedLanguage', { count: this.nodes.length })
        );
        this.close();
      },
    },
    $trs: {
      editLanguage: 'Edit Language',
      languageItemText: '{language} ({code})',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      editedLanguage:
        'Edited language for {count, number, integer} {count, plural, one {resource} other {resources}}',
    },
  };

</script>
