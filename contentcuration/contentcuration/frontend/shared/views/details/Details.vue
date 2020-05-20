<template>

  <div>
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
      <DetailsRow v-if="details.published" :label="$tr('tokenHeading')">
        <template v-slot>
          <CopyToken
            v-if="!printing"
            :token="details.primary_token"
            style="max-width:max-content;"
          />
          <span v-else>{{ details.primary_token }}</span>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('publishedHeading')">
        <span v-if="details.published">{{ publishedDate }}</span>
        <em v-else>{{ $tr('unpublishedText') }}</em>
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
          <div v-for="item in kindCount" :key="item.kind_id" class="kind-row">
            <ContentNodeIcon :kind="item.kind_id" />
            <span class="text px-2">{{ translateConstant(item.kind_id) }}</span>
            <span class="item-count text px-2">{{ $formatNumber(item.count) }}</span>
            <br>
          </div>
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
            {{ $tr('defaultNoItemsText') }}
          </div>
        </template>
        <template v-else v-slot>
          <span v-if="details.includes.coach_content">
            {{ $tr('coachHeading') }}
          </span>
          <span v-if="details.includes.exercises">
            {{ $tr('assessmentsIncludedText') }}
          </span>
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
            {{ $tr('defaultNoItemsText') }}
          </div>
          <VChip
            v-for="tag in sortedTags"
            v-else
            :key="tag.tag_name"
            class="tag"
          >
            {{ tag.tag_name }}
          </VChip>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('languagesHeading')">
        <template v-slot>
          <ExpandableList
            :noItemsText="$tr('defaultNoItemsText')"
            :items="details.languages"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('subtitlesHeading')">
        <template v-slot>
          <ExpandableList
            :noItemsText="$tr('defaultNoItemsText')"
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
            :noItemsText="$tr('defaultNoItemsText')"
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
            :noItemsText="$tr('defaultNoItemsText')"
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
            :noItemsText="$tr('defaultNoItemsText')"
            :items="details.aggregators"
            :printing="printing"
            inline
          />
        </template>
      </DetailsRow>

      <DetailsRow :label="$tr('licensesLabel')">
        <template v-slot>
          <template v-for="license in details.licenses">
            <VTooltip v-if="!printing" :key="license" top>
              <template v-slot:activator="{ on }">
                <VChip class="tag" v-on="on">
                  {{ translateConstant(license) }}
                </VChip>
              </template>
              <span>{{ translateConstant(license + '_description') }}</span>
            </VTooltip>
            <span v-else :key="license">
              {{ translateConstant(license) }}
            </span>
          </template>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('copyrightHoldersLabel')">
        <template v-slot>
          <ExpandableList
            :items="details.copyright_holders"
            :no-items-text="$tr('defaultNoItemsText')"
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
            <VFlex style="max-width: 200px">
              <Thumbnail :src="channel.thumbnail" />
            </VFlex>
            <VFlex v-if="libraryMode" class="notranslate subheading font-weight-bold px-4">
              {{ channel.name }}
            </VFlex>
            <VBtn
              v-else
              :href="`/channels/${channel.id}/view`"
              target="_blank"
              flat
              color="primary"
              large
              class="notranslate"
            >
              {{ channel.name }}
            </VBtn>
          </VLayout>
        </template>
      </DetailsRow>

      <label
        v-if="details.sample_nodes.length"
        class="font-weight-bold body-1"
        :style="{color: $vuetify.theme.darkGrey}"
      >
        {{ isChannel? $tr('sampleFromChannelHeading') : $tr('sampleFromTopicHeading') }}
      </label>
      <VLayout row wrap class="sample-nodes pt-1">
        <VFlex v-for="node in details.sample_nodes" :key="node.node_id" xs12 sm3>
          <VCard height="100%" flat>
            <Thumbnail :src="node.thumbnail" :kind="node.kind" />
            <VCardText class="notranslate">
              <p dir="auto">
                {{ node.title }}
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
  import { fileSizeMixin, constantsTranslationMixin } from 'shared/mixins';
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
    mixins: [fileSizeMixin, constantsTranslationMixin],
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
      printing: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
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
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      sizeHeading: 'Channel size',
      sizeText: '{text} ({size})',
      resourceHeading: 'Total resources',
      coachHeading: 'Coach resources',
      coachDescription: 'Coach content is visible to coaches only in Kolibri',
      tagsHeading: 'Common tags',
      creationHeading: 'Created date',
      containsHeading: 'Contains',
      languagesHeading: 'Languages',
      subtitlesHeading: 'Subtitles',
      authorsLabel: 'Authors',
      authorToolTip: 'Person or organization who created this content',
      providersLabel: 'Providers',
      providerToolTip: 'Organization that commissioned or is distributing the content',
      aggregatorsLabel: 'Aggregators',
      aggregatorToolTip:
        'Website or org hosting the content collection but not necessarily the creator or copyright holder',
      licensesLabel: 'Licenses',
      copyrightHoldersLabel: 'Copyright holders',
      assessmentsIncludedText: 'Assessments',
      [SCALE_TEXT.VERY_SMALL]: 'Very small',
      [SCALE_TEXT.SMALL]: 'Small',
      [SCALE_TEXT.AVERAGE]: 'Average',
      [SCALE_TEXT.LARGE]: 'Large',
      [SCALE_TEXT.VERY_LARGE]: 'Very large',
      defaultNoItemsText: '---',
      containsContentHeading: 'Contains content from',
      sampleFromChannelHeading: 'Sample content from this channel',
      sampleFromTopicHeading: 'Sample content from this topic',
      tokenHeading: 'Channel token',
      publishedHeading: 'Published date',
      primaryLanguageHeading: 'Primary language',
      unpublishedText: 'Unpublished',
    },
  };

</script>


<style lang="less" scoped>

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

  .kind-row {
    max-width: 300px;
    padding-bottom: 3px;
    font-size: 12pt;
    .item-count {
      float: right;
    }
  }

  .preview-row {
    margin: 16px 0;
    &:first-child {
      margin-top: 0;
    }
    .v-btn {
      padding: 0 5px;
      font-weight: bold;
      text-transform: none;
    }
  }

  .sample-nodes .v-card__text {
    font-weight: bold;
    word-break: break-word;
  }

</style>
