<template>

  <KModal
    :title="$tr('editLanguage')"
    :submitText="$tr('saveAction')"
    :cancelText="$tr('cancelAction')"
    data-test="edit-language-modal"
    :submitDisabled="!selectedLanguage"
    @submit="handleSave"
    @cancel="close"
  >
    <p data-test="resources-selected-message">
      {{ $tr('resourcesSelected', { count: nodeIds.length }) }}
    </p>
    <p v-if="isMultipleNodeLanguages" data-test="different-languages-message">
      {{ $tr('differentLanguages') }}
    </p>
    <KTextbox
      v-model="searchQuery"
      autofocus
      data-test="search-input"
      :label="$tr('selectLanguage')"
      style="margin-top: 0.5em"
    />
    <template v-if="isTopicSelected">
      <KCheckbox
        :checked="updateDescendants"
        data-test="update-descendants-checkbox"
        :label="$tr('updateDescendantsCheckbox')"
        @change="(value) => { updateDescendants = value }"
      />
      <hr
        :style="dividerStyle"
      >
    </template>
    <div
      ref="languages"
      class="languages-options"
      data-test="language-options-list"
    >
      <KRadioButton
        v-for="language in languageOptions"
        :key="language.id"
        v-model="selectedLanguage"
        :buttonValue="language.id"
        :label="languageText(language)"
      />
      <p
        v-if="!languageOptions.length"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ $tr('emptyLanguagesSearch') }}
      </p>
    </div>
  </KModal>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import { LanguagesList } from 'shared/leUtils/Languages';
  import { hasMultipleFieldValues } from 'shared/utils/helpers';
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
      isMultipleNodeLanguages() {
        return hasMultipleFieldValues(this.nodes, 'language');
      },
      languageOptions() {
        const searchQuery = this.searchQuery.trim().toLowerCase();
        if (!this.searchQuery) {
          return LanguagesList;
        }
        const criteria = ['id', 'native_name', 'readable_name'];
        return LanguagesList.filter(lang =>
          criteria.some(key => lang[key] && lang[key].toLowerCase().includes(searchQuery))
        );
      },
      dividerStyle() {
        return {
          border: 0,
          borderBottom: `1px solid ${this.$themeTokens.fineLine}`,
          margin: '1em 0',
        };
      },
    },
    created() {
      const languages = [...new Set(this.nodes.map(node => node.language))];
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
        if (selectedRadio && selectedRadio.scrollIntoView) {
          selectedRadio.scrollIntoView();
        }
      }
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode', 'updateContentNodeDescendants']),
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
            if (this.updateDescendants && node.kind === ContentKindsNames.TOPIC) {
              return this.updateContentNodeDescendants({
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
      resourcesSelected:
        '{count, number, integer} {count, plural, one {resource} other {resources}} selected',
      differentLanguages:
        'The selected resources have different languages set. Choosing an option below will apply the language to all the selected resources',
      updateDescendantsCheckbox:
        'Apply to all resources and folders nested within the selected folders',
      emptyLanguagesSearch: 'No languages matches the search',
    },
  };

</script>

<style scoped>
  .languages-options {
    height: 250px;
    overflow-y: auto;
  }
</style>