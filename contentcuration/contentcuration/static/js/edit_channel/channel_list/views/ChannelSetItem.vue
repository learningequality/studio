<template>
  <div
    class="channel-set-item"
    :title="channelSet.name"
    :class="{optionHighlighted: optionHighlighted}"
  >
    <div class="channel-container-wrapper" @click="openChannelSet">
      <div class="profile">
        <span class="material-icons">
          storage
        </span>
      </div>
      <div>
        <div class="channel-options-wrapper">
          <div class="channel-metadata">
            <div>{{ $tr('channelCount', {'count': channelSet.channels.length}) }}</div>
            <CopyToken
              :key="channelSet.secret_token.display_token"
              :token="channelSet.secret_token.display_token"
            />
          </div>
          <span
            class="material-icons option delete-channelset"
            :title="$tr('deleteChannelSetTitle')"
            @mouseleave="optionHighlighted = false"
            @mouseover="optionHighlighted = true"
            @click.stop="handleDeleteChannelSet"
          >
            delete
          </span>
        </div>
        <h4 dir="auto">
          {{ channelSet.name }}
        </h4>
        <p class="description" dir="auto">
          {{ channelSet.description }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>

  import _ from 'underscore';
  import { mapActions, mapGetters } from 'vuex';
  import { getChannelSetModel } from './../utils';
  import CopyToken from 'edit_channel/sharedComponents/CopyToken.vue';
  import dialog from 'edit_channel/utils/dialog';
  import { ChannelSetModalView } from 'edit_channel/channel_set/views';

  export default {
    name: 'ChannelSetItem',
    $trs: {
      deleteChannelSetTitle: 'Delete Collection',
      deleteChannelSetText: 'Are you sure you want to PERMANTENTLY delete this channel collection?',
      copyPrompt: 'Copy token to import channel into Kolibri',
      channelCount: '{count, plural,\n =1 {# Channel}\n other {# Channels}}',
      cancel: 'Cancel',
    },
    components: {
      CopyToken,
    },
    props: {
      channelSetID: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        optionHighlighted: false,
      };
    },
    computed: {
      ...mapGetters('channel_list', ['getChannelSet']),
      channelSet() {
        return this.getChannelSet(this.channelSetID);
      },
    },
    methods: {
      ...mapActions('channel_list', ['deleteChannelSet']),
      handleDeleteChannelSet() {
        dialog.dialog(
          this.$tr('deleteChannelSetTitle'),
          this.$tr('deleteChannelSetText'),
          {
            [this.$tr('cancel')]: function() {},
            [this.$tr('deleteChannelSetTitle')]: () => {
              this.deleteChannelSet(this.channelSetID);
            },
          },
          () => {}
        );
      },
      openChannelSet() {
        new ChannelSetModalView({
          modal: true,
          isNew: false,
          model: getChannelSetModel(this.channelSet),
          onsave: channelset => {
            _.each(channelset.pairs(), attr => {
              this.channelSet[attr[0]] = attr[1];
            });
          },
        });
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/channel_list.less';

  .channel-container-wrapper {
    min-height: 150px;
  }

  .channel-set-item {
    &:hover:not(.optionHighlighted) {
      h4 {
        color: @blue-500;
      }
      .channel-container-wrapper {
        border-color: @blue-500;
      }
    }
  }

</style>
