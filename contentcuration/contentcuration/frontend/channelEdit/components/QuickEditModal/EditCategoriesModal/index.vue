<template>

  <KModal
    :title="$tr('editCategories')"
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
    <CategoriesFilter />
    <KTextbox
      v-model="searchQuery"
      autofocus
      data-test="search-input"
      :label="$tr('selectCategory')"
      style="margin-top: 0.5em"
    />
    <template v-if="isTopicSelected">
      <KCheckbox
        v-model="updateDescendants"
        data-test="update-descendants-checkbox"
        :label="$tr('updateDescendantsCheckbox')"
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
        :value="language.id"
      />
    </div>
  </KModal>

</template>


<script>
  import { mapGetters, mapActions } from 'vuex';
  import { LanguagesList } from 'shared/leUtils/Languages';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import CategoriesFilter from './CategoriesFilter';

  export default {
    name: 'EditCategoriesModal',
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
    },
    components: {
      CategoriesFilter,
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
          criteria.some(key => lang[key]?.toLowerCase().includes(searchQuery))
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
        selectedRadio?.scrollIntoView?.();
      }
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
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
              // will update with the new function to update all descendants
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
          this.$tr('editedCategories', { count: this.nodes.length })
        );
        this.close();
      },
    },
    $trs: {
      editCategories: 'Edit Categories',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      editedCategories:
        'Edited categories for {count, number, integer} {count, plural, one {resource} other {resources}}',
      selectCategory: 'Select / Type Category',
      resourcesSelected:
        '{count, number, integer} {count, plural, one {resource} other {resources}} selected',
      updateDescendantsCheckbox:
        'Apply to all resources and folders nested within the selected folders',
    },
  };
</script>
<style scoped>
  .languages-options {
    height: 350px;
    overflow-y: auto;
  }
</style>