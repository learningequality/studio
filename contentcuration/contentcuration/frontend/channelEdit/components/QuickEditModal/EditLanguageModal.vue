<template>

  <KModal
    :title="$tr('editLanguage')"
    :submitText="$tr('saveAction')"
    :cancelText="$tr('cancelAction')"
    data-test="edit-langugage"
    :submitDisabled="!selectedLanguage"
    @submit="handleSave"
    @cancel="close"
  >
    <p>
      {{ $tr('resourcesSelected', { count: nodeIds.length }) }}
    </p>
    <KTextbox
      autofocus
      v-model="searchQuery"
      data-test="search-input"
      :label="$tr('selectLanguage')"
      style="margin-top: 0.5em"
    />
    <div ref="languages" class="languages-options">
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

  import { mapGetters, mapActions } from 'vuex';
  import { LanguagesList } from 'shared/leUtils/Languages';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

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
        searchQuery: '',
        updateDescendants: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodes']),
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      isTopicSelected() {
        return this.nodes.some(node => node.kind === ContentKindsNames.TOPIC);
      },
      isMultipleNodesLanguages() {
        const languages = new Set(
          this.nodes
            .map(node => node.language)
            .filter(Boolean)
        );
        return languages.size > 1;
      },
      languageOptions() {
        const searchQuery = this.searchQuery.trim().toLowerCase();
        if (!this.searchQuery) {
          return LanguagesList;
        }
        const criteria = ['id', 'native_name', 'readable_name'];
        return LanguagesList.filter(lang => (
          criteria.some(key => (
            lang[key]?.toLowerCase().includes(searchQuery)
          ))
        ));
      },
    },
    created() {
      const languages = [...new Set(
        this.nodes.map(node => node.language)
      )];
      if (languages.length === 1) {
        this.selectedLanguage = languages[0] || '';
      }
    },
    mounted() {
      if (this.selectedLanguage) {
        // Search for the selected KRadioButton and scroll to it
        const selectedRadio = this.$refs.languages.querySelector(
          `input[value="${this.selectedLanguage}"]`
        );
        selectedRadio?.scrollIntoView?.();
      }
    },
    methods: {  
      ...mapActions('contentNode', ['updateContentNode']),
      languageText(langObject) {
        return this.$tr('languageItemText', {
          language: langObject.native_name,
          code: langObject.id,
        });
      },
      close() {
        this.$emit('close');
      },
      async handleSave() {
        if (!this.selectedLanguage) {
          return;
        }

        await Promise.all(
          this.nodes.map(node => {
            if (
              this.updateDescendants &&
              node.kind === ContentKindsNames.TOPIC
            ) { // will update with the new function to update all descendants
              return this.updateContentNode({
                id: node.id,
                language: this.selectedLanguage,
              });
            }
            return this.updateContentNode({
              id: node.id,
              language: this.selectedLanguage,
            });
          })
        );

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
      selectLanguage: 'Select / Type Language',
      resourcesSelected: '{count, number, integer} {count, plural, one {resource} other {resources}} selected',
    },
  };

</script>

<style scoped>
  .languages-options {
    height: 350px;
    overflow-y: auto;
  }
</style>