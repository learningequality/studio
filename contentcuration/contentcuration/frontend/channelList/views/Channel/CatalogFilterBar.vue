<template>

  <VContainer class="pa-4">
    <div v-if="currentFilters.length">
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
        class="mx-2"
        :text="$tr('clearAll')"
        data-test="clear"
        @click="clearFilters"
      />
    </div>
    <div v-else>
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
            data-test="collection"
            @click="setCollection(collection.id)"
            @keyup.enter="setCollection(collection.id)"
          >
            <VLayout>
              <div class="px-2 text-xs-center">
                <Icon style="font-size: 75px;">
                  local_hospital
                </Icon>
              </div>
              <VCardTitle primary-title class="pb-2 pt-2">

                <!-- TODO: add 'notranslate' class once we figure out how to handle collections
                          that have multiple channel languages inside -->
                <h3 class="headline mb-0">
                  {{ collection.name }}
                </h3>
                <p class="body-1 grey--text">
                  {{ $tr('channelCount', { count: collection.count }) }}
                </p>
                <p v-if="collection.description">
                  {{ collection.description }}
                </p>
              </VCardTitle>
            </VLayout>
            <VCardActions>
              <VSpacer />
              <IconButton
                icon="copy"
                :text="$tr('copyToken')"
                @click.stop="displayToken = collection.token"
              />
            </VCardActions>
          </VCard>
        </VFlex>
      </VLayout>

      <KModal
        v-if="displayToken"
        :title="$tr('copyTitle')"
        :text="$tr('copyTokenInstructions')"
        :cancelText="$tr('close')"
        @cancel="displayToken = null"
      >
        <div class="mb-3">
          {{ $tr('copyTokenInstructions') }}
        </div>
        <CopyToken :token="displayToken" />
      </KModal>

    </div>
  </VContainer>

</template>

<script>

  import flatten from 'lodash/flatten'; // Tests fail with native Array.flat() method
  import { catalogFilterMixin } from './mixins';
  import { constantsTranslationMixin } from 'shared/mixins';
  import IconButton from 'shared/views/IconButton';
  import CopyToken from 'shared/views/CopyToken';

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
      IconButton,
      CopyToken,
    },
    mixins: [constantsTranslationMixin, catalogFilterMixin],
    data() {
      return {
        displayToken: null,
      };
    },
    computed: {
      currentFilters() {
        return flatten([
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
        ]).filter(Boolean);
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
      copyToken: 'Copy collection token',
      copyTitle: 'Copy collection token',
      copyTokenInstructions:
        'Paste this token into Kolibri to import the channels contained in this collection',
      close: 'Close',
    },
  };

</script>
<style lang="less" scoped>

  h3,
  p {
    width: 100%;
  }

  .container {
    max-width: 1128px;
    margin: 0 auto;
  }

  .v-card {
    cursor: pointer;

    &:hover {
      background-color: var(--v-grey-lighten4);
    }
  }

</style>
