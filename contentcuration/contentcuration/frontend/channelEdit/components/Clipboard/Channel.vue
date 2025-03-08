<template>

  <LazyListGroup
    v-model="open"
    appendIcon="arrow_drop_down"
    class="channel-item"
    :style="{ 'border-left-color': channelColor }"
  >
    <template #header>
      <VListTile class="channel-tile py-2" inactive>
        <VListTileAction class="select-col">
          <Checkbox
            ref="checkbox"
            class="ma-0 pa-0"
            :class="{ selectedIndeterminate: !selected && indeterminate }"
            :inputValue="selected"
            :indeterminate="indeterminate"
            @input="goNextSelectionState"
          />
        </VListTileAction>
        <div class="mr-2">
          <VImg
            :aspect-ratio="16 / 9"
            min-height="24px"
            min-width="43px"
            :src="thumbnailSrc"
            contain
          />
        </div>
        <VListTileContent>
          <VListTileTitle>
            <h4 class="notranslate text-truncate">
              {{ channel.name }}
            </h4>
          </VListTileTitle>
        </VListTileContent>
      </VListTile>
    </template>

    <ContentNode
      v-for="child in children"
      :key="child.id"
      :nodeId="child.id"
      :level="level + 1"
    />

  </LazyListGroup>

</template>
<script>

  import { mapGetters } from 'vuex';
  import clipboardMixin, { parentMixin } from './mixins';
  import ContentNode from './ContentNode';
  import Checkbox from 'shared/views/form/Checkbox';
  import { SelectionFlags } from 'frontend/channelEdit/vuex/clipboard/constants';
  import LazyListGroup from 'shared/views/LazyListGroup';

  export default {
    name: 'Channel',
    components: {
      ContentNode,
      Checkbox,
      LazyListGroup,
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
<style lang="scss" scoped>

  .channel-item {
    background: #ffffff;
    border-left: 10px solid transparent;
  }

  .channel-item,
  .channel-tile,
  .v-list__tile__title,
  .v-list__tile__title > h4,
  ::v-deep .channel-tile > .v-list__tile {
    width: 100%;
    max-width: 100%;
  }

  ::v-deep .channel-tile > .v-list__tile {
    padding-right: 0;
  }

  .select-col {
    min-width: 24px;
  }

  .v-list__tile__title {
    height: auto;
  }

  .text-truncate {
    // Fix clipping of dangling characters
    line-height: 1.3 !important;
  }

  ::v-deep .selectedIndeterminate svg {
    fill: gray !important;
  }

</style>