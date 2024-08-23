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
    <p v-if="resourcesSelectedText.length > 0" data-test="resources-selected-message">
      {{ resourcesSelectedText }}
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
      <Divider />
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
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import commonStrings from 'shared/translator';

  export default {
    name: 'EditLanguageModal',
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
      resourcesSelectedText: {
        type: String,
        default: '',
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
    },
    created() {
      const languages = [...new Set(this.nodes.map(node => node.language))];
      if (languages.length === 1) {
        this.selectedLanguage = languages[0] || '';
      }
      this.isMultipleNodeLanguages = languages.length > 1;
    },
    mounted() {
      if (this.selectedLanguage) {
        // Search for the selected KRadioButton and scroll to it
        const selectedInput = this.$refs.languages.querySelector(
          `input[value="${this.selectedLanguage}"]`
        );
        const selectedRadio = selectedInput && selectedInput.parentElement;
        if (selectedRadio && selectedRadio.scrollIntoView) {
          selectedRadio.scrollIntoView({ behavior: 'instant' });
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
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        this.$store.dispatch('showSnackbarSimple', commonStrings.$tr('changesSaved'));
        this.close();
      },
    },
    $trs: {
      editLanguage: 'Edit Language',
      languageItemText: '{language} ({code})',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      selectLanguage: 'Select / Type Language',
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
