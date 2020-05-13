<template>

  <VContainer class="pa-0">
    <p v-if="currentFilters.length">
      <VChip
        v-for="(filter, index) in currentFilters"
        :key="`catalog-filter-${index}`"
        close
        class="ma-1"
        @input="filter.onclose"
      >
        {{ filter.text }}
      </VChip>
      <ActionLink
        v-if="currentFilters.length"
        class="ml-2"
        :text="$tr('clearAll')"
        @click="clearFilters"
      />
    </p>
    <p v-else class="mb-5">
      <VLayout row wrap>
        <VFlex
          v-for="collection in collections"
          :key="`public-collection-${collection.id}`"
          xs12
          class="py-2"
        >
          <VCard
            tabindex="0"
            class="pt-2"
            @click="setCollection(collection.id)"
            @keyup.enter="setCollection(collection.id)"
          >
            <VLayout>
              <div class="text-xs-center pl-2">
                <Icon style="font-size: 75px;">
                  local_hospital
                </Icon>
              </div>
              <VCardTitle primary-title class="pt-2 pb-2">

                <!-- TODO: add 'notranslate' class once we figure out how to handle collections
                          that have multiple channel languages inside -->
                <h3 class="headline mb-0">
                  {{ collection.name }}
                </h3>
                <p class="body-1 grey--text">
                  {{ $tr('channelCount', {count: collection.count}) }}
                </p>
                <p v-if="collection.description">
                  {{ collection.description }}
                </p>
              </VCardTitle>
            </VLayout>
          </VCard>
        </VFlex>
      </VLayout>
    </p>
  </VContainer>

</template>

<script>

  import { catalogFilterMixin } from './mixins';
  import { constantsTranslationMixin } from 'shared/mixins';
  import ActionLink from 'shared/views/ActionLink';

  const publicCollections = window.publicCollections || [];

  /*
    Returns the expected format for filters
    {
      text: string to display for filter
      onclose: action to do if filter is removed
    }
  */
  function createFilter(value, text, onclose) {
    return value ? { text, onclose } : false;
  }

  export default {
    name: 'CatalogFilterBar',
    components: {
      ActionLink,
    },
    mixins: [constantsTranslationMixin, catalogFilterMixin],
    computed: {
      currentFilters() {
        return [
          // Keywords
          createFilter(
            this.keywords,
            this.$tr('keywords', { text: this.keywords }),
            this.resetKeywords
          ),

          // Languages
          this.languages.map(language =>
            createFilter(language, this.translateLanguage(language), () =>
              this.removeLanguage(language)
            )
          ),

          // Licenses
          this.licenses.map(license =>
            createFilter(license, this.translateLicense(license), () => this.removeLicense(license))
          ),

          // Kinds
          this.kinds.map(kind =>
            createFilter(kind, this.translateConstant(kind), () => this.removeKind(kind))
          ),

          // Includes
          createFilter(this.bookmark, this.$tr('starred'), this.resetBookmark),
          createFilter(this.coach, this.$tr('coachContent'), this.resetCoach),
          createFilter(this.assessments, this.$tr('assessments'), this.resetAssessments),
          createFilter(this.subtitles, this.$tr('subtitles'), this.resetSubtitles),
          createFilter(this.collection, this.getCollectionName(), this.resetCollection),
        ]
          .flat()
          .filter(Boolean);
      },
      collections() {
        return publicCollections;
      },
    },
    methods: {
      getCollectionName() {
        const collection = this.collections.find(c => c.id === this.collection);
        return collection && collection.name;
      },
      setCollection(collectionId) {
        this.collection = collectionId;
      },
      resetCollection() {
        this.setCollection(null);
      },
      resetKeywords() {
        this.keywords = '';
      },
      removeLanguage(language) {
        this.languages = this.languages.filter(l => l !== language);
      },
      removeLicense(license) {
        this.licenses = this.licenses.filter(l => l !== license);
      },
      removeKind(kind) {
        this.kinds = this.kinds.filter(k => k !== kind);
      },
      resetBookmark() {
        this.bookmark = false;
      },
      resetCoach() {
        this.coach = false;
      },
      resetAssessments() {
        this.assessments = false;
      },
      resetSubtitles() {
        this.subtitles = false;
      },
    },
    $trs: {
      keywords: '"{text}"',
      coachContent: 'Coach content',
      assessments: 'Assessments',
      subtitles: 'Subtitles',
      starred: 'Starred',
      clearAll: 'Clear all',
      channelCount: '{count, plural,\n =1 {# channel}\n other {# channels}}',
    },
  };

</script>
<style lang="less" scoped>

  h3,
  p {
    width: 100%;
  }

  .container {
    max-width: 1080px;
    margin: 0 auto;
  }

</style>
