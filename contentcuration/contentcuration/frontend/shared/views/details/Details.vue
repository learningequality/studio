<template>

  <div :class="{ printing }">
    <div style="max-width: 300px">
      <Thumbnail
        :src="isChannel ? details.thumbnail_url : details.thumbnail_src"
        :encoding="isChannel ? details.thumbnail_encoding : null"
      />
    </div>
    <br>
    <h1 class="notranslate" dir="auto">
      {{ isChannel ? details.name : details.title }}
    </h1>
    <p class="notranslate" dir="auto">
      {{ details.description }}
    </p>
    <br>

    <template v-if="isChannel">
      <DetailsRow v-if="details.published && details.primary_token" :label="$tr('tokenHeading')">
        <template v-slot>
          <CopyToken
            v-if="!printing"
            :token="details.primary_token"
            style="max-width:max-content;"
          />
          <span v-else>
            {{
              details.primary_token.slice(0, 5) + '-' + details.primary_token.slice(5)
            }}
          </span>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('publishedHeading')">
        <span v-if="details.published">{{ publishedDate }}</span>
        <em v-else>{{ $tr('unpublishedText') }}</em>
      </DetailsRow>
      <DetailsRow :label="$tr('currentVersionHeading')">
        <template v-if="details.published">
          {{ details.version }}
        </template>
        <template v-else>
          {{ defaultText }}
        </template>
      </DetailsRow>
      <DetailsRow
        v-if="details.language"
        :label="$tr('primaryLanguageHeading')"
        :text="translateLanguage(details.language)"
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
        <template v-slot>
          <p>{{ $formatNumber(details.resource_count) }}</p>
          <VDataTable
            :items="kindCount"
            hide-actions
            hide-headers
            class="kind-table"
          >
            <template #items="{ item }">
              <td style="width: 24px;" class="pr-2 py-0">
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
      <DetailsRow :label="$tr('containsHeading')">
        <template v-if="!printing" v-slot>
          <VChip v-if="details.includes.coach_content" class="tag">
            {{ $tr('coachHeading') }}
          </VChip>
          <VChip v-if="details.includes.exercises" class="tag">
            {{ $tr('assessmentsIncludedText') }}
          </VChip>
          <div v-if="!details.includes.exercises && !details.includes.coach_content">
            {{ defaultText }}
          </div>
        </template>
        <template v-else v-slot>
          <span>{{ includesPrintable }}</span>
        </template>
      </DetailsRow>
      <DetailsRow
        :label="$tr('coachHeading')"
        :text="$formatNumber(details.includes.coach_content || 0)"
        :definition="!printing ? $tr('coachDescription') : ''"
      />
      <DetailsRow :label="$tr('tagsHeading')">
        <template v-slot>
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
        <template v-slot>
          <ExpandableList
            :noItemsText="defaultText"
            :items="details.languages"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('subtitlesHeading')">
        <template v-slot>
          <ExpandableList
            :noItemsText="defaultText"
            :items="details.accessible_languages"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>

      <DetailsRow
        :label="$tr('authorsLabel')"
        :definition="!printing ? $tr('authorToolTip') : ''"
      >
        <template v-slot>
          <ExpandableList
            :noItemsText="defaultText"
            :items="details.authors"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>
      <DetailsRow
        :label="$tr('providersLabel')"
        :definition="!printing ? $tr('providerToolTip') : ''"
      >
        <template v-slot>
          <ExpandableList
            :noItemsText="defaultText"
            :items="details.providers"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>
      <DetailsRow
        :label="$tr('aggregatorsLabel')"
        :definition="!printing ? $tr('aggregatorToolTip') : ''"
      >
        <template v-slot>
          <ExpandableList
            :noItemsText="defaultText"
            :items="details.aggregators"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>

      <DetailsRow :label="$tr('licensesLabel')">
        <template v-slot>
          <template v-if="!printing">
            <VTooltip v-for="license in details.licenses" :key="license" top>
              <template v-slot:activator="{ on }">
                <VChip class="tag" v-on="on">
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
        <template v-slot>
          <ExpandableList
            :items="details.copyright_holders"
            :no-items-text="defaultText"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>

      <DetailsRow
        v-if="details.original_channels.length"
        :label="$tr('containsContentHeading')"
      >
        <template v-slot>
          <VLayout
            v-for="channel in details.original_channels"
            :key="channel.id"
            class="preview-row"
            align-center
            row
          >
            <VFlex class="source-thumbnail">
              <Thumbnail :src="channel.thumbnail" />
            </VFlex>
            <VFlex v-if="libraryMode" class="font-weight-bold notranslate px-4 subheading">
              {{ channel.name }}
            </VFlex>
            <a
              v-else
              :href="channelUrl(channel)"
              target="_blank"
              class="notranslate primary--text"
            >
              <span>{{ channel.name }}</span>
              <Icon small class="mx-1 rtl-flip" color="primary">open_in_new</Icon>
            </a>
          </VLayout>
        </template>
      </DetailsRow>

      <label
        v-if="details.sample_nodes.length"
        class="body-1 font-weight-bold"
        :style="{ color: $vuetify.theme.darkGrey }"
      >
        {{ isChannel ? $tr('sampleFromChannelHeading') : $tr('sampleFromTopicHeading') }}
      </label>
      <VLayout row :wrap="!printing" class="my-4 pt-1 sample-nodes">
        <VFlex
          v-for="node in details.sample_nodes"
          :key="node.node_id"
          :xs12="!printing"
          :xs3="printing"
          sm3
        >
          <VCard height="100%" flat>
            <Thumbnail :src="node.thumbnail" :kind="node.kind" />
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

  import sortBy from 'lodash/sortBy';
  import { SCALE_TEXT, SCALE, CHANNEL_SIZE_DIVISOR } from './constants';
  import DetailsRow from './DetailsRow';
  import {
    fileSizeMixin,
    constantsTranslationMixin,
    printingMixin,
    titleMixin,
  } from 'shared/mixins';
  import LoadingText from 'shared/views/LoadingText';
  import ExpandableList from 'shared/views/ExpandableList';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import CopyToken from 'shared/views/CopyToken';

  export default {
    name: 'Details',
    components: {
      LoadingText,
      ContentNodeIcon,
      ExpandableList,
      CopyToken,
      DetailsRow,
      Thumbnail,
    },
    mixins: [fileSizeMixin, constantsTranslationMixin, printingMixin, titleMixin],
    props: {
      // Object matching that returned by the channel details and
      // node details API endpoints, see backend for details of the
      // object structure and keys. get_details method on ContentNode
      // model as a starting point.`
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
      defaultText() {
        // Making this a computed property so it's easier to update
        return '---';
      },
      publishedDate() {
        if (this.isChannel) {
          return this.$formatDate(this.details.last_published, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
        return '';
      },
      libraryMode() {
        return window.libraryMode;
      },
      sizeText() {
        let size = (this.details && this.details.resource_size) || 0;
        const sizeIndex = Math.max(
          1,
          Math.min(Math.ceil(Math.log(size / CHANNEL_SIZE_DIVISOR) / Math.log(2)), 10)
        );
        return this.$tr('sizeText', {
          text: this.$tr(SCALE[sizeIndex]),
          size: this.formatFileSize(size),
        });
      },
      kindCount() {
        return sortBy(this.details.kind_count, ['-count', 'kind_id']);
      },
      createdDate() {
        return this.$formatDate(this.details.created, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
      hasDetails() {
        return Object.keys(this.details).length;
      },
      sortedTags() {
        return sortBy(this.details.tags, '-count');
      },
      includesPrintable() {
        const includes = [];
        if (this.details.includes.coach_content) {
          includes.push(this.$tr('coachHeading'));
        }

        if (this.details.includes.exercises) {
          includes.push(this.$tr('assessmentsIncludedText'));
        }

        return includes.length ? includes.join(', ') : this.defaultText;
      },
      licensesPrintable() {
        return this.details.licenses.map(this.translateConstant).join(', ');
      },
      tagPrintable() {
        return this.sortedTags.map(tag => tag.tag_name).join(', ');
      },
    },
    methods: {
      channelUrl(channel) {
        return window.Urls.channel(channel.id);
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
    },
  };

</script>


<style lang="less" scoped>

  .printing /deep/ * {
    font-family: 'Noto Sans', helvetica !important;
    &.material-icons {
      font-family: 'Material Icons' !important;
    }
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
    /deep/ tr {
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
