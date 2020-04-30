<template>

  <VAutocomplete
    v-model="languages"
    :items="availableLanguages"
    :label="$tr('languageLabel')"
    color="primary"
    item-value="id"
    :item-text="languageSearchValue"
    autoSelectFirst
    :no-data-text="$tr('noMatchingLanguageText')"
    clearable
    outline
    multiple
    :search-input.sync="languageInput"
    v-bind="$attrs"
    @change="languageInput=''"
  >
    <template #selection="{item, index}">
      <div class="mt-1 mx-1">
        {{ $tr('languageItemText', { language: item.name, code: item.count }) }}
        <span v-if="index < languages.length - 1" clas="mx-1">•</span>
      </div>
    </template>
    <template #item="{item}">
      <Checkbox :key="item.id" :input-value="value" :value="item.id" class="mt-0">
        <template #label>
          <VTooltip bottom>
            <template v-slot:activator="{ on }">
              <div class="text-truncate" style="width: 200px;" v-on="on">
                {{ languageText(item) }}
              </div>
            </template>
            <span>{{ languageText(item) }}</span>
          </VTooltip>
        </template>
      </Checkbox>
    </template>
  </VAutocomplete>

</template>


<script>

  import { mapActions } from 'vuex';
  import Checkbox from 'shared/views/form/Checkbox';

  export default {
    name: 'LanguageFilter',
    components: {
      Checkbox,
    },
    props: {
      value: {
        type: Array,
        default() {
          return [];
        },
      },
    },
    data() {
      return {
        languageInput: '',
        availableLanguages: [],
      };
    },
    computed: {
      languages: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value.filter(Boolean));
        },
      },
    },
    beforeMount() {
      this.getPublicLanguages().then(languages => {
        this.availableLanguages = languages;
      });
    },
    methods: {
      ...mapActions('channelList', ['getPublicLanguages']),
      languageSearchValue(item) {
        return item.name + (item.related_names || []).join('') + item.id;
      },
      languageText(item) {
        return this.$tr('languageItemText', { language: item.name, code: item.id });
      },
    },
    $trs: {
      languageLabel: 'Languages',
      languageItemText: '{language} ({code})',
      noMatchingLanguageText: 'No languages found',
    },
  };

</script>
