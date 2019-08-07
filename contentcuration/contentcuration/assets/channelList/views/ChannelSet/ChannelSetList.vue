<template>
  <VContainer fluid>
    <VBtn
      v-if="!loading"
      color="primary"
      fixed
      right
      fab
      :title="$tr('addChannelSetTitle')"
      @click="newChannelSet"
    >
      <VIcon>add</VIcon>
    </VBtn>
    <VLayout row wrap justify-center>
      <VFlex xs12 sm10 md6>
        <VLayout row wrap justify-space-between>
          <VFlex xs2>
            <VBtn flat color="primary" @click="infoDialog=true">
              <VIcon>info</VIcon>
              {{ $tr('aboutChannelSets') }}
            </VBtn>
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
          </VFlex>
        </VLayout>
        <VLayout row justify-center>
          <VFlex xs12>
            <template v-if="loading">
              <VProgressLinear
                indeterminate
                color="primary"
              />
              <p class="headline mb-0">
                {{ $tr('loading') }}
              </p>
            </template>
            <p v-else-if="channelSets && !channelSets.length" class="headline mb-0">
              {{ $tr('noChannelSetsFound') }}
            </p>
            <template v-else>
              <ChannelSetItem
                v-for="channelSet in channelSets"
                :key="channelSet.id"
                :channelSet="channelSet"
              />
            </template>
            <router-view v-if="!loading"/>
          </VFlex>
        </VLayout>
      </VFlex>
    </VLayout>
  </VContainer>
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


</style>
