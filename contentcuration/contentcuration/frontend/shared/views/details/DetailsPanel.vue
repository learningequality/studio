<template>

  <div :class="{ printing }">
    <VLayout
      row
      class="details-layout"
    >
      <VFlex
        xs7
        class="details-content"
      >
        <p
          class="notranslate"
          dir="auto"
        >
          {{ _details.description }}
        </p>
      </VFlex>
      <VFlex
        xs5
        class="pa-3"
      >
        <Thumbnail
          :src="isChannel ? _details.thumbnail_url : _details.thumbnail_src"
          :encoding="isChannel ? _details.thumbnail_encoding : null"
        />
      </VFlex>
    </VLayout>
    <br >

    <!-- Action Buttons -->
    <VLayout
      v-if="isChannel"
      row
      class="mb-4"
      style="margin-left: -8px"
    >
      <VBtn
        v-if="!loggedIn && _details.demo_server_url"
        color="primary"
        class="mr-2"
        @click="viewInKolibri"
      >
        <Icon
          class="mr-2"
          icon="openNewTab"
          :color="$themeTokens.textInverted"
        />
        {{ $tr('viewInKolibri') }}
      </VBtn>
      <VBtn
        v-else-if="_details.source_url"
        color="primary"
        class="mr-2"
        :href="channelHref"
      >
        {{ $tr('goToChannel') }}
      </VBtn>
      <BaseMenu>
        <template #activator="{ on }">
          <VBtn
            color="primary"
            v-on="on"
          >
            {{ loggedIn ? $tr('options') : $tr('downloadButton') }}
            <Icon
              class="ml-1"
              icon="dropdown"
              :color="$themeTokens.textInverted"
            />
          </VBtn>
        </template>
        <VList>
          <template v-if="loggedIn">
            <VListTile
              v-if="_details.source_url"
              :href="_details.source_url"
              target="_blank"
            >
              <VListTileTitle>{{ $tr('goToWebsite') }}</VListTileTitle>
            </VListTile>
            <VListTile
              v-if="_details.demo_server_url"
              @click="viewInKolibri"
            >
              <VListTileTitle>{{ $tr('viewInKolibri') }}</VListTileTitle>
            </VListTile>
          </template>
          <VListTile @click="$emit('generate-pdf')">
            <VListTileTitle>{{ $tr('downloadPDF') }}</VListTileTitle>
          </VListTile>
          <VListTile
            data-test="dl-csv"
            @click="$emit('generate-csv')"
          >
            <VListTileTitle>{{ $tr('downloadCSV') }}</VListTileTitle>
          </VListTile>
        </VList>
      </BaseMenu>
    </VLayout>

    <template v-if="isChannel">
      <DetailsRow
        v-if="_details.published && _details.primary_token"
        :label="$tr('tokenHeading')"
      >
        <template #default>
          <CopyToken
            v-if="!printing"
            :token="_details.primary_token"
            style="max-width: max-content"
          />
          <span v-else>
            {{ _details.primary_token.slice(0, 5) + '-' + _details.primary_token.slice(5) }}
          </span>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('publishedHeading')">
        <span v-if="_details.published">{{ publishedDate }}</span>
        <em v-else>{{ $tr('unpublishedText') }}</em>
      </DetailsRow>
      <DetailsRow :label="$tr('currentVersionHeading')">
        <template v-if="_details.published">
          {{ _details.version }}
        </template>
        <template v-else>
          {{ defaultText }}
        </template>
      </DetailsRow>
      <DetailsRow
        v-if="_details.language"
        :label="$tr('primaryLanguageHeading')"
        :text="translateLanguage(_details.language)"
      />
    </template>

    <LoadingText v-if="loading" />
    <div v-else-if="hasDetails">
      <DetailsRow
        :label="$tr('creationHeading')"
        :text="createdDate"
      />
      <DetailsRow
        :label="$tr('sizeHeading')"
        :text="sizeText"
      />
      <DetailsRow :label="$tr('resourceHeading')">
        <template #default>
          <p>{{ $formatNumber(_details.resource_count) }}</p>
          <VDataTable
            :items="kindCount"
            hide-actions
            hide-headers
            class="kind-table"
          >
            <template #items="{ item }">
              <td
                style="width: 24px"
                class="pr-2 py-0"
              >
                <ContentNodeIcon :kind="item.kind_id" />
              </td>
              <td class="kind-name pa-0">
                {{ translateConstant(item.kind_id) }}
              </td>
              <td class="pa-0 text-xs-right">
                {{ $formatNumber(item.count) }}
              </td>
            </template>
          </VDataTable>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('levelsHeading')">
        <template #default>
          <div v-if="!levels.length">
            {{ defaultText }}
          </div>
          <VChip
            v-for="level in levels"
            v-else-if="!printing"
            :key="level"
            class="tag"
          >
            {{ level }}
          </VChip>
          <span v-else>
            {{ levelsPrintable }}
          </span>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('categoriesHeading')">
        <template #default>
          <div v-if="!categories.length">
            {{ defaultText }}
          </div>
          <VChip
            v-for="category in categories"
            v-else-if="!printing"
            :key="category"
            class="tag"
          >
            {{ category }}
          </VChip>
          <span v-else>
            {{ categoriesPrintable }}
          </span>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('containsHeading')">
        <template
          v-if="!printing"
          #default
        >
          <VChip
            v-if="_details.includes.coach_content"
            class="tag"
          >
            {{ $tr('coachHeading') }}
          </VChip>
          <VChip
            v-if="_details.includes.exercises"
            class="tag"
          >
            {{ $tr('assessmentsIncludedText') }}
          </VChip>
          <div v-if="!_details.includes.exercises && !_details.includes.coach_content">
            {{ defaultText }}
          </div>
        </template>
        <template
          v-else
          #default
        >
          <span>{{ includesPrintable }}</span>
        </template>
      </DetailsRow>
      <DetailsRow
        :label="$tr('coachHeading')"
        :text="$formatNumber(_details.includes.coach_content)"
        :definition="!printing ? $tr('coachDescription') : ''"
      />
      <DetailsRow :label="$tr('tagsHeading')">
        <template #default>
          <div v-if="!sortedTags.length">
            {{ defaultText }}
          </div>
          <VChip
            v-for="tag in sortedTags"
            v-else-if="!printing"
            :key="tag.tag_name"
            class="tag"
          >
            {{ tag.tag_name }}
          </VChip>
          <span v-else>
            {{ tagPrintable }}
          </span>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('languagesHeading')">
        <template #default>
          <ExpandableList
            :noItemsText="defaultText"
            :items="_details.languages"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('subtitlesHeading')">
        <template #default>
          <ExpandableList
            :noItemsText="defaultText"
            :items="_details.accessible_languages"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>

      <DetailsRow
        :label="$tr('authorsLabel')"
        :definition="!printing ? $tr('authorToolTip') : ''"
      >
        <template #default>
          <ExpandableList
            :noItemsText="defaultText"
            :items="_details.authors"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>
      <DetailsRow
        :label="$tr('providersLabel')"
        :definition="!printing ? $tr('providerToolTip') : ''"
      >
        <template #default>
          <ExpandableList
            :noItemsText="defaultText"
            :items="_details.providers"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>
      <DetailsRow
        :label="$tr('aggregatorsLabel')"
        :definition="!printing ? $tr('aggregatorToolTip') : ''"
      >
        <template #default>
          <ExpandableList
            :noItemsText="defaultText"
            :items="_details.aggregators"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>

      <DetailsRow :label="$tr('licensesLabel')">
        <template #default>
          <template v-if="!printing">
            <VTooltip
              v-for="license in _details.licenses"
              :key="license"
              top
              lazy
            >
              <template #activator="{ on }">
                <VChip
                  class="tag"
                  v-on="on"
                >
                  {{ translateConstant(license) }}
                </VChip>
              </template>
              <span>{{ translateConstant(license + '_description') }}</span>
            </VTooltip>
          </template>
          <span v-else>
            {{ licensesPrintable }}
          </span>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('copyrightHoldersLabel')">
        <template #default>
          <ExpandableList
            :items="_details.copyright_holders"
            :no-items-text="defaultText"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>

      <DetailsRow
        v-if="_details.original_channels.length"
        :label="$tr('containsContentHeading')"
      >
        <template #default>
          <VLayout
            v-for="channel in _details.original_channels"
            :key="channel.id"
            class="preview-row"
            align-center
            row
          >
            <VFlex class="source-thumbnail">
              <Thumbnail :src="channel.thumbnail" />
            </VFlex>
            <VFlex
              v-if="printing"
              class="font-weight-bold notranslate px-4 subheading"
            >
              {{ channel.name }}
            </VFlex>
            <a
              v-else
              :href="channelUrl(channel)"
              target="_blank"
              class="notranslate primary--text"
            >
              <span>{{ channel.name }}</span>
              <Icon
                class="mx-1 rtl-flip"
                icon="openNewTab"
              />
            </a>
          </VLayout>
        </template>
      </DetailsRow>

      <label
        v-if="_details.sample_nodes.length"
        class="body-1 font-weight-bold"
        :style="{ color: $vuetify.theme.darkGrey }"
      >
        {{ isChannel ? $tr('sampleFromChannelHeading') : $tr('sampleFromTopicHeading') }}
      </label>
      <VLayout
        row
        :wrap="!printing"
        class="my-4 pt-1 sample-nodes"
      >
        <VFlex
          v-for="node in _details.sample_nodes"
          :key="node.node_id"
          :xs12="!printing"
          :xs3="printing"
          sm3
        >
          <VCard
            height="100%"
            flat
          >
            <Thumbnail
              :src="node.thumbnail"
              :kind="node.kind"
            />
            <VCardText :class="getTitleClass(node)">
              <p dir="auto">
                {{ getTitle(node) }}
              </p>
            </VCardText>
          </VCard>
        </VFlex>
      </VLayout>
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import cloneDeep from 'lodash/cloneDeep';
  import defaultsDeep from 'lodash/defaultsDeep';
  import camelCase from 'lodash/camelCase';
  import orderBy from 'lodash/orderBy';
  import BaseMenu from '../BaseMenu.vue';
  import { SCALE_TEXT, SCALE, CHANNEL_SIZE_DIVISOR } from './constants';
  import DetailsRow from './DetailsRow';
  import { CategoriesLookup, LevelsLookup } from 'shared/constants';
  import {
    fileSizeMixin,
    constantsTranslationMixin,
    printingMixin,
    titleMixin,
    metadataTranslationMixin,
  } from 'shared/mixins';
  import LoadingText from 'shared/views/LoadingText';
  import ExpandableList from 'shared/views/ExpandableList';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import CopyToken from 'shared/views/CopyToken';

  const DEFAULT_DETAILS = {
    name: '',
    title: '',
    description: '',
    thumbnail_url: null,
    thumbnail_src: null,
    thumbnail_encoding: null,
    published: false,
    version: null,
    primary_token: null,
    language: null,
    last_update: null,
    created: null,
    last_published: null,
    resource_count: 0,
    resource_size: 0,
    includes: { coach_content: 0, exercises: 0 },
    kind_count: [],
    languages: [],
    accessible_languages: [],
    licenses: [],
    tags: [],
    copyright_holders: [],
    authors: [],
    aggregators: [],
    providers: [],
    sample_pathway: [],
    original_channels: [],
    sample_nodes: [],
    levels: [],
    categories: [],
  };

  export default {
    name: 'DetailsPanel',
    components: {
      LoadingText,
      ContentNodeIcon,
      ExpandableList,
      CopyToken,
      DetailsRow,
      Thumbnail,
      BaseMenu,
    },
    mixins: [
      fileSizeMixin,
      constantsTranslationMixin,
      printingMixin,
      titleMixin,
      metadataTranslationMixin,
    ],
    props: {
      details: {
        type: Object,
        required: true,
      },
      isChannel: {
        type: Boolean,
        default: true,
      },
      loading: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      ...mapGetters(['loggedIn']),
      channelHref() {
        if (this.loggedIn && !window.libraryMode) {
          return window.Urls.channel(this._details.id);
        }
        return null;
      },
      _details() {
        const details = cloneDeep(this.details);
        defaultsDeep(details, DEFAULT_DETAILS);
        details.published = Boolean(details.last_published);
        return details;
      },
      defaultText() {
        // Making this a computed property so it's easier to update
        return '---';
      },
      publishedDate() {
        if (this.isChannel) {
          return this.$formatDate(this._details.last_published, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
        return '';
      },
      sizeText() {
        const size = this._details.resource_size;
        const sizeIndex = Math.max(
          1,
          Math.min(Math.ceil(Math.log(size / CHANNEL_SIZE_DIVISOR) / Math.log(2)), 10),
        );
        return this.$tr('sizeText', {
          text: this.$tr(SCALE[sizeIndex]),
          size: this.formatFileSize(size),
        });
      },
      kindCount() {
        return orderBy(this._details.kind_count, ['count', 'kind_id'], ['desc', 'asc']);
      },
      createdDate() {
        return this.$formatDate(this._details.created, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
      hasDetails() {
        return Object.keys(this.details).length;
      },
      sortedTags() {
        return orderBy(this._details.tags, ['count'], ['desc']);
      },
      includesPrintable() {
        const includes = [];
        if (this._details.includes.coach_content) {
          includes.push(this.$tr('coachHeading'));
        }

        if (this._details.includes.exercises) {
          includes.push(this.$tr('assessmentsIncludedText'));
        }

        return includes.length ? includes.join(', ') : this.defaultText;
      },
      licensesPrintable() {
        return this._details.licenses.map(this.translateConstant).join(', ');
      },
      tagPrintable() {
        return this.sortedTags.map(tag => tag.tag_name).join(', ');
      },
      levels() {
        return this._details.levels.map(level => {
          level = LevelsLookup[level];
          let translationKey;
          if (level === 'PROFESSIONAL') {
            translationKey = 'specializedProfessionalTraining';
          } else if (level === 'WORK_SKILLS') {
            translationKey = 'allLevelsWorkSkills';
          } else if (level === 'BASIC_SKILLS') {
            translationKey = 'allLevelsBasicSkills';
          } else {
            translationKey = camelCase(level);
          }
          return this.translateMetadataString(translationKey);
        });
      },
      levelsPrintable() {
        return this.levels.join(', ');
      },
      categories() {
        return this._details.categories.map(category => {
          category = CategoriesLookup[category];
          return this.translateMetadataString(camelCase(category));
        });
      },
      categoriesPrintable() {
        return this.categories.join(', ');
      },
    },
    mounted() {
      if (!this.isChannel) {
        // Track node details view when not a channel-- is this happening?
        this.$analytics.trackAction('node_details', 'View', {
          id: this._details.id,
        });
      }
    },
    methods: {
      channelUrl(channel) {
        return window.Urls.channel(channel.id);
      },
      viewInKolibri() {
        if (this._details.demo_server_url) {
          window.open(this._details.demo_server_url, '_blank');
        }
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      sizeHeading: 'Channel size',
      sizeText: '{text} ({size})',
      resourceHeading: 'Total resources',
      coachHeading: 'Resources for coaches',
      coachDescription: 'Resources for coaches are only visible to coaches in Kolibri',
      tagsHeading: 'Common tags',
      creationHeading: 'Created on',
      containsHeading: 'Contains',
      levelsHeading: 'Levels',
      categoriesHeading: 'Categories',
      languagesHeading: 'Languages',
      subtitlesHeading: 'Captions and subtitles',
      authorsLabel: 'Authors',
      authorToolTip: 'Person or organization who created this content',
      providersLabel: 'Providers',
      providerToolTip: 'Organization that commissioned or is distributing the content',
      aggregatorsLabel: 'Aggregators',
      aggregatorToolTip:
        'Website or organization hosting the content collection but not necessarily the creator or copyright holder',
      licensesLabel: 'Licenses',
      copyrightHoldersLabel: 'Copyright holders',
      assessmentsIncludedText: 'Assessments',
      [SCALE_TEXT.VERY_SMALL]: 'Very small',
      [SCALE_TEXT.SMALL]: 'Small',
      [SCALE_TEXT.AVERAGE]: 'Average',
      [SCALE_TEXT.LARGE]: 'Large',
      [SCALE_TEXT.VERY_LARGE]: 'Very large',
      containsContentHeading: 'Contains content from',
      sampleFromChannelHeading: 'Sample content from this channel',
      sampleFromTopicHeading: 'Sample content from this topic',
      tokenHeading: 'Channel token',
      publishedHeading: 'Published on',
      currentVersionHeading: 'Published version',
      primaryLanguageHeading: 'Primary language',
      unpublishedText: 'Unpublished',
      viewInKolibri: 'View in Kolibri',
      goToChannel: 'Go to Channel',
      goToWebsite: 'Go to source website',
      options: 'Options',
      downloadButton: 'Download channel summary',
      downloadPDF: 'Download PDF',
      downloadCSV: 'Download CSV',
    },
  };

</script>


<style lang="scss" scoped>

  .printing ::v-deep * {
    font-family: 'Noto Sans', helvetica !important;

    &.material-icons {
      font-family: 'Material Icons' !important;
    }
  }

  .details-layout {
    align-items: center;
  }

  .details-content {
    padding-right: 16px;
  }

  .v-toolbar__title {
    font-weight: bold;
  }

  .draft-header {
    color: gray;
  }

  .subheader {
    margin-top: 20px;
    margin-bottom: 0;
    font-size: 10pt !important;
    font-weight: bold;
    color: gray;
  }

  .detail-value {
    font-size: 14pt;
    font-weight: bold;
  }

  .tag {
    padding: 0 8px;
    font-weight: bold;
    background-color: var(--v-grey-lighten3);
    border-radius: 10px;
  }

  .kind-table {
    max-width: 350px;
    font-size: 12pt;

    ::v-deep tr {
      border-top: 0 !important;

      &:hover {
        background: transparent !important;
      }
    }

    td {
      height: 36px;
      font-size: 12pt;
    }
  }

  .preview-row {
    margin: 16px 0;

    &:first-child {
      margin-top: 0;
    }

    a {
      margin: 0 8px;
      font-weight: bold;
      text-decoration: none;

      span {
        text-decoration: underline;
      }
    }

    .source-thumbnail {
      flex-grow: 0;
      width: 150px;
      border: 1px solid var(--v-grey-lighten3);
    }
  }

  .sample-nodes .v-card__text {
    max-width: 800px;
    font-weight: bold;
    word-break: break-word;
  }

</style>
