<template>

  <VHover  :disabled="copying">
    <template #default="{ hover }">
      <ContextMenuCloak :disabled="contextMenuDisabled">
        <template #default="contextMenuProps">
          <DraggableHandle :draggable="canEdit && !copying" v-bind="draggableHandle">
            <template #default="draggableProps">
              <VListTile
                v-if="node"
                class="content-list-item pa-0"
                :class="{
                  'compact': isCompact,
                  hover: hover && !copying,
                  active: (active || hover) && !copying,
                  disabled: copying,
                }"
                data-test="content-item"
                @click="handleTileClick"
              >
                <div v-if="copying" class="disabled-overlay"></div>
                <slot name="actions-start" :hover="hover" class="actions-start-col"></slot>
                <div
                  class="thumbnail-col mx-2"
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
                  class="description-col pa-2 grow"
                  :class="{
                    'my-4': !isCompact,
                    'my-2': isCompact,
                  }"
                >
                  <VListTileTitle data-test="title">
                    <VLayout row>
                      <VFlex shrink class="text-truncate">
                        <h3
                          v-if="hasTitle(node) || !canEdit || copying"
                          class="notranslate text-truncate"
                          :class="[
                            isCompact? 'font-weight-regular': '',
                            getTitleClass(node),
                          ]"
                        >
                          {{ getTitle(node) }}
                        </h3>
                      </VFlex>
                      <VFlex>
                        <ContentNodeValidator v-if="canEdit && !copying" :node="node" />
                      </VFlex>
                    </VLayout>
                  </VListTileTitle>
                  <VListTileSubTitle
                    v-if="(subtitle || node.coach_content) && !isCompact"
                    data-test="subtitle"
                    class="metadata"
                  >
                    <span>{{ subtitle }}</span>
                    <span v-if="isTopic? node.coach_content : isCoach">
                      <VTooltip bottom>
                        <template #activator="{ on }">
                          <div style="display: inline-block;" v-on="on">
                            <Icon
                              color="primary"
                              small
                              local_library
                              class="mx-1"
                              style="vertical-align: text-top;"
                            />
                            <template v-if="isTopic">
                              {{ $formatNumber(node.coach_count) }}
                            </template>
                          </div>
                        </template>
                        <span>
                          {{ isTopic?
                            $tr('hasCoachTooltip', {value: node.coach_count}) : $tr('coachTooltip')
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
                  />
                </VListTileContent>

                <VListTileContent class="actions-end-col updated">
                  <ContentNodeChangedIcon v-if="canEdit && !copying" :node="node" />
                </VListTileContent>
                <VListTileAction class="actions-end-col">
                  <IconButton
                    v-if="isTopic"
                    :aria-hidden="hover"
                    data-test="btn-chevron"
                    icon="chevronRight"
                    rtl-flip
                    :text="$tr('openTopic')"
                  />
                </VListTileAction>
                <slot name="actions-end" :hover="hover"></slot>
                <TaskProgress v-if="copying" class="copying progress-loader" :taskId="taskId" />
              </VListTile>
            </template>
          </DraggableHandle>
        </template>
      </ContextMenuCloak>
    </template>
  </VHover>

</template>


<script>

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
        default: () => ({}),
      },
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
    methods: {
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
    margin: auto 2px;
    cursor: progress;
  }

  .progress-loader {
    z-index: 2;
  }

  /deep/ .v-list__tile {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: nowrap;
    align-items: flex-start;
    height: auto !important;
    padding-left: 0;

    &__action,
    .updated {
      width: 36px;
      min-width: 0;
      padding-top: 48px;
      .compact & {
        padding-top: 16px;
        .button {
          margin-top: -8px;
        }
      }
    }

    &__action {
      opacity: 0;
      transition: opacity ease 0.3s;

      .content-list-item.hover & {
        opacity: 1;
      }
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
  .metadata span:not(:last-child)::after {
    content: ' • ';
  }

</style>
