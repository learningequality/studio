<template>

  <VHover :disabled="copying">
    <template #default="{ hover }">
      <ContextMenuCloak :disabled="contextMenuDisabled">
        <template #default="contextMenuProps">
          <DraggableHandle v-bind="draggableHandle">
            <template #default>
              <VListTile
                v-if="node"
                class="content-list-item pa-0"
                :class="{
                  compact: isCompact,
                  hover: hover && !copying,
                  active: (active || hover) && !copying,
                  disabled: copying,
                  highlight,
                }"
                data-test="content-item"
                @click="handleTileClick"
              >
                <slot
                  name="actions-start"
                  :hover="hover"
                  class="actions-start-col"
                ></slot>
                <div
                  class="mx-2 thumbnail-col"
                  :class="{
                    'px-2': !isCompact,
                    'py-4': !isCompact,
                    'py-3': isCompact,
                  }"
                >
                  <ImageOnlyThumbnail
                    v-bind="thumbnailAttrs"
                    :isTopic="isTopic"
                    :learningActivities="node.learning_activities"
                    :compact="isCompact"
                    :isEmpty="node.total_count === 0"
                  />
                </div>
                <VListTileContent
                  class="description-col grow px-2"
                  :class="{
                    'my-4': !isCompact,
                    'my-3': isCompact,
                  }"
                >
                  <VListTileTitle data-test="title">
                    <VLayout row>
                      <VFlex
                        shrink
                        class="text-truncate"
                      >
                        <h3
                          v-if="hasTitle(node) || !canEdit || copying || isNew"
                          class="notranslate text-truncate"
                          :class="[isCompact ? 'font-weight-regular' : '', getTitleClass(node)]"
                          dir="auto"
                        >
                          {{ getTitle(node) }}
                        </h3>
                      </VFlex>
                      <VFlex
                        v-if="!isTopic && isCoach"
                        class="px-1"
                      >
                        <Icon
                          icon="coachContent"
                          style="vertical-align: middle"
                        />
                      </VFlex>
                      <VFlex>
                        <ContentNodeValidator
                          v-if="canEdit && !copying && !isNew"
                          :node="node"
                        />
                      </VFlex>
                    </VLayout>
                  </VListTileTitle>

                  <ToggleText
                    v-show="!isCompact && !comfortable"
                    :text="node.description"
                    data-test="description"
                    notranslate
                    dir="auto"
                    :splitAt="280"
                  />

                  <VListTileSubTitle
                    v-if="!isCompact"
                    data-test="subtitle"
                    class="metadata"
                  >
                    <span
                      v-if="subtitle"
                      class="text"
                    >{{ subtitle }}</span>
                    <span
                      v-if="node.categories ? Object.keys(node.categories).length > 0 : null"
                      class="text"
                    >
                      {{ category(node.categories) }}
                    </span>
                    <span v-if="isTopic && node.coach_count">
                      <!-- for each learning activity -->
                      <VTooltip
                        bottom
                        lazy
                      >
                        <template #activator="{ on }">
                          <div
                            style="display: inline-block"
                            v-on="on"
                          >
                            <Icon
                              icon="coachContent"
                              class="mx-1"
                              style="vertical-align: sub"
                            />
                            <span v-if="isTopic">
                              {{ $formatNumber(node.coach_count) }}
                            </span>
                          </div>
                        </template>
                        <span>
                          {{
                            isTopic
                              ? $tr('hasCoachTooltip', { value: node.coach_count })
                              : $tr('coachTooltip')
                          }}
                        </span>
                      </VTooltip>
                    </span>
                  </VListTileSubTitle>
                  <span v-if="!isCompact">
                    <ContentNodeLearningActivityIcon
                      v-if="!isTopic"
                      :learningActivities="node.learning_activities"
                      showEachActivityIcon
                      includeText
                      small
                      chip
                      class="inline"
                    />
                    <span v-if="node.grade_levels">
                      <span
                        v-for="(key, index) in Object.keys(node.grade_levels)"
                        :key="index"
                        class="small-chip"
                        :style="{ backgroundColor: $themeTokens.fineLine }"
                      >
                        {{ levels(key) }}
                      </span>
                    </span>
                  </span>
                </VListTileContent>

                <VListTileContent class="actions-end-col updated">
                  <ContentNodeChangedIcon
                    v-if="canEdit && !copying"
                    :node="node"
                  />
                </VListTileContent>
                <template v-if="!copying">
                  <VListTileAction class="actions-end-col">
                    <KIconButton
                      v-if="isTopic"
                      :aria-hidden="hover"
                      data-test="btn-chevron"
                      icon="chevronRight"
                      :tooltip="$tr('openTopic')"
                      size="small"
                      @click="$emit('topicChevronClick')"
                    />
                  </VListTileAction>
                  <slot
                    name="actions-end"
                    :hover="hover"
                  ></slot>
                </template>
                <template v-else>
                  <div class="copying">
                    <p class="caption pr-3">
                      <span
                        class="grey--text"
                        :style="{ cursor: hasCopyingErrored ? 'default' : 'progress' }"
                      >
                        {{ copyingMessage }}
                      </span>
                      <slot name="copy-fail-retry-action"></slot>
                    </p>
                    <ContentNodeCopyTaskProgress
                      :node="node"
                      size="30"
                    />
                    <slot name="copy-fail-remove-action"></slot>
                  </div>
                  <div class="disabled-overlay"></div>
                </template>
                <slot
                  name="context-menu"
                  v-bind="contextMenuProps"
                ></slot>
              </VListTile>
            </template>
          </DraggableHandle>
        </template>
      </ContextMenuCloak>
    </template>
  </VHover>

</template>


<script>

  import { mapGetters } from 'vuex';
  import camelCase from 'lodash/camelCase';
  import ContentNodeCopyTaskProgress from '../../views/progress/ContentNodeCopyTaskProgress';
  import ContentNodeChangedIcon from '../ContentNodeChangedIcon';
  import ContentNodeValidator from '../ContentNodeValidator';
  import { ContentLevels, Categories, NEW_OBJECT } from 'shared/constants';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { RolesNames } from 'shared/leUtils/Roles';
  import ImageOnlyThumbnail from 'shared/views/files/ImageOnlyThumbnail';
  import ToggleText from 'shared/views/ToggleText';
  import ContextMenuCloak from 'shared/views/ContextMenuCloak';
  import DraggableHandle from 'shared/views/draggable/DraggableHandle';
  import { titleMixin, metadataTranslationMixin } from 'shared/mixins';
  import { EffectAllowed } from 'shared/mixins/draggable/constants';
  import ContentNodeLearningActivityIcon from 'shared/views/ContentNodeLearningActivityIcon';

  export default {
    name: 'ContentNodeListItem',
    components: {
      DraggableHandle,
      ContextMenuCloak,
      ImageOnlyThumbnail,
      ContentNodeValidator,
      ContentNodeChangedIcon,
      ToggleText,
      ContentNodeCopyTaskProgress,
      ContentNodeLearningActivityIcon,
    },
    mixins: [titleMixin, metadataTranslationMixin],
    props: {
      node: {
        type: Object,
        required: true,
      },
      compact: {
        type: Boolean,
        default: false,
      },
      comfortable: {
        type: Boolean,
        default: false,
      },
      active: {
        type: Boolean,
        default: false,
      },
      canEdit: {
        type: Boolean,
        default: false,
      },
      draggableHandle: {
        type: Object,
        default: () => ({
          draggable: false,
          effectAllowed: EffectAllowed.NONE,
        }),
      },
    },
    data() {
      return {
        highlight: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', [
        'isNodeInCopyingState',
        'hasNodeCopyingErrored',
        'getContentNodesCount',
      ]),
      isCompact() {
        return this.compact || !this.$vuetify.breakpoint.mdAndUp;
      },
      isTopic() {
        return this.node.kind === ContentKindsNames.TOPIC;
      },
      isNew() {
        return this.node[NEW_OBJECT];
      },
      thumbnailAttrs() {
        const { title, kind, thumbnail_src: src, thumbnail_encoding: encoding } = this.node;
        return { title, kind, src, encoding };
      },
      subtitle() {
        const count = this.getContentNodesCount(this.node.id);
        switch (this.node.kind) {
          case ContentKindsNames.TOPIC:
            return this.$tr('resources', {
              value: count?.resource_count || 0,
            });
          case ContentKindsNames.EXERCISE:
            return this.$tr('questions', {
              value: count?.assessment_item_count || 0,
            });
        }

        return null;
      },
      isCoach() {
        return this.node.role_visibility === RolesNames.COACH;
      },
      contextMenuDisabled() {
        return !this.$scopedSlots['context-menu'] || this.copying;
      },
      copying() {
        return this.isNodeInCopyingState(this.node.id);
      },
      hasCopyingErrored() {
        return this.hasNodeCopyingErrored(this.node.id);
      },
      copyingMessage() {
        if (this.hasCopyingErrored) {
          return this.$tr('copyingError');
        } else {
          return this.$tr('copyingTask');
        }
      },
    },
    watch: {
      copying(isCopying, wasCopying) {
        if (wasCopying && !isCopying) {
          this.highlight = true;
          setTimeout(() => {
            this.highlight = false;
          }, 2500);
        }
      },
    },
    methods: {
      handleTileClick(e) {
        // Ensures that clicking an icon button is not treated the same as clicking the card
        if (e.target && e.target.tagName !== 'svg' && !this.copying) {
          this.isTopic ? this.$emit('topicChevronClick') : this.$emit('infoClick');
        }
      },
      metadataListText(ids) {
        // an array of values, rather than an internationalized list
        // is created here (unlike in ResourcePanel), because the values
        // are used to create one or more individual "chips" to display
        // rather than a string of text
        return ids.map(i => this.translateMetadataString(camelCase(i))).join(', ');
      },
      category(options) {
        const ids = Object.keys(options);
        const matches = Object.keys(Categories)
          .sort()
          .filter(k => ids.includes(Categories[k]));
        if (matches && matches.length > 0) {
          return this.metadataListText(matches);
        }
        return null;
      },
      levels(level) {
        let match = Object.keys(ContentLevels).find(key => ContentLevels[key] === level);
        if (match) {
          if (match === 'PROFESSIONAL') {
            match = 'specializedProfessionalTraining';
          } else if (match === 'WORK_SKILLS') {
            match = 'allLevelsWorkSkills';
          } else if (match === 'BASIC_SKILLS') {
            match = 'allLevelsBasicSkills';
          }
          return this.translateMetadataString(camelCase(match));
        }
        return null;
      },
    },
    $trs: {
      resources: '{value, number, integer} {value, plural, one {resource} other {resources}}',
      questions: '{value, number, integer} {value, plural, one {question} other {questions}}',
      openTopic: 'Open folder',
      hasCoachTooltip:
        '{value, number, integer} {value, plural, one {resource for coaches} other {resources for coaches}}',
      coachTooltip: 'Resource for coaches',
      copyingTask: 'Copying',
      copyingError: 'Copy failed.',
    },
  };

</script>


<style lang="scss" scoped>

  $thumbnail-width: 16%;
  $compact-thumbnail-width: calc(20px + 0.5%);

  .content-list-item {
    background: #ffffff;
    border-bottom: 1px solid #dddddd;

    &.active {
      background: #fafafa;
    }

    &.disabled {
      pointer-events: none;
    }
  }

  .inline {
    display: inline-block;
  }

  .text {
    display: inline-block;
    margin: 0;
    font-size: 12px;
  }

  .disabled-overlay {
    position: absolute;
    z-index: 1;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.5);
  }

  .copying {
    z-index: 2;
    display: flex;
    align-items: center;
    align-self: center;
    min-width: max-content;
    line-height: 1.6;
    pointer-events: auto;
    cursor: default;

    p,
    div {
      margin: 0;
    }
  }

  ::v-deep .v-list__tile {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: nowrap;
    align-items: flex-start;
    height: auto !important;
    padding-left: 0;
    transition: background-color ease 500ms;

    .highlight & {
      /* stylelint-disable-next-line custom-property-pattern */
      background-color: var(--v-greenHighlightBackground-base);
    }

    &__action,
    .updated {
      width: 36px;
      min-width: 0;
      padding-top: 48px;

      .button {
        margin-top: -3px;
      }

      .compact & {
        padding-top: 16px;
      }
    }

    .updated .v-icon {
      vertical-align: middle;
    }
  }

  .thumbnail-col {
    flex-shrink: 0;
    width: $thumbnail-width;
    min-width: 70px;
    max-width: 160px;

    .compact & {
      width: $compact-thumbnail-width;
      min-width: 20px;
    }
  }

  .description-col {
    flex-shrink: 1 !important;
    width: calc(100% - #{$thumbnail-width} - 206px);
    word-break: break-word;

    .compact & {
      width: calc(100% - #{$compact-thumbnail-width} - 206px);
    }
  }

  .actions-start-col,
  .actions-end-col {
    display: flex;
    flex: 1 1 auto;
    align-items: flex-start;
    justify-content: center;
  }

  .metadata > span:not(:last-child)::after {
    content: ' • ';
  }

  .small-chip {
    display: inline-block;
    padding: 2px 4px;
    margin: 2px;
    font-size: 10px;
    border-radius: 4px;
  }

</style>
