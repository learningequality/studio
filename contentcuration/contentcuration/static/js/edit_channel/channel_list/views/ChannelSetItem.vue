<template>

  <div class="channel-set-item" :title="channelSet.name" :class="{optionHighlighted: optionHighlighted}">
    <div class="channel-container-wrapper">
      <div class="profile">
        <span class="material-icons">storage</span>
      </div>
        <div class="channel-metadata">
          <div>{{$tr('channelCount', {'count': channelSet.channels.length})}}</div>
          <CopyToken
            :key="channelSet.secret_token.display_token"
            :token="channelSet.secret_token.display_token"
          />
        </div>
        <h4>
          <span class="channel-set-name">{{channelSet.name}}</span>
          <span
            class="material-icons option delete-channelset"
            :title="$tr('deleteChannelSetTitle')"
            @mouseleave="optionHighlighted = false"
            @mouseover="optionHighlighted = true"
            @click.stop="handleDeleteChannelSet"
          >
            delete
          </span>
        </h4>
        <p class="description">{{channelSet.description}}</p>
      </div>
    </div>


  </div>

</template>

<script>

import _ from 'underscore';
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
import CopyToken from './CopyToken.vue';
import dialog from 'edit_channel/utils/dialog';


export default {
  name: 'ChannelSetItem',
  $trs: {
    deleteChannelSetTitle: 'Delete Collection',
    deleteChannelSetText: "Are you sure you want to PERMANTENTLY delete this channel collection?",
    copyPrompt: "Copy token to import channel into Kolibri",
    channelCount: "{count, plural,\n =1 {# Channel}\n other {# Channels}}",
    cancel: "Cancel"
  },
  props: {
    channelSet: {
      type: Object,
      required: true,
    }
  },
  components: {
    CopyToken,
  },
  data() {
    return {
      optionHighlighted: false
    }
  },
  methods: Object.assign(
    mapActions('channel_list', [
      'deleteChannelSet'
    ]),
    {
      handleDeleteChannelSet() {
        dialog.dialog(this.$tr("deleteChannelSetTitle"), this.$tr("deleteChannelSetText"), {
          [this.$tr("cancel")]:function(){},
          [this.$tr("deleteChannelSetTitle")]: () => {
            this.deleteChannelSet(this.channelSet);
          },
        }, () => {});
      }
    }
  )
};

</script>


<style lang="less" scoped>

  @import '../../../../less/channel_list.less';

  .channel-container-wrapper {
    min-height: 150px;
  }

  .channel-set-item {
    &:hover:not(.optionHighlighted) {
      .channel-set-name {
        color: @blue-500;
      }
      .channel-container-wrapper {
        border-color: @blue-500;
      }
    }
    .delete-channelset:hover {
      color: @red-error-color;
    }
  }

</style>
