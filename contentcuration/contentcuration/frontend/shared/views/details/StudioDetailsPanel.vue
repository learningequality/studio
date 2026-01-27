<template>

  <div
    :class="{ printing }"
    data-testid="details-panel"
  >
    <StudioThumbnail
      :src="_details.thumbnail_url"
      :encoding="_details.thumbnail_encoding"
      :style="{ maxWidth: '300px' }"
    />
    <br >
    <h1
      class="notranslate"
      dir="auto"
    >
      {{ _details.name }}
    </h1>
    <p
      class="notranslate"
      dir="auto"
    >
      {{ _details.description }}
    </p>
    <br >

    <StudioDetailsRow
      v-if="_details.published && _details.primary_token"
      :label="$tr('tokenHeading')"
    >
      <template #default>
        <StudioCopyToken
          v-if="!printing"
          :token="_details.primary_token"
          :loading="false"
        />
        <span v-else>
          {{ _details.primary_token.slice(0, 5) + '-' + _details.primary_token.slice(5) }}
        </span>
      </template>
    </StudioDetailsRow>
    <StudioDetailsRow :label="$tr('publishedHeading')">
      <span v-if="_details.published">{{ publishedDate }}</span>
      <em v-else>{{ $tr('unpublishedText') }}</em>
    </StudioDetailsRow>
    <StudioDetailsRow :label="$tr('currentVersionHeading')">
      <template v-if="_details.published">
        {{ _details.version }}
      </template>
      <template v-else>
        {{ defaultText }}
      </template>
    </StudioDetailsRow>
    <StudioDetailsRow
      v-if="_details.language"
      :label="$tr('primaryLanguageHeading')"
      :text="translateLanguage(_details.language)"
    />

    <StudioLargeLoader v-if="loading" />
    <div v-else-if="hasDetails">
      <StudioDetailsRow
        :label="$tr('creationHeading')"
        :text="createdDate"
      />
      <StudioDetailsRow
        :label="$tr('sizeHeading')"
        :text="sizeText"
      />
      <StudioDetailsRow :label="$tr('resourceHeading')">
        <template #default>
          <p>{{ $formatNumber(_details.resource_count) }}</p>
          <dl class="resource-list">
            <KFixedGrid
              v-for="item in kindCount"
              :key="item.kind_id"
              :numCols="4"
              class="resource-item"
            >
              <KGridItem :layout="{ span: 3 }">
                <dt>
                  <ContentNodeIcon
                    class="resource-icon"
                    :kind="item.kind_id"
                  />
                  <span>{{ translateConstant(item.kind_id) }}</span>
                </dt>
              </KGridItem>
              <KGridItem :layout="{ span: 1, alignment: 'right' }">
                <dd>
                  {{ $formatNumber(item.count) }}
                </dd>
              </KGridItem>
            </KFixedGrid>
          </dl>
        </template>
      </StudioDetailsRow>
      <StudioDetailsRow :label="$tr('levelsHeading')">
        <template #default>
          <div v-if="!levels.length">
            {{ defaultText }}
          </div>
          <StudioChip
            v-for="level in levels"
            v-else-if="!printing"
            :key="level"
          >
            {{ level }}
          </StudioChip>
          <span v-else>
            {{ levelsPrintable }}
          </span>
        </template>
      </StudioDetailsRow>
      <StudioDetailsRow :label="$tr('categoriesHeading')">
        <template #default>
          <div v-if="!categories.length">
            {{ defaultText }}
          </div>
          <StudioChip
            v-for="category in categories"
            v-else-if="!printing"
            :key="category"
          >
            {{ category }}
          </StudioChip>
          <span v-else>
            {{ categoriesPrintable }}
          </span>
        </template>
      </StudioDetailsRow>
      <StudioDetailsRow :label="$tr('containsHeading')">
        <template
          v-if="!printing"
          #default
        >
          <StudioChip v-if="_details.includes.coach_content">
            {{ $tr('coachHeading') }}
          </StudioChip>
          <StudioChip v-if="_details.includes.exercises">
            {{ $tr('assessmentsIncludedText') }}
          </StudioChip>
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
      </StudioDetailsRow>
      <StudioDetailsRow
        :label="$tr('coachHeading')"
        :text="$formatNumber(_details.includes.coach_content)"
        :definition="!printing ? $tr('coachDescription') : ''"
      />
      <StudioDetailsRow :label="$tr('tagsHeading')">
        <template #default>
          <div v-if="!sortedTags.length">
            {{ defaultText }}
          </div>
          <StudioChip
            v-for="tag in sortedTags"
            v-else-if="!printing"
            :key="tag.tag_name"
          >
            <span class="notranslate">{{ tag.tag_name }}</span>
          </StudioChip>
          <span v-else>
            {{ tagPrintable }}
          </span>
        </template>
      </StudioDetailsRow>
      <StudioDetailsRow :label="$tr('languagesHeading')">
        <template #default>
          <ExpandableList
            :noItemsText="defaultText"
            :items="_details.languages"
            :printing="printing"
            inline
          />
        </template>
      </StudioDetailsRow>
      <StudioDetailsRow :label="$tr('subtitlesHeading')">
        <template #default>
          <ExpandableList
            :noItemsText="defaultText"
            :items="_details.accessible_languages"
            :printing="printing"
            inline
          />
        </template>
      </StudioDetailsRow>

      <StudioDetailsRow
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
      </StudioDetailsRow>
      <StudioDetailsRow
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
      </StudioDetailsRow>
      <StudioDetailsRow
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
      </StudioDetailsRow>

      <StudioDetailsRow :label="$tr('licensesLabel')">
        <template #default>
          <template v-if="!printing">
            <span
              v-for="license in _details.licenses"
              :key="license"
              :ref="`licenseChip-${license}`"
              class="license-chip-wrapper"
            >
              <StudioChip>
                {{ translateConstant(license) }}
              </StudioChip>
              <KTooltip
                :reference="`licenseChip-${license}`"
                :refs="$refs"
                placement="top"
              >
                <span>{{ translateConstant(license + '_description') }}</span>
              </KTooltip>
            </span>
          </template>
          <span v-else>
            {{ licensesPrintable }}
          </span>
        </template>
      </StudioDetailsRow>
      <StudioDetailsRow :label="$tr('copyrightHoldersLabel')">
        <template #default>
          <ExpandableList
            :items="_details.copyright_holders"
            :no-items-text="defaultText"
            :printing="printing"
            inline
          />
        </template>
      </StudioDetailsRow>

      <StudioDetailsRow
        v-if="_details.original_channels.length"
        :label="$tr('containsContentHeading')"
      >
        <template #default>
          <div
            v-for="channel in _details.original_channels"
            :key="channel.id"
            class="preview-row"
          >
            <StudioThumbnail
              class="source-thumbnail"
              :src="channel.thumbnail"
            />
            <div
              v-if="printing"
              class="channel-name notranslate"
            >
              {{ channel.name }}
            </div>
            <a
              v-else
              :href="channelUrl(channel)"
              target="_blank"
              class="channel-link notranslate"
            >
              <span>{{ channel.name }}</span>
              <KIcon
                icon="openNewTab"
                class="rtl-flip"
                :style="{ marginLeft: '4px', marginRight: '4px' }"
              />
            </a>
          </div>
        </template>
      </StudioDetailsRow>

      <label
        v-if="_details.sample_nodes.length"
        class="sample-heading"
      >
        {{ $tr('sampleFromChannelHeading') }}
      </label>
      <KGrid
        gutter="0"
        class="sample-nodes"
      >
        <KGridItem
          v-for="node in _details.sample_nodes"
          :key="node.node_id"
          :layout12="{ span: 3 }"
          :layout8="{ span: 4 }"
          :layout4="{ span: printing ? 1 : 4 }"
        >
          <StudioThumbnail
            :src="node.thumbnail"
            :kind="node.kind"
          />
          <p
            dir="auto"
            class="sample-node-title"
          >
            {{ getTitle(node) }}
          </p>
        </KGridItem>
      </KGrid>
    </div>
  </div>

</template>


<script>

  import cloneDeep from 'lodash/cloneDeep';
  import defaultsDeep from 'lodash/defaultsDeep';
  import camelCase from 'lodash/camelCase';
  import orderBy from 'lodash/orderBy';
  import {
    fileSizeMixin,
    constantsTranslationMixin,
    printingMixin,
    titleMixin,
    metadataTranslationMixin,
  } from '../../mixins';
  import { CategoriesLookup, LevelsLookup } from '../../constants';
  import ContentNodeIcon from '../ContentNodeIcon';
  import ExpandableList from '../ExpandableList';
  import StudioChip from '../StudioChip';
  import StudioLargeLoader from '../StudioLargeLoader';
  import StudioCopyToken from '../CopyToken';
  import { SCALE_TEXT, SCALE, CHANNEL_SIZE_DIVISOR } from './constants';
  import StudioDetailsRow from './StudioDetailsRow';
  import StudioThumbnail from 'shared/views/files/StudioThumbnail';

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
    name: 'StudioDetailsPanel',
    components: {
      StudioLargeLoader,
      ContentNodeIcon,
      ExpandableList,
      StudioCopyToken,
      StudioDetailsRow,
      StudioChip,
      StudioThumbnail,
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
      loading: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
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
        return this.$formatDate(this._details.last_published, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
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
    mounted() {},
    methods: {
      channelUrl(channel) {
        return window.Urls.channel(channel.id);
      },
    },
    $trs: {
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
      tokenHeading: 'Channel token',
      publishedHeading: 'Published on',
      currentVersionHeading: 'Published version',
      primaryLanguageHeading: 'Primary language',
      unpublishedText: 'Unpublished',
    },
  };

</script>


<style lang="scss" scoped>

  .printing {
    font-family: 'Noto Sans', helvetica !important;

    /* stylelint-disable-next-line selector-pseudo-class-no-unknown */
    :global(.material-icons) {
      font-family: 'Material Icons' !important;
    }
  }

  .resource-list {
    max-width: 350px;
    margin: 8px 0;
  }

  .resource-item {
    margin: 12px 0;
  }

  .resource-icon {
    margin-right: 8px;
  }

  .license-chip-wrapper {
    position: relative;
    display: inline-block;
  }

  .preview-row {
    display: flex;
    gap: 16px;
    align-items: center;
    margin: 16px 0;

    &:first-child {
      margin-top: 0;
    }
  }

  .source-thumbnail {
    flex-shrink: 0;
    width: 150px;
  }

  .channel-name {
    padding: 0 16px;
    font-size: 16px;
    font-weight: bold;
  }

  .channel-link {
    margin: 0 8px;
    font-weight: bold;
    color: #1976d2;
    text-decoration: none;

    span {
      text-decoration: underline;
    }

    &:hover {
      opacity: 0.8;
    }
  }

  .rtl-flip {
    transform: scaleX(1);

    [dir='rtl'] & {
      transform: scaleX(-1);
    }
  }

  .sample-heading {
    display: block;
    margin-top: 28px;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: bold;
    line-height: 20px;
    color: #424242;
  }

  .sample-nodes {
    margin-top: 28px;
  }

  .sample-node-title {
    margin-top: 12px;
    margin-bottom: 42px;
    font-weight: bold;
    word-break: break-word;
  }

</style>
