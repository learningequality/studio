<template>

  <VCard @click="handleClick">
    <VCardTitle>
      <VLayout row wrap>
        <VFlex lg2 md4 sm5 xs12 class="pt-2 px-4">
          <Thumbnail
            :src="node.thumbnail_src"
            :kind="node.kind"
            :isEmpty="!node.resource_count"
          />
        </VFlex>

        <VFlex lg10 md8 sm7 xs12 class="px-4">
          <h3
            class="font-weight-bold mt-2 text-truncate title"
            :class="getTitleClass(node)"
            dir="auto"
          >
            {{ getTitle(node) }}
          </h3>
          <!-- Metadata -->
          <div class="grey--text metadata my-2">
            <span v-if="isTopic">
              {{ resourcesMsg }}
            </span>
            <span v-if="languageName">
              {{ languageName }}
            </span>
            <span v-if="node.coach_count || isCoach">
              <VTooltip bottom>
                <template #activator="{ on }">
                  <div class="my-1" style="display: inline-block;" v-on="on">
                    <Icon
                      color="roleVisibilityCoach"
                      small
                      style="vertical-align: text-top;"
                      class="mx-1"
                    >
                      local_library
                    </Icon>
                    <template v-if="isTopic">
                      {{ $formatNumber(node.coach_count) }}
                    </template>
                  </div>
                </template>
                <span>
                  {{ isTopic ?
                    $tr('hasCoachTooltip', { value: node.coach_count }) : $tr('coach')
                  }}
                </span>
              </VTooltip>
            </span>
          </div>
          <ToggleText
            v-if="node.description"
            :text="node.description"
            :splitAt="250"
            notranslate
            dir="auto"
          />

          <div v-if="tagsString">
            {{ $tr('tagsList', { tags: tagsString }) }}
          </div>
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
        :text="$tr('previewAction')"
        icon="info"
        :color="$themeTokens.primary"
        @click.stop="$emit('preview')"
      />
      <IconButton
        :text="$tr('addToClipboardAction')"
        icon="clipboard"
        @click.stop="$emit('copy_to_clipboard')"
      />
    </VCardActions>
  </VCard>

</template>


<script>

  import IconButton from 'shared/views/IconButton';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import ToggleText from 'shared/views/ToggleText';
  import { constantsTranslationMixin, titleMixin } from 'shared/mixins';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { RolesNames } from 'shared/leUtils/Roles';

  export default {
    name: 'BrowsingCard',
    inject: ['RouteNames'],
    components: {
      IconButton,
      Thumbnail,
      ToggleText,
    },
    mixins: [constantsTranslationMixin, titleMixin],
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
          name: this.RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
          params: {
            nodeId: this.node.id,
            channelId: this.inSearch ? this.node.channel_id : this.$route.params.channelId,
          },
          query: this.$route.query,
        };
      },
      openLocationUrl() {
        const baseUrl = window.Urls.channel(this.node.channel_id);
        if (this.isTopic) {
          return `${baseUrl}#/${this.node.id}`;
        }
        return `${baseUrl}#/${this.node.parent}/${this.node.id}`;
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
      isCoach() {
        return this.node.role_visibility === RolesNames.COACH;
      },
    },
    methods: {
      handleClick() {
        // Navigate to topic on browse mode
        // Otherwise, emit a click event
        if (!this.inSearch && this.isTopic) {
          this.$router.push(this.topicRoute);
        } else {
          this.$emit('preview');
        }
      },
    },
    $trs: {
      tagsList: 'Tags: {tags}',
      goToSingleLocationAction: 'Go to location',
      goToPluralLocationsAction:
        'In {count, number} {count, plural, one {location} other {locations}}',
      addToClipboardAction: 'Copy to clipboard',
      resourcesCount: '{count, number} {count, plural, one {resource} other {resources}}',
      coach: 'Resource for coaches',
      hasCoachTooltip:
        '{value, number, integer} {value, plural, one {resource for coaches} other {resources for coaches}}',
      previewAction: 'View details',
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
  h3 {
    // Hack to resolve card resizing when title is too long
    width: 100px;
    min-width: 100%;
  }

  .v-card__title {
    /* removes default non-top padding to improve spacing */
    padding: 16px 0 0;
  }

  .card-header {
    /* same as channel listing titles */
    font-size: 18px;
  }

</style>
