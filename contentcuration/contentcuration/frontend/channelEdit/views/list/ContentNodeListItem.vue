<template>

  <VHover>
    <VListTile
      slot-scope="{ hover }"
      class="content-list-item pa-0"
      :nodeId="nodeId"
      :class="[`${contentNode.kind}-kind`, {
        'compact': isCompact,
        'py-4': !isCompact,
        'py-2': isCompact,
        hover,
        active: active || hover,
      }]"
      :aria-selected="selected"
      @dblclick="$router.push(isTopic ? treeLink : infoLink)"
    >
      <VListTileAction class="handle-col" :aria-hidden="!hover">
        <transition name="fade">
          <VBtn flat icon class="ma-0">
            <Icon color="#686868">
              drag_indicator
            </Icon>
          </VBtn>
        </transition>
      </VListTileAction>
      <VListTileAction class="select-col mr-2">
        <Checkbox v-model="selected" class="mt-0 pt-0" />
      </VListTileAction>
      <div
        class="thumbnail-col py-2"
        :class="{
          'px-2': !isCompact,
        }"
      >
        <Thumbnail
          v-bind="thumbnailAttrs"
          :compact="isCompact"
          :isEmpty="contentNode.resource_count === 0"
        />
      </div>
      <VListTileContent
        class="description-col pa-2 grow"
        :class="{
          'mt-1': !isCompact
        }"
      >
        <VListTileTitle>
          <h3
            class="text-truncate"
            :class="{'font-weight-regular': isCompact}"
          >
            {{ contentNode.title }}
          </h3>
        </VListTileTitle>
        <VListTileSubTitle v-if="subtitle && !isCompact" class="subtitle">
          {{ subtitle }}
        </VListTileSubTitle>
        <p v-show="!isCompact">
          {{ contentNode.description }}
        </p>
      </VListTileContent>
      <VListTileAction class="option-col" :aria-hidden="!hover">
        <VBtn flat icon class="ma-0" :to="infoLink">
          <Icon color="primary">
            info
          </Icon>
        </VBtn>
      </VListTileAction>
      <VListTileAction v-if="isTopic" class="option-col" :aria-hidden="!hover">
        <VBtn flat icon class="ma-0" :to="treeLink">
          <Icon medium>
            chevron_right
          </Icon>
        </VBtn>
      </VListTileAction>
      <VListTileAction class="option-col" :aria-hidden="!active">
        <VMenu v-model="activated" offset-y left>
          <template #activator="{ on }">
            <VBtn
              small
              icon
              flat
              class="ma-0"
              v-on="on"
            >
              <Icon>more_horiz</Icon>
            </VBtn>
          </template>
          <ContentNodeOptions :nodeId="nodeId" />
        </VMenu>
      </VListTileAction>
    </VListTile>
  </VHover>

</template>


<script>

  import { mapGetters } from 'vuex';
  import ContentNodeOptions from '../ContentNodeOptions';
  import Checkbox from 'shared/views/form/Checkbox';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { RouterNames } from 'frontend/channelEdit/constants';

  export default {
    name: 'ContentNodeListItem',
    components: {
      Checkbox,
      ContentNodeOptions,
      Thumbnail,
    },
    mixins: [constantsTranslationMixin],
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      select: {
        type: Boolean,
        default: false,
      },
      compact: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        activated: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'getTreeNode']),
      selected: {
        get() {
          return this.select;
        },
        set(value) {
          this.$emit(value ? 'select' : 'deselect');
        },
      },
      active() {
        return this.selected || this.activated;
      },
      isCompact() {
        return this.compact || !this.$vuetify.breakpoint.mdAndUp;
      },
      contentNode() {
        return this.getContentNode(this.nodeId);
      },
      treeNode() {
        return this.getTreeNode(this.nodeId);
      },
      isTopic() {
        return this.contentNode.kind === 'topic';
      },
      thumbnailAttrs() {
        const { title, kind, thumbnail_src: src, thumbnail_encoding: encoding } = this.contentNode;
        return { title, kind, src, encoding };
      },
      subtitle() {
        switch (this.contentNode.kind) {
          case 'topic':
            return this.$tr('resources', {
              value: this.contentNode.resource_count,
            });
          case 'exercise':
            return this.$tr('questions', {
              value: this.contentNode.assessment_items.length,
            });
        }

        return null;
      },
      treeLink() {
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.nodeId,
          },
        };
      },
      infoLink() {
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.treeNode.parent,
            detailNodeId: this.nodeId,
          },
        };
      },
    },
    $trs: {
      resources: '{value, number, integer} {value, plural, one {resource} other {resources}}',
      questions: '{value, number, integer} {value, plural, one {question} other {questions}}',
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

  /deep/ .v-list__tile[nodeid] {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: nowrap;
    height: auto !important;
    padding-left: 0;
  }

  .v-list__tile__action {
    min-width: 0;
    transition: opacity ease 0.3s;

    &:not(.select-col) {
      opacity: 0;
    }

    .content-list-item.hover & {
      opacity: 1;
    }
  }

  .handle-col,
  .select-col {
    width: 24px;
  }

  .handle-col .v-btn {
    margin-left: -3px !important;
    cursor: grab;
  }

  .option-col {
    width: 36px;
  }

  /deep/ .v-input--selection-controls__input {
    margin-right: 0;
  }

  .content-list-item:not(.in-universe):hover {
    background: #fafafa;
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

    .compact & {
      width: calc(100% - @compact-thumbnail-width - 206px);
    }
  }

  .description-col .text-truncate {
    /* fix clipping of dangling characters */
    line-height: 1.3 !important;
  }

  .description-col p {
    max-height: 4.5em;
    overflow: hidden;
  }

</style>
