<template>
  <div
    class="channel-set-channel"
    :class="{selectedChannel: isSelected, unpublishedChannel: !channel.published}"
    :title="title"
  >
    <div class="row">
      <div class="col-xs-2 section text-center">
        <img :src="channel.thumbnail_url">
      </div>
      <div class="col-xs-9">
        <h4 class="title">
          {{ channel.name }}
        </h4>
        <p class="description">
          {{ channel.description }}
        </p>
      </div>
      <div class="col-xs-1 text-center section">
        <span
          v-if="isSelected"
          class="remove-channel"
          :title="$tr('deselectButtonLabel')"
          @click="removeChannel"
        >
          &times;
        </span>
        <a
          v-else
          class="action-text uppercase add-channel"
          :title="$tr('addChannelTitle')"
          @click="addChannel"
        >
          {{ $tr('selectButtonLabel') }}
        </a>
      </div>
    </div>
    <div class="row">
      <div class="col-xs-12 text-right version">
        {{ $tr("versionText", {'version': channel.version}) }}
      </div>
    </div>
  </div>
</template>


<script>

  import _ from 'underscore';
  import { mapActions, mapGetters } from 'vuex';
  import { PageTypes } from '../constants';

  export default {
    name: 'ChannelItem',
    $trs: {
      selectButtonLabel: 'Select',
      deselectButtonLabel: 'Deselect',
      unpublishedTitle: '{channelName} must be published to import it into Kolibri',
      addChannelTitle: 'Add channel to collection',
      versionText: 'Version {version}',
    },
    props: {
      channel: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        isSelected: false,
      };
    },
    computed: Object.assign(mapGetters('channel_set', ['currentPage', 'channels']), {
      title() {
        if (this.currentPage === PageTypes.SELECT_CHANNELS || this.channel.published) {
          return this.channel.name;
        } else {
          return this.$tr('unpublishedTitle', { channelName: this.channel.name });
        }
      },
    }),
    watch: {
      channels() {
        this.checkIfSelected();
      },
    },
    mounted() {
      this.checkIfSelected();
    },
    methods: Object.assign(mapActions('channel_set', ['addChannelToSet', 'removeChannelFromSet']), {
      checkIfSelected() {
        this.isSelected = Boolean(_.findWhere(this.channels, { id: this.channel.id }));
      },
      removeChannel() {
        this.removeChannelFromSet(this.channel);
      },
      addChannel() {
        this.addChannelToSet(this.channel);
      },
    }),
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .channel-set-channel {
    width: 100%;
    padding: 15px 20px 5px;
    margin: 0;
    margin-bottom: 10px;
    cursor: default;
    background-color: @gray-200;
    .section {
      padding: 0;
      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    }
    .title {
      .truncate;

      margin: 0;
      margin-bottom: 10px;
      font-size: 16pt;
      font-weight: bold;
      color: black;
    }
    .description {
      margin: 0;
    }
    .add-channel {
      padding: 10px 0;
    }
    .remove-channel {
      font-size: 25pt;
      cursor: pointer;
    }
    .version {
      font-size: 10pt;
      font-style: italic;
      color: @gray-700;
    }
  }

</style>
