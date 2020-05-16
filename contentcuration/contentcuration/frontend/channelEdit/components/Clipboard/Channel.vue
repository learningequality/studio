<template>

  <VListGroup
    v-model="open"
    append-icon="arrow_drop_down"
    class="channel-item"
    :style="{'border-left-color': channelColor}"
    lazy
  >
    <template v-slot:activator>
      <VListTile class="py-2">
        <VListTileAction class="select-col">
          <Checkbox
            ref="checkbox"
            class="ma-0 pa-0"
            :value="selected"
            :indeterminate="indeterminate"
            @click.stop.prevent="goNextSelectionState"
          />
        </VListTileAction>
        <div class="mr-2">
          <VImg
            aspect-ratio="1"
            min-height="24px"
            min-width="24px"
            :src="thumbnailSrc"
          />
        </div>
        <VListTileContent>
          <VListTileTitle class="text-truncate">
            <h4 class="notranslate">
              {{ channel.name }}
            </h4>
          </VListTileTitle>
        </VListTileContent>
      </VListTile>
    </template>

    <transition-group>
      <template v-for="child in treeChildren">
        <TopicNode
          v-if="hasChildren(child.id)"
          :key="child.id"
          :nodeId="child.id"
          :sourceId="child.source_id"
        />
        <ContentNode
          v-else
          :key="child.id"
          :nodeId="child.id"
          :sourceId="child.source_id"
        />
      </template>
    </transition-group>

  </VListGroup>

</template>
<script>

  import { mapGetters } from 'vuex';
  import TopicNode from './TopicNode';
  import ContentNode from './ContentNode';
  import clipboardMixin, { parentMixin } from './mixins';
  import Checkbox from 'shared/views/form/Checkbox';
  import { SelectionFlags } from 'frontend/channelEdit/vuex/clipboard/constants';

  export default {
    name: 'Channel',
    components: {
      ContentNode,
      Checkbox,
      TopicNode,
    },
    mixins: [clipboardMixin, parentMixin],
    props: {
      channelId: {
        type: String,
        default() {
          return this.nodeId;
        },
      },
    },
    data() {
      return {
        open: false,
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      ...mapGetters('clipboard', ['getChannelColor']),
      channel() {
        return this.getChannel(this.channelId);
      },
      channelColor() {
        return this.getChannelColor(this.channelId) || this.$vuetify.theme.channelHighlightDefault;
      },
      thumbnailSrc() {
        const encoding = this.channel.thumbnail_encoding;
        const src = encoding && encoding.base64 ? encoding.base64 : this.channel.thumbnail_src;
        return src ? src : require('shared/images/kolibri_placeholder.png');
      },
      selected() {
        return Boolean(this.selectionState & SelectionFlags.ALL_DESCENDANTS);
      },
      // Overrides mixin, since channel itself cannot be solely selected
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      nextSelectionState() {
        const current = this.selectionState;

        return current === SelectionFlags.NONE || current & SelectionFlags.INDETERMINATE
          ? SelectionFlags.SELECTED | SelectionFlags.ALL_DESCENDANTS
          : SelectionFlags.NONE;
      },
    },
    $trs: {},
  };

</script>
<style lang="less" scoped>

  .channel-item {
    background: #ffffff;
    border-left: 10px solid transparent;
  }

  .channel-item,
  .v-list__tile {
    width: 100%;
    max-width: 100%;
  }

  .select-col {
    min-width: 24px;
  }

  .v-list__tile__title {
    height: auto;
  }

  /deep/ .v-list__group__header .v-list__tile {
    padding-left: 11px;
  }

  .text-truncate {
    /* fix clipping of dangling characters */
    line-height: 1.3 !important;
  }

</style>
