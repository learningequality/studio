<template>

  <VHover>
    <VListTile
      v-if="node"
      slot-scope="{ hover }"
      class="content-list-item pa-0"
      :class="{
        'compact': isCompact,
        hover,
        active: active || hover,
      }"
      data-test="content-item"
      @click="handleTileClick"
    >
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
              <h3 :class="{'font-weight-regular': isCompact}" class="notranslate text-truncate">
                {{ node.title }}
              </h3>
            </VFlex>
            <VFlex>
              <ContentNodeValidator :node="node" />
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
            <Icon color="primary" small>local_library</Icon>
            <span v-if="isTopic">
              {{ $formatNumber(node.coach_content) }}
            </span>
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
        <ContentNodeChangedIcon v-if="canEdit" :node="node" />
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
    </VListTile>
  </VHover>

</template>


<script>

  import ContentNodeValidator from '../ContentNodeValidator';
  import ContentNodeChangedIcon from '../ContentNodeChangedIcon';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { RolesNames } from 'shared/leUtils/Roles';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import IconButton from 'shared/views/IconButton';
  import ToggleText from 'shared/views/ToggleText';

  export default {
    name: 'ContentNodeListItem',
    components: {
      Thumbnail,
      IconButton,
      ContentNodeValidator,
      ContentNodeChangedIcon,
      ToggleText,
    },
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
    },
    methods: {
      handleTileClick(e) {
        // Ensures that clicking an icon button is not treated the same as clicking the card
        if (e.target.tagName !== 'svg') {
          this.isTopic ? this.$emit('topicChevronClick') : this.$emit('infoClick');
        }
      },
    },
    $trs: {
      resources: '{value, number, integer} {value, plural, one {resource} other {resources}}',
      questions: '{value, number, integer} {value, plural, one {question} other {questions}}',
      openTopic: 'Open topic',
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
