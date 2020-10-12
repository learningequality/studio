<template>

  <VCard @click="handleClick">
    <VCardTitle>
      <VLayout row wrap>
        <VFlex sm2 xs12 class="pt-4 px-4">
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
            <span v-if="node.coach_count || isCoach">
              <VTooltip bottom>
                <template #activator="{ on }">
                  <div class="my-1" v-on="on">
                    <Icon color="primary" small style="vertical-align: text-top;" class="mx-1">
                      local_library
                    </Icon>
                    <template v-if="isTopic">
                      {{ $formatNumber(node.coach_count) }}
                    </template>
                  </div>
                </template>
                <span>
                  {{ isTopic?
                    $tr('hasCoachTooltip', {value: node.coach_count}) : $tr('coach')
                  }}
                </span>
              </VTooltip>
            </span>
          </VLayout>
          <h3 class="text-truncate my-2">
            <a class="headline notranslate" @click.stop="$emit('preview')">
              {{ node.title }}
            </a>
          </h3>
          <ToggleText
            v-if="node.description"
            :text="node.description"
            notranslate
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
        :text="$tr('addToClipboardAction')"
        icon="clipboard"
        @click="$emit('copy_to_clipboard')"
      />
    </VCardActions>
  </VCard>

</template>


<script>

  import IconButton from 'shared/views/IconButton';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import ToggleText from 'shared/views/ToggleText';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { RolesNames } from 'shared/leUtils/Roles';

  export default {
    name: 'BrowsingCard',
    inject: ['RouterNames'],
    components: {
      ContentNodeIcon,
      IconButton,
      Thumbnail,
      ToggleText,
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
        } else if (!this.ancestorIsSelected) {
          this.$emit('click');
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
        '{value, number, integer} {value, plural, one {resourece for coaches} other {resources for coaches}}',
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
    a {
      text-decoration: underline;
    }
  }

</style>
