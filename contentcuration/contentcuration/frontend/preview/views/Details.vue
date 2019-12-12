<template>

  <div>
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
          <!-- Using a table here instead of a list as the counts are better aligned -->
          <v-data-table
            v-if="kindCount.length"
            :items="kindCount"
            hide-actions
            hide-headers
          >
            <template v-slot:items="props">
              <td>
                <ContentNodeIcon :kind="props.item.kind_id" />
                <span>{{ translateConstant(props.item.kind_id) }}</span>
              </td>
              <td>{{ $formatNumber(props.item.count) }}</td>
              <td v-if="$vuetify.breakpoint.smAndUp"></td>
              <td v-if="$vuetify.breakpoint.mdAndUp"></td>
              <td v-if="$vuetify.breakpoint.lgAndUp"></td>
              <td v-if="$vuetify.breakpoint.xlAndUp"></td>
            </template>
          </v-data-table>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('containsHeading')">
        <template v-slot>
          <v-chip v-if="details.includes.coach_content" color="grey lighten-2">
            {{ $tr('coachHeading') }}
          </v-chip>
          <v-chip v-if="details.includes.exercises" color="grey lighten-2">
            {{ $tr('assessmentsIncludedText') }}
          </v-chip>
        </template>
      </DetailsRow>
      <DetailsRow
        :label="$tr('coachHeading')"
        :text="details.includes.coach_content.toString()"
        :definition="$tr('coachDescription')"
      />
      <DetailsRow :label="$tr('tagsHeading')">
        <template v-slot>
          <div v-if="!sortedTags.length">
            {{ $tr('defaultNoItemsText') }}
          </div>
          <v-chip
            v-for="tag in sortedTags"
            v-else
            :key="tag.tag_name"
            color="grey lighten-2"
          >
            {{ tag.tag_name }}
          </v-chip>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('languagesHeading')">
        <template v-slot>
          <ExpandableList
            :noItemsText="$tr('defaultNoItemsText')"
            :items="details.languages"
            inline
          />
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('subtitlesHeading')">
        <template v-slot>
          <ExpandableList
            :noItemsText="$tr('defaultNoItemsText')"
            :items="details.accessible_languages"
            inline
          />
        </template>
      </DetailsRow>

      <DetailsRow
        :label="$tr('authorsLabel')"
        :definition="$tr('authorToolTip')"
      >
        <template v-slot>
          <ExpandableList
            :noItemsText="$tr('defaultNoItemsText')"
            :items="details.authors"
            inline
          />
        </template>
      </DetailsRow>
      <DetailsRow
        :label="$tr('providersLabel')"
        :definition="$tr('providerToolTip')"
      >
        <template v-slot>
          <ExpandableList
            :noItemsText="$tr('defaultNoItemsText')"
            :items="details.providers"
            inline
          />
        </template>
      </DetailsRow>
      <DetailsRow
        :label="$tr('aggregatorsLabel')"
        :definition="$tr('aggregatorToolTip')"
      >
        <template v-slot>
          <ExpandableList
            :noItemsText="$tr('defaultNoItemsText')"
            :items="details.aggregators"
            inline
          />
        </template>
      </DetailsRow>

      <DetailsRow :label="$tr('licensesLabel')">
        <template v-slot>
          <v-tooltip v-for="license in details.licenses" :key="license" top>
            <template v-slot:activator="{ on }">
              <v-chip color="grey lighten-2" v-on="on">
                {{ translateConstant(license) }}
              </v-chip>
            </template>
            <span>{{ translateConstant(license + '_description') }}</span>
          </v-tooltip>
        </template>
      </DetailsRow>
      <DetailsRow :label="$tr('copyrightHoldersLabel')">
        <template v-slot>
          <ExpandableList
            :items="details.copyright_holders"
            :no-items-text="$tr('defaultNoItemsText')"
            inline
          />
        </template>
      </DetailsRow>

      <DetailsRow
        v-if="details.original_channels.length"
        :label="$tr('containsContentHeading')"
      >
        <template v-slot>
          <v-layout
            v-for="channel in details.original_channels"
            :key="channel.id"
            class="preview-row"
          >
            <VImg :src="channel.thumbnail" contain max-width="200" :aspect-ratio="16/9" />
            <v-flex>
              <v-layout align-center fill-height>
                <v-btn
                  :href="`/channels/${channel.id}/view`"
                  target="_blank"
                  flat
                  color="primary"
                  large
                >
                  {{ channel.name }}
                </v-btn>
              </v-layout>
            </v-flex>
          </v-layout>
        </template>
      </DetailsRow>
    </div>
  </div>

</template>

<script>

  import sortBy from 'lodash/sortBy';
  import { fileSizeMixin, constantsTranslationMixin } from '../../shared/mixins';
  import { SCALE_TEXT, SCALE, CHANNEL_SIZE_DIVISOR } from '../constants';
  import LoadingText from '../../shared/views/LoadingText';
  import ExpandableList from '../../shared/views/ExpandableList';
  import DetailsRow from './DetailsRow';
  import ContentNodeIcon from 'edit_channel/sharedComponents/ContentNodeIcon';
  import client from 'shared/client';

  export default {
    name: 'Details',
    components: {
      LoadingText,
      ContentNodeIcon,
      ExpandableList,
      DetailsRow,
    },
    mixins: [fileSizeMixin, constantsTranslationMixin],
    props: {
      nodeID: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        loading: false,
        details: {},
        loadError: false,
      };
    },
    computed: {
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
    mounted() {
      this.loadDetails();
    },
    methods: {
      loadDetails() {
        this.loading = true;
        return client
          .get(window.Urls.get_node_details(this.nodeID))
          .then(response => {
            this.details = response.data;
            this.loading = false;
          })
          .catch(() => {
            this.loading = false;
            this.loadError = true;
          });
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
      copyrightHoldersLabel: 'Copyright Holders',
      assessmentsIncludedText: 'Assessments',
      [SCALE_TEXT.VERY_SMALL]: 'Very Small',
      [SCALE_TEXT.SMALL]: 'Small',
      [SCALE_TEXT.AVERAGE]: 'Average',
      [SCALE_TEXT.LARGE]: 'Large',
      [SCALE_TEXT.VERY_LARGE]: 'Very Large',
      defaultNoItemsText: '---',
      containsContentHeading: 'Contains content from',
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

  .v-chip {
    padding: 0 8px;
    font-weight: bold;
    border-radius: 10px;
  }

  /deep/ .v-datatable {
    margin-left: -18px;
    tr {
      border-bottom: 0 !important;
      td {
        font-size: 12pt;
        span {
          margin-left: 20px;
        }
      }
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

</style>
