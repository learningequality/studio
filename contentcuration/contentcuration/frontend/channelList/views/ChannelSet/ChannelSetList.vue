<template>

  <VContainer class="list-items" fluid>
    <VLayout row wrap align-end justify-center>
      <VFlex>
        <ActionLink
          :text="$tr('aboutChannelSetsLink')"
          class="mx-2"
          @click="infoDialog = true"
        />
        <MessageDialog v-model="infoDialog" :header="$tr('aboutChannelSets')">
          <p>
            {{ $tr('channelSetsDescriptionText') }}
          </p>
          <p>
            {{ $tr('channelSetsInstructionsText') }}
          </p>
          <p class="red--text">
            {{ $tr('channelSetsDisclaimer') }}
          </p>
          <template #buttons>
            <VSpacer />
            <VBtn @click="infoDialog = false">
              {{ $tr('cancelButtonLabel') }}
            </VBtn>
          </template>
        </MessageDialog>
      </VFlex>
      <VSpacer />
      <VFlex class="text-xs-right">
        <VBtn
          v-if="!loading"
          color="primary"
          data-test="add-channelset"
          @click="newChannelSet"
        >
          {{ $tr('addChannelSetTitle') }}
        </VBtn>
      </VFlex>
    </VLayout>
    <VLayout row justify-center class="pt-2">
      <VFlex xs12>
        <template v-if="loading">
          <LoadingText />
        </template>
        <p v-else-if="channelSets && !channelSets.length" class="mb-0 text-xs-center">
          {{ $tr('noChannelSetsFound') }}
        </p>
        <template v-else>
          <VDataTable
            :headers="headers"
            :items="sortedChannelSets"
            hide-actions
          >
            <template #items="{ item }">
              <ChannelSetItem
                :channelSetId="item.id"
              />
            </template>
          </VDataTable>
        </template>
      </VFlex>
    </VLayout>
  </VContainer>

</template>

<script>

  import sortBy from 'lodash/sortBy';
  import { mapGetters, mapActions } from 'vuex';
  import { RouteNames } from '../../constants';
  import ChannelSetItem from './ChannelSetItem.vue';
  import MessageDialog from 'shared/views/MessageDialog';
  import LoadingText from 'shared/views/LoadingText';

  export default {
    name: 'ChannelSetList',
    components: {
      ChannelSetItem,
      MessageDialog,
      LoadingText,
    },
    data() {
      return {
        loading: true,
        infoDialog: false,
      };
    },
    computed: {
      ...mapGetters('channelSet', ['channelSets']),
      headers() {
        return [
          { text: this.$tr('title'), sortable: false, value: 'name' },
          { text: this.$tr('token'), sortable: false, value: 'secret_token', width: '224px' },
          { text: this.$tr('channelNumber'), sortable: false, align: 'right', width: '50px' },
          { text: this.$tr('options'), sortable: false, align: 'center', width: '100px' },
        ];
      },
      sortedChannelSets() {
        return sortBy(this.channelSets, s => s.name.toLowerCase()) || [];
      },
    },
    mounted() {
      this.loadChannelSetList().then(() => {
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('channelSet', ['loadChannelSetList']),
      newChannelSet() {
        this.$router.push({
          name: RouteNames.NEW_CHANNEL_SET_DETAILS,
        });
      },
    },
    $trs: {
      cancelButtonLabel: 'Close',
      noChannelSetsFound:
        'You can package together multiple channels to create a collection. The entire collection can then be imported to Kolibri at once by using a collection token.',
      addChannelSetTitle: 'New collection',
      aboutChannelSets: 'About collections',
      aboutChannelSetsLink: 'Learn about collections',
      channelSetsDescriptionText:
        'A collection contains multiple Kolibri Studio channels that can be imported at one time to Kolibri with a single collection token.',
      channelSetsInstructionsText:
        'You can make a collection by selecting the channels you want to be imported together.',
      channelSetsDisclaimer:
        'You will need Kolibri version 0.12.0 or higher to import channel collections',
      title: 'Collection name',
      token: 'Token ID',
      channelNumber: 'Number of channels',
      options: 'Options',
    },
  };

</script>


<style lang="less" scoped>

  .list-items {
    margin: 0 auto;
  }

  /deep/ .v-datatable {
    background-color: transparent !important;
  }

</style>
