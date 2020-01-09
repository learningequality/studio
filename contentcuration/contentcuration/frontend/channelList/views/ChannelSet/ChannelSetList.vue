<template>

  <VContainer fluid>

    <VLayout row wrap justify-center>
      <VFlex xs12 sm10 md8 lg10>
        <VLayout row wrap justify-space-between class="list-actions">
          <VFlex>
            <VBtn flat color="primary" @click="infoDialog=true">
              <VIcon class="notranslate">
                info
              </VIcon>
              &nbsp;{{ $tr('aboutChannelSets') }}
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
          <VSpacer />
          <VFlex class="text-xs-right">
            <VBtn
              v-if="!loading"
              color="primary"
              @click="newChannelSet"
            >
              {{ $tr('addChannelSetTitle') }}
            </VBtn>
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
            <p v-else-if="channelSets && !channelSets.length" class="text-xs-center mb-0">
              {{ $tr('noChannelSetsFound') }}
            </p>
            <template v-else>
              <VDataTable
                :headers="headers"
                :items="channelSets"
                hide-actions
              >
                <template v-slot:items="props">
                  <ChannelSetItem
                    :channelSet="props.item"
                  />
                </template>
              </VDataTable>
            </template>
            <keep-alive>
              <router-view v-if="$route.params.channelSetId" :key="$route.params.channelSetId" />
            </keep-alive>
          </VFlex>
        </VLayout>
      </VFlex>
    </VLayout>
  </VContainer>

</template>

<script>

  import { mapGetters, mapActions, mapMutations } from 'vuex';
  import { generateTempId } from '../../utils';
  import { RouterNames } from '../../constants';
  import ChannelSetItem from './ChannelSetItem.vue';
  import PrimaryDialog from 'shared/views/PrimaryDialog';

  export default {
    name: 'ChannelSetList',
    components: {
      ChannelSetItem,
      PrimaryDialog,
    },
    data() {
      return {
        loading: true,
        infoDialog: false,
        newSetId: generateTempId(),
      };
    },
    computed: {
      ...mapGetters('channelSet', ['channelSets']),
      headers() {
        return [
          { text: this.$tr('title'), sortable: false, value: 'name' },
          { text: this.$tr('token'), sortable: false, value: 'secret_token', width: '200px' },
          { text: this.$tr('channelNumber'), sortable: false, align: 'right', width: '50px' },
          { text: this.$tr('options'), sortable: false, align: 'center', width: '100px' },
        ];
      },
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
        this.$router.push({
          name: RouterNames.CHANNEL_SET_DETAILS,
          params: { channelSetId: this.newSetId },
        });
      },
    },
    $trs: {
      loading: 'Loading collections...',
      cancelButtonLabel: 'Close',
      noChannelSetsFound:
        'You can package together multiple Studio channels to create a collection. Use a collection token to make multiple channels available for import at once in Kolibri!',
      addChannelSetTitle: 'New collection',
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
      title: 'Collection title',
      token: 'Token ID',
      channelNumber: 'Number of channels',
      options: 'Options',
    },
  };

</script>


<style lang="less" scoped>

  .list-actions {
    margin-bottom: 32px;
    .v-btn {
      margin: 0;
    }
  }
  /deep/ .v-datatable {
    background-color: transparent !important;
  }

</style>
