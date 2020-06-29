<template>

  <VHover>
    <VListTile
      slot-scope="{ hover }"
      class="content-item py-2"
      :class="{hover, selected}"
      :style="{'padding-left': indentPadding}"
    >
      <VListTileAction class="action-col">
        <Checkbox
          ref="checkbox"
          class="mt-0 pt-0"
          :value="selected"
          :indeterminate="indeterminate"
          @click.stop.prevent="goNextSelectionState"
        />
      </VListTileAction>
      <div
        class="thumbnail-col py-2"
      >
        <Thumbnail
          v-bind="thumbnailAttrs"
          :isEmpty="contentNode.resource_count === 0"
          compact
        />
      </div>

      <slot>
        <VListTileContent class="description-col pa-2" @click="goNextSelectionState">
          <VListTileTitle class="text-truncate notranslate">
            {{ contentNode.title }}
          </VListTileTitle>
        </VListTileContent>
      </slot>

      <VListTileAction class="action-col option-col" :aria-hidden="!hover">
        <VMenu offset-y left>
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

          <ContentNodeOptions :nodeId="nodeId" :sourceId="sourceId" />
        </VMenu>
      </VListTileAction>
    </VListTile>
  </VHover>

</template>
<script>

  import ContentNodeOptions from '../ContentNodeOptions';
  import clipboardMixin from './mixins';
  import Checkbox from 'shared/views/form/Checkbox';
  import Thumbnail from 'shared/views/files/Thumbnail';

  export default {
    name: 'ContentNode',
    components: {
      Checkbox,
      ContentNodeOptions,
      Thumbnail,
    },
    mixins: [clipboardMixin],
    props: {
      sourceId: {
        type: String,
        required: true,
      },
    },
    computed: {
      thumbnailAttrs() {
        const { title, kind, thumbnail_src: src, thumbnail_encoding: encoding } = this.contentNode;
        return { title, kind, src, encoding };
      },
    },
    $trs: {},
  };

</script>
<style lang="less" scoped>

  .content-item,
  .v-list__tile {
    width: 100%;
    max-width: 100%;
    cursor: pointer;
    transition: background-color ease 0.3s;
  }

  .content-item:hover {
    background: #eeeeee;
  }

  /deep/ .action-col,
  .thumbnail-col {
    flex-shrink: 0;
    min-width: 24px;
  }

  .option-col {
    opacity: 0;
    transition: opacity ease 0.3s;

    .content-item.selected &,
    .content-item.hover & {
      opacity: 1;
    }
  }

  /deep/ .v-list__tile {
    padding-left: 11px;
  }

  /deep/ .v-list__tile__title {
    height: auto;
  }

  /deep/ .text-truncate {
    /* fix clipping of dangling characters */
    line-height: 1.3 !important;
  }

</style>
