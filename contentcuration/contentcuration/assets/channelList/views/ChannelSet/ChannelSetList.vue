<template>
  <div class="channel-list">
    <div class="new-button">
      <a id="about-sets" class="action-text" @click="infoDialog=true">
        <span class="material-icons">
          info
        </span> {{ $tr('aboutChannelSets') }}
      </a>
      <PrimaryDialog v-model="infoDialog" :title="$tr('aboutChannelSets')">
        <p>
          {{ $tr('channelSetsDescriptionText') }}
        </p>
        <p>
          {{ $tr('channelSetsInstructionsText') }}
        </p>
        <p class="red--text">
          {{ $tr('channelSetsDisclaimer') }}
        </p>
        <template v-slot:actions>
          <VBtn @click="infoDialog=false">
            {{ $tr('cancelButtonLabel') }}
          </VBtn>
        </template>
      </PrimaryDialog>
      <VBtn
        :title="$tr('addChannelSetTitle')"
        @click="newChannelSet"
      >
        <VIcon>
          add
        </VIcon> {{ $tr('addChannelSetButton') }}
      </VBtn>
    </div>
    <router-view v-if="!loading"/>

    <div v-if="loading" class="default-item">
      {{ $tr('loading') }}
    </div>
    <div v-else-if="channelSets && !channelSets.length" class="no-channel-sets">
      {{ $tr('noChannelSetsFound') }}
    </div>
    <div v-else>
      <ChannelSetItem
        v-for="channelSet in channelSets"
        :key="channelSet.id"
        :channelSet="channelSet"
      />
    </div>
  </div>
</template>

<script>

  import { mapGetters, mapActions, mapMutations } from 'vuex';
  import { generateTempId, isTempId } from '../../utils';
  import ChannelSetItem from './ChannelSetItem.vue';
  import ChannelSetModal from './ChannelSetModal';
  import PrimaryDialog from 'shared/views/PrimaryDialog';
  import { RouterNames } from '../../constants';

  export default {
    name: 'ChannelSetList',
    $trs: {
      loading: 'Loading collections...',
      cancelButtonLabel: 'Close',
      noChannelSetsFound: 'You can package together multiple Studio channels to create a collection. Use a collection token to make multiple channels available for import at once in Kolibri!',
      addChannelSetTitle: 'Create a new collection of channels',
      addChannelSetButton: 'Collection',
      aboutChannelSets: 'About Collections',
      channelSetsDescriptionText:
        'A collection is a package of multiple Studio channels all associated with one ' +
        'token, the collection token! Use a collection token to make multiple channels available for import ' +
        'at once in Kolibri. You no longer have to import Channels into Kolibri using individual channel tokens.',
      channelSetsInstructionsText:
        'You can make a collection by simply selecting which channels you ' +
        'want to package together. Remember to give your collection a title.',
      channelSetsDisclaimer:
        'You will need Kolibri version 0.12.0 or higher to import channel collections',
    },
    components: {
      ChannelSetItem,
      ChannelSetModal,
      PrimaryDialog,
    },
    data() {
      return {
        loading: true,
        newSetDialog: false,
        infoDialog: false,
        newSetId: generateTempId(),
      };
    },
    computed: {
      ...mapGetters('channelSet', ['channelSets']),
    },
    mounted() {
      this.loadChannelSetList().then(() => {
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('channelSet', ['loadChannelSetList']),
      ...mapMutations('channelSet', {
        addChannelSet: 'ADD_CHANNELSET',
        removeChannelSet: 'REMOVE_CHANNELSET',
      }),
      newChannelSet() {
        // Clear any previously existing dummy channelset
        this.removeChannelSet(this.newSetId);
        this.newSetId = generateTempId();
        this.addChannelSet({
          id: this.newSetId,
          name: '',
          description: '',
          channels: [],
        });
        this.$router.push({ name: RouterNames.CHANNEL_SET_DETAILS, params: {channelSetId: this.newSetId }});
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../static/less/channel_list.less';

  #about-sets {
    float: left;
    padding: 0;
    font-size: 12pt;
    vertical-align: sub;
    span {
      font-size: 16pt;
      vertical-align: sub;
    }
  }

  .no-channel-sets {
    margin-top: 30px;
    font-size: 14pt;
    color: @gray-500;
    text-align: center;
  }

</style>
