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
                  'compact': isCompact,
                  hover: hover && !copying,
                  active: (active || hover) && !copying,
                  disabled: copying,
                  highlight,
                }"
                data-test="content-item"
                @click="handleTileClick"
              >
                <slot name="actions-start" :hover="hover" class="actions-start-col"></slot>
                <div
                  class="mx-2 thumbnail-col"
                  :class="{
                    'px-2': !isCompact,
                    'py-4': !isCompact,
                    'py-3': isCompact,
                  }"
                >
                  <Thumbnail
                    v-bind="thumbnailAttrs"
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
                      <VFlex shrink class="text-truncate">
                        <h3
                          v-if="hasTitle(node) || !canEdit || copying || node.isNew"
                          class="notranslate text-truncate"
                          :class="[
                            isCompact ? 'font-weight-regular' : '',
                            getTitleClass(node),
                          ]"
                          dir="auto"
                        >
                          {{ getTitle(node) }}
                        </h3>
                      </VFlex>
                      <VFlex>
                        <ContentNodeValidator
                          v-if="canEdit && !copying && !node.isNew"
                          :node="node"
                        />
                      </VFlex>
                    </VLayout>
                  </VListTileTitle>
                  <VListTileSubTitle
                    v-if="(subtitle || node.coach_content) && !isCompact"
                    data-test="subtitle"
                    class="metadata"
                  >
                    <span>{{ subtitle }}</span>
                    <span v-if="(isTopic && node.coach_count) || isCoach">
                      <VTooltip bottom>
                        <template #activator="{ on }">
                          <div style="display: inline-block;" v-on="on">
                            <Icon
                              color="primary"
                              small
                              class="mx-1"
                              style="vertical-align: text-top;"
                            >local_library</Icon>
                            <span v-if="isTopic">
                              {{ $formatNumber(node.coach_count) }}
                            </span>
                          </div>
                        </template>
                        <span>
                          {{ isTopic ?
                            $tr('hasCoachTooltip', { value: node.coach_count })
                            : $tr('coachTooltip')
                          }}
                        </span>
                      </VTooltip>
                    </span>
                  </VListTileSubTitle>
                  <ToggleText
                    v-show="!isCompact && !comfortable"
                    :text="node.description"
                    data-test="description"
                    notranslate
                    dir="auto"
                  />
                </VListTileContent>

                <VListTileContent class="actions-end-col updated">
                  <ContentNodeChangedIcon v-if="canEdit && !copying" :node="node" />
                </VListTileContent>
                <template v-if="!copying">
                  <VListTileAction class="actions-end-col">
                    <IconButton
                      v-if="isTopic"
                      :aria-hidden="hover"
                      data-test="btn-chevron"
                      icon="chevronRight"
                      :text="$tr('openTopic')"
                      size="small"
                      @click="$emit('topicChevronClick')"
                    />
                  </VListTileAction>
                  <slot name="actions-end" :hover="hover"></slot>
                </template>
                <template v-else>
                  <div class="copying">
                    <p class="caption grey--text pr-2 pt-1">
                      {{ $tr("copyingTask") }}
                    </p>
                    <TaskProgress :taskId="taskId" size="30" />
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

  import { mapActions } from 'vuex';
  import ContentNodeValidator from '../ContentNodeValidator';
  import ContentNodeChangedIcon from '../ContentNodeChangedIcon';
  import TaskProgress from '../../views/progress/TaskProgress';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { RolesNames } from 'shared/leUtils/Roles';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import IconButton from 'shared/views/IconButton';
  import ToggleText from 'shared/views/ToggleText';
  import ContextMenuCloak from 'shared/views/ContextMenuCloak';
  import DraggableHandle from 'shared/views/draggable/DraggableHandle';
  import { titleMixin } from 'shared/mixins';
  import { COPYING_FLAG, TASK_ID } from 'shared/data/constants';
  import { EffectAllowed } from 'shared/mixins/draggable/constants';

  export default {
    name: 'ContentNodeListItem',
    components: {
      DraggableHandle,
      ContextMenuCloak,
      Thumbnail,
      IconButton,
      ContentNodeValidator,
      ContentNodeChangedIcon,
      ToggleText,
      TaskProgress,
    },
    mixins: [titleMixin],
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
      isCompact() {
        return this.compact || !this.$vuetify.breakpoint.mdAndUp;
      },
      isTopic() {
        return this.node.kind === ContentKindsNames.TOPIC;
      },
      thumbnailAttrs() {
        const { title, kind, thumbnail_src: src, thumbnail_encoding: encoding } = this.node;
        return { title, kind, src, encoding };
      },
      subtitle() {
        switch (this.node.kind) {
          case ContentKindsNames.TOPIC:
            return this.$tr('resources', {
              value: this.node.resource_count || 0,
            });
          case ContentKindsNames.EXERCISE:
            return this.$tr('questions', {
              value: this.node.assessment_item_count || 0,
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
        return this.node[COPYING_FLAG];
      },
      taskId() {
        return this.node[TASK_ID];
      },
    },
    watch: {
      copying(isCopying, wasCopying) {
        if (wasCopying && !isCopying) {
          this.highlight = true;
          this.deleteTask({ task_id: this.taskId });
          setTimeout(() => {
            this.highlight = false;
          }, 2500);
        }
      },
    },
    methods: {
      ...mapActions('task', ['deleteTask']),
      handleTileClick(e) {
        // Ensures that clicking an icon button is not treated the same as clicking the card
        if (e.target.tagName !== 'svg' && !this.copying) {
          this.isTopic ? this.$emit('topicChevronClick') : this.$emit('infoClick');
        }
      },
    },
    $trs: {
      resources: '{value, number, integer} {value, plural, one {resource} other {resources}}',
      questions: '{value, number, integer} {value, plural, one {question} other {questions}}',
      openTopic: 'Open topic',
      hasCoachTooltip:
        '{value, number, integer} {value, plural, one {resource for coaches} other {resources for coaches}}',
      coachTooltip: 'Resource for coaches',
      copyingTask: 'Copying',
    },
  };

</script>


<style lang="less" scoped>

  @thumbnail-width: 16%;
  @compact-thumbnail-width: ~'20px + 0.5%';

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
    padding-top: 44px;
    cursor: progress;
    p,
    div {
      margin: 0 2px;
    }
    .compact & {
      padding-top: 12px;
    }
  }

  /deep/ .v-list__tile {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: nowrap;
    align-items: flex-start;
    height: auto !important;
    padding-left: 0;
    transition: background-color ease 500ms;

    .highlight & {
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
    width: @thumbnail-width;
    min-width: 70px;
    max-width: 160px;

    .compact & {
      width: calc(@compact-thumbnail-width);
      min-width: 20px;
    }
  }

  .description-col {
    width: calc(100% - @thumbnail-width - 206px);
    word-break: break-word;

    .compact & {
      width: calc(100% - @compact-thumbnail-width - 206px);
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

</style>
