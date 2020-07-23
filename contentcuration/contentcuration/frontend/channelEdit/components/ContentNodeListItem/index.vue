<template>

  <VHover>
    <VListTile
      v-if="node"
      slot-scope="{ hover }"
      class="content-list-item pa-0"
      :class="{
        'compact': isCompact,
        'py-4': !isCompact,
        'py-2': isCompact,
        hover,
        active: active || hover,
      }"
    >
      <slot name="actions-start" :hover="hover" class="actions-start-col"></slot>

      <div
        class="thumbnail-col py-2 ml-2"
        :class="{
          'px-2': !isCompact,
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
          'mt-1': !isCompact
        }"
      >
        <VListTileTitle data-test="title">
          <h3
            class="text-truncate notranslate"
            :class="{'font-weight-regular': isCompact}"
          >
            {{ node.title }}
          </h3>
        </VListTileTitle>
        <VListTileSubTitle
          v-if="subtitle && !isCompact"
          data-test="subtitle"
        >
          {{ subtitle }}
        </VListTileSubTitle>
        <p
          v-show="!isCompact"
          data-test="description"
        >
          {{ node.description }}
        </p>
      </VListTileContent>

      <div class="actions-end-col">
        <VListTileAction :aria-hidden="!hover">
          <VBtn
            flat
            icon
            class="ma-0"
            data-test="btn-info"
            @click.stop.prevent="$emit('infoClick')"
          >
            <Icon color="primary">
              info
            </Icon>
          </VBtn>
        </VListTileAction>
        <VListTileAction v-if="isTopic" :aria-hidden="!hover">
          <VBtn
            flat
            icon
            class="ma-0"
            data-test="btn-chevron"
            @click.stop.prevent="$emit('topicChevronClick')"
          >
            <Icon medium>
              chevron_right
            </Icon>
          </VBtn>
        </VListTileAction>

        <slot name="actions-end" :hover="hover"></slot>
      </div>
    </VListTile>
  </VHover>

</template>


<script>

  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import Thumbnail from 'shared/views/files/Thumbnail';

  export default {
    name: 'ContentNodeListItem',
    components: {
      Thumbnail,
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
      active: {
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
              value: this.node.resource_count,
            });
          case ContentKindsNames.EXERCISE:
            return this.$tr('questions', {
              value: this.node.assessment_items ? this.node.assessment_items.length : 0,
            });
        }

        return null;
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

  /deep/ .v-list__tile {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: nowrap;
    height: auto !important;
    padding-left: 0;

    &__action {
      width: 36px;
      min-width: 0;
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

  .actions-start-col,
  .actions-end-col {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: center;
  }

</style>
