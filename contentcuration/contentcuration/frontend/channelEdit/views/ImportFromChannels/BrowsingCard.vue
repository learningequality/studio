<template>

  <VCard>
    <VCardTitle>
      <VLayout row>
        <VFlex sm2 xs12>
          <VLayout align-center justify-center fill-height>
            <VImg
              v-if="node.thumbnail"
              height="80px"
              maxHeight="80px"
              width="80px"
              maxWidth="80px"
              :src="node.original_channel.thumbnail_url"
              aspectRatio="1"
            />
            <VIcon v-else size="80px" class="icon-placeholder">
              {{ kindToIcon(node.kind) }}
            </VIcon>
          </VLayout>
        </VFlex>

        <VFlex sm10 xs12>
          <div>
            <ContentNodeChip :kind="node.kind" />
            <VChip
              v-if="node.changed"
              label
              small
              disabled
              color="#F5F5F5"
              text-color="#686868"
            >
              {{ $tr('updatedLabel') }}
            </VChip>
            <span v-if="node.kind === 'topic'">
              &#9679; {{ resourcesMsg }}
            </span>
            <span v-if="languageName">
              &#9679; {{ languageName }}
            </span>

          </div>
          <div>
            <h3 class="headline my-2">
              <RouterLink v-if="node.kind === 'topic'" :to="topicRoute">
                {{ node.title }}
              </RouterLink>
              <RouterLink v-else :to="{}">
                <a href="#" @click="emitPreview">
                  {{ node.title }}
                </a>
              </RouterLink>
            </h3>
            <div
              v-if="node.description"
              :class="{'text-truncate': !showWholeDescription && descriptionIsLong}"
            >
              {{ node.description }}
            </div>
            <div v-if="tagsString">
              {{ $tr('tagsList', { tags: tagsString }) }}
            </div>
            <VBtn
              v-if="descriptionIsLong"
              small
              flat
              class="show-more-btn"
              @click="showWholeDescription = !showWholeDescription"
            >
              <span>
                {{ showWholeDescription ? $tr('showLessLabel') : $tr('showMoreLabel') }}
                <VIcon class="arrow-icon">
                  {{ showWholeDescription ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}
                </VIcon>
              </span>
            </VBtn>
          </div>
        </VFLex>
      </VLayout>
    </VCardTitle>

    <VCardActions>
      <VLayout row align-center justify-space-between class="px-3">
        <VFlex>
          <VCheckbox
            :inputValue="$attrs.checked"
            :disabled="$attrs.disabled"
            @change="$emit('change', $event)"
          />
        </VFLex>
        <VFlex shrink>
          <VBtn
            v-if="inSearch"
            color="primary"
            flat
            :to="goToLocationRoute"
          >
            {{ goToLocationLabel }}
          </VBtn>
          <VBtn
            icon
            flat
            :ariaLabel="$tr('previewAction')"
            @click="emitPreview"
          >
            <VIcon>info_outline</VIcon>
          </VBtn>
          <VBtn
            icon
            flat
            :ariaLabel="$tr('addToClipboardAction')"
            @click="$emit('click_clipboard')"
          >
            <VIcon>content_paste</VIcon>
          </VBtn>

        </VFLex>
      </VLayout>
    </VCardActions>
  </VCard>

</template>


<script>

  import get from 'lodash/get';
  import ContentNodeChip from './ContentNodeChip';
  import Constants from 'edit_channel/constants';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'BrowsingCard',
    inject: ['RouterNames'],
    components: {
      ContentNodeChip,
    },
    mixins: [constantsTranslationMixin],
    props: {
      node: {
        type: Object,
        required: true,
      },
      // If 'true', will show the actions for search browsing
      inSearch: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        showWholeDescription: false,
      };
    },
    computed: {
      languageName() {
        return this.translateLanguage(this.node.language);
      },
      tagsString() {
        // List will be comma-separated
        // TODO see if ICU ListFormater is usable
        const tags = this.node.tags;
        if (!tags || tags.length === 0) {
          return '';
        }
        return tags.join(', ');
      },
      topicRoute() {
        return {
          name: this.RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
          params: {
            nodeId: this.node.id,
            channelId: this.inSearch ? this.node.source_channel_id : this.$route.params.channelId,
          },
        };
      },
      resourcesMsg() {
        let count;
        if (this.node.resource_count !== undefined) {
          count = this.node.resource_count;
        } else {
          count = this.node.metadata.resource_count;
        }
        return this.$tr('resourcesCount', { count });
      },
      descriptionIsLong() {
        // "long" arbitrarily means it's longer than 120 characters
        return get(this.node, ['description', 'length']) > 120;
      },
      numLocations() {
        return 1;
      },
      goToLocationLabel() {
        return this.numLocations > 1
          ? this.$tr('goToPluralLocationsAction', { count: this.numLocations })
          : this.$tr('goToSingleLocationAction');
      },
      goToLocationRoute() {
        return {
          name: this.RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
          params: {
            channelId: this.node.source_channel_id,
            nodeId: this.node.parent,
          },
          query: {
            nodeId: this.node.id,
          },
        };
      },
    },
    methods: {
      emitPreview() {
        this.$emit('preview');
      },
      kindToIcon: Constants.kindToIcon,
    },
    $trs: {
      showMoreLabel: 'Show more',
      showLessLabel: 'Show less',
      tagsList: 'Tags: {tags}',
      updatedLabel: 'Updated',
      goToSingleLocationAction: 'Go to location',
      goToPluralLocationsAction:
        'In {count, number} {count, plural, one {location} other {locations}}',
      previewAction: 'Preview',
      addToClipboardAction: 'Add to clipboard',
      resourcesCount: '{count, number} {count, plural, one {resource} other {resources}}',
    },
  };

</script>


<style lang="less" scoped>

  .show-more-btn {
    margin-left: -7px;
    text-decoration: underline;
    text-transform: none !important;
  }

  .arrow-icon {
    margin-bottom: -3px;
  }

</style>
