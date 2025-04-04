<template>

  <KModal
    ref="modal"
    :title="$tr('editLanguage')"
    :submitText="$tr('saveAction')"
    :cancelText="$tr('cancelAction')"
    :submitDisabled="!selectedLanguage"
    @submit="handleSave"
    @cancel="close"
  >
    <p
      v-if="resourcesSelectedText.length > 0"
      data-test="resources-selected-message"
    >
      {{ resourcesSelectedText }}
    </p>
    <p
      v-if="isMultipleNodeLanguages"
      data-test="different-languages-message"
    >
      {{ $tr('differentLanguages') }}
    </p>
    <KTextbox
      v-model="searchQuery"
      autofocus
      data-test="search-input"
      :label="$tr('searchAction')"
      style="margin-top: 0.5em"
    />
    <template v-if="isTopicSelected">
      <KCheckbox
        :checked="updateDescendants"
        data-test="update-descendants-checkbox"
        :label="$tr('updateDescendantsCheckbox')"
        @change="
          value => {
            updateDescendants = value;
          }
        "
      />
      <Divider />
    </template>
    <div
      ref="languages"
      class="languages-options"
      data-test="language-options-list"
    >
      <KRadioButtonGroup>
        <KRadioButton
          v-for="language in languageOptions"
          :key="language.id"
          :ref="`radioLanguage_${language.id}`"
          v-model="selectedLanguage"
          :buttonValue="language.id"
          :label="languageText(language)"
          :labelDir="null"
        />
      </KRadioButtonGroup>
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
        isMultipleNodeLanguages: false,
        changed: false,
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
          criteria.some(key => lang[key] && lang[key].toLowerCase().includes(searchQuery)),
        );
      },
    },
    watch: {
      selectedLanguage(newLanguage, oldLanguage) {
        this.changed = this.changed || newLanguage !== oldLanguage;
      },
    },
    created() {
      const languages = [...new Set(this.nodes.map(node => node.language))];
      if (languages.length === 1) {
        this.selectedLanguage = languages[0] || '';
      }
      this.isMultipleNodeLanguages = languages.length > 1;
      // Reset the changed flag after the initial value is set
      this.$nextTick(() => {
        this.changed = false;
      });
    },
    mounted() {
      if (this.selectedLanguage) {
        // Search for the selected KRadioButton and scroll to it
        const selectedInput = this.$refs.languages.querySelector(
          `input[value="${this.selectedLanguage}"]`,
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
      close(changed = false) {
        this.$emit('close', {
          changed,
          updateDescendants: this.updateDescendants,
        });
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
          }),
        );
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        await this.showSnackbarSimple(commonStrings.$tr('changesSaved'));
        this.close(this.changed);
      },
      showSnackbarSimple(message) {
        return this.$store.dispatch('showSnackbarSimple', message);
      },
    },
    $trs: {
      editLanguage: 'Edit language',
      languageItemText: '{language} ({code})',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      searchAction: 'Search',
      differentLanguages:
        'You selected resources in different languages. The language you choose below will be applied to all selected resources.',
      updateDescendantsCheckbox:
        'Apply the chosen language to all resources, folders, and subfolders contained within the selected folders.',
      emptyLanguagesSearch: 'No language matches the search',
    },
  };

</script>


<style scoped>

  .languages-options {
    height: 250px;
    overflow-y: auto;
  }

</style>
