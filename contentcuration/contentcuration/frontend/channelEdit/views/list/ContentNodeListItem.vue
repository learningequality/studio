<template>

  <li
    class="content-list-item pa-0"
    :nodeId="nodeId"
    @dblclick="$router.push(isTopic ? treeLink : infoLink)"
    @mouseenter="active = true"
    @mouseover="active = true"
    @mouseleave="active = false"
  >
    <VLayout
      align-center
      class="inline-list"
      :class="[`${contentNode.kind}-kind`, {
        'compact': isCompact,
        'py-4': !isCompact,
        'py-2': isCompact,
      }]"
    >
      <div class="handle-col">
        <transition name="fade">
          <VBtn v-if="active" flat icon class="ma-0">
            <Icon color="#686868">
              drag_indicator
            </Icon>
          </VBtn>
        </transition>
      </div>
      <div class="select-col mr-2">
        <Checkbox v-model="checkboxSelected" class="mt-0 pt-0" />
      </div>
      <div
        class="thumbnail-col py-2"
        :class="{
          'px-2': !isCompact,
        }"
      >
        <figure
          class="thumbnail"
          :class="{
            [contentNode.kind]: isCompact,
            'icon': !showThumbnail,
            'icon-only': isCompact,
          }"
        >
          <VLayout
            v-show="showThumbnail"
            tag="figcaption"
            row
            align-center
            :class="contentNode.kind"
          >
            <VFlex shrink class="pr-1">
              <Icon
                v-if="showThumbnail"
                dark
                small
                :aria-label="kindTitle"
                v-text="icon"
              />
            </VFlex>
            <VFlex shrink>
              <span class="white--text caption">{{ kindTitle }}</span>
            </VFlex>
          </VLayout>
          <img
            v-if="showThumbnail"
            :src="contentNode.thumbnail_src"
            :alt="$tr('thumbnail', { title: contentNode.title })"
          >
          <svg
            v-else
            viewBox="0 0 24 24"
            :aria-label="kindTitle"
          >
            <text
              x="0"
              y="25"
              :fill="isCompact ? '#ffffff' : $vuetify.theme[contentNode.kind]"
              class="v-icon material-icons notranslate"
            >{{ icon }}</text>
          </svg>
        </figure>
      </div>
      <div
        class="description-col pa-2 grow"
        :class="{
          'mt-1': !isCompact
        }"
      >
        <h3
          class="text-truncate"
          :class="{'font-weight-regular': isCompact}"
        >
          {{ contentNode.title }}
        </h3>
        <span v-if="subtitle && !isCompact" class="subtitle">
          {{ subtitle }}
        </span>
        <p v-show="!isCompact">
          {{ contentNode.description }}
        </p>
      </div>
      <div class="option-col" :style="{ opacity }">
        <VBtn flat icon class="ma-0" :to="infoLink">
          <Icon color="primary">
            info
          </Icon>
        </VBtn>
      </div>
      <div v-if="isTopic" class="option-col" :style="{ opacity }">
        <VBtn flat icon class="ma-0" :to="treeLink">
          <Icon medium>
            chevron_right
          </Icon>
        </VBtn>
      </div>
      <div class="option-col" :style="{ opacity }">
        <VMenu offset-y left>
          <template #activator="{ on }">
            <VBtn small icon flat class="ma-0" v-on="on">
              <Icon>more_horiz</Icon>
            </VBtn>
          </template>
          <ContentNodeOptions :nodeId="nodeId" />
        </VMenu>
      </div>
    </VLayout>
  </li>

</template>


<script>

  import { mapGetters } from 'vuex';
  import ContentNodeOptions from '../ContentNodeOptions';
  import Checkbox from 'shared/views/form/Checkbox';
  import { CONTENT_KIND_ICONS } from 'shared/vuetify/icons';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { RouterNames } from 'frontend/channelEdit/constants';

  export default {
    name: 'ContentNodeListItem',
    components: {
      Checkbox,
      ContentNodeOptions,
    },
    mixins: [constantsTranslationMixin],
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      selected: {
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
        checkboxSelected: this.selected,
        active: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'getTreeNode']),
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
      showThumbnail() {
        return this.contentNode.thumbnail_src !== null && !this.isCompact;
      },
      icon() {
        let { kind } = this.contentNode;

        if (this.isTopic && this.contentNode.resource_count === 0) {
          kind = `${kind}_empty`;
        }

        return CONTENT_KIND_ICONS[kind];
      },
      kindTitle() {
        return this.translateConstant(this.contentNode.kind);
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
      opacity() {
        return this.active ? 1 : 0;
      },
    },
    watch: {
      checkboxSelected(selected) {
        this.$emit('selected', selected);
      },
    },
    methods: {},
    $trs: {
      thumbnail: '{title} thumbnail',
      resources: '{value, number, integer} {value, plural, one {resource} other {resources}}',
      questions: '{value, number, integer} {value, plural, one {question} other {questions}}',
    },
  };

</script>


<style lang="less" scoped>

  @thumbnail-width: 20%;
  @compact-thumbnail-width: ~'20px + 0.5%';
  @caption-height: 25px;

  .content-list-item {
    background: #ffffff;
    border-bottom: 1px solid #dddddd;
  }

  .inline-list {
    white-space: nowrap;

    > * {
      display: inline-block;
      white-space: normal;
      vertical-align: middle;
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

  .option-col {
    width: 36px;
    transition: opacity 0.3s ease;
  }

  .thumbnail {
    position: relative;
    /* stylelint-disable-next-line  */
    padding-bottom: 100% * 9 / 16;

    &.icon {
      padding-top: 25px;
    }

    .compact & {
      padding-top: 0;
      padding-bottom: 92%;
      margin: 0 auto;
      border-radius: 3px;
    }

    figcaption {
      width: 100%;
      height: @caption-height;
      padding: 0 5px;
      line-height: 11px;
    }

    img,
    svg {
      position: absolute;
      display: block;
    }

    img {
      bottom: 0;
      left: 0;
      width: 100%;
      height: calc(100% - @caption-height);
      object-fit: cover;
    }

    @svg-scale: 1.25;
    @svg-width: 100% * 9 / 16 / @svg-scale;
    @svg-top: (100% * 9 / 16 / 2) - (@svg-width / 2);
    svg {
      top: calc((@caption-height / 2) + @svg-top);
      left: 50% - (@svg-width / 2);
      width: @svg-width;
      margin: 0 auto;

      .compact & {
        top: 12%;
        left: 16%;
        display: block;
        width: 65%;
      }

      .compact.html5-kind &,
      .compact.exercise-kind &,
      .compact.audio-kind &,
      .compact.video-kind & {
        top: 18%;
        left: 21%;
        width: 55%;
      }

      text {
        font-size: 1.8em;
        line-height: 1.8em;
      }
    }
  }

  /deep/ .v-input--selection-controls__input {
    margin-right: 0;
  }

</style>
