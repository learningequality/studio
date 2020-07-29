<template>

  <VCard @click="handleClick">
    <VCardTitle>
      <VLayout row wrap>
        <VFlex sm2 xs12 class="pt-4">
          <Thumbnail
            :src="node.thumbnail_src"
            :kind="node.kind"
            :showKind="false"
            :isEmpty="!node.resource_count"
          />
        </VFlex>

        <VFlex sm10 xs12>
          <VLayout align-center class="metadata">
            <span>
              <ContentNodeIcon small :kind="node.kind" includeText />
            </span>
            <span v-if="isTopic">
              {{ resourcesMsg }}
            </span>
            <span v-if="languageName">
              {{ languageName }}
            </span>
            <span v-if="node.coach_count">
              <Icon color="primary" class="mx-1" small>
                local_library
              </Icon>
              <template v-if="isTopic">
                {{ node.coach_count }}
              </template>
              <template v-else>
                {{ $tr('coach') }}
              </template>
            </span>
          </VLayout>
          <ActionLink
            :text="node.title"
            class="headline my-2 notranslate"
            @click="$emit('preview')"
          />
          <div
            v-if="node.description"
            class="notranslate"
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
            @click.stop="showWholeDescription = !showWholeDescription"
          >
            <span>
              {{ showWholeDescription ? $tr('showLessLabel') : $tr('showMoreLabel') }}
              <Icon class="arrow-icon">
                {{ showWholeDescription ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}
              </Icon>
            </span>
          </VBtn>
        </VFLex>
      </VLayout>
    </VCardTitle>

    <VCardActions class="px-3">
      <VSpacer />
      <ActionLink
        v-if="inSearch"
        target="_blank"
        :href="openLocationUrl"
        :text="goToLocationLabel"
      />
      <IconButton
        :text="$tr('addToClipboardAction')"
        icon="content_paste"
        @click="$emit('copy_to_clipboard')"
      />
    </VCardActions>
  </VCard>

</template>


<script>

  import get from 'lodash/get';
  import IconButton from 'shared/views/IconButton';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

  export default {
    name: 'BrowsingCard',
    inject: ['RouterNames'],
    components: {
      ContentNodeIcon,
      IconButton,
      Thumbnail,
    },
    mixins: [constantsTranslationMixin],
    props: {
      node: {
        type: Object,
        required: true,
      },
      ancestorIsSelected: {
        type: Boolean,
        default: false,
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
            channelId: this.inSearch ? this.node.channel_id : this.$route.params.channelId,
          },
        };
      },
      openLocationUrl() {
        const baseUrl = window.Urls.channel(this.node.channel_id);
        if (this.isTopic) {
          return `${baseUrl}#/${this.node.id}`;
        }
        return `${baseUrl}#/${this.node.parent_id}/${this.node.id}`;
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
        return this.node.location_ids.length;
      },
      goToLocationLabel() {
        return this.numLocations > 1
          ? this.$tr('goToPluralLocationsAction', { count: this.numLocations })
          : this.$tr('goToSingleLocationAction');
      },
      isTopic() {
        return this.node.kind === ContentKindsNames.TOPIC;
      },
    },
    methods: {
      handleClick() {
        // Navigate to topic on browse mode
        // Otherwise, emit a click event
        if (!this.inSearch && this.isTopic) {
          this.$router.push(this.topicRoute);
        } else if (!this.ancestorIsSelected) {
          this.$emit('click');
        }
      },
    },
    $trs: {
      showMoreLabel: 'Show more',
      showLessLabel: 'Show less',
      tagsList: 'Tags: {tags}',
      goToSingleLocationAction: 'Go to location',
      goToPluralLocationsAction:
        'In {count, number} {count, plural, one {location} other {locations}}',
      addToClipboardAction: 'Copy to clipboard',
      resourcesCount: '{count, number} {count, plural, one {resource} other {resources}}',
      coach: 'Coach',

      // Copy strings
      undo: 'Undo',
      cancel: 'Cancel',
      copyingToClipboard: 'Copying to clipboard...',
      copiedToClipboard: 'Copied to clipboard',
      copyFailed: 'Failed to copy to clipboard',
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

  .metadata {
    color: var(--v-grey-darken2);
    span:not(:last-child)::after {
      margin: 0 8px;
      color: var(--v-grey-base);
      content: '•';
    }
  }
  .v-card {
    cursor: pointer;
    &:hover {
      background-color: var(--v-greyBackground-base);
    }
  }

</style>
