<template>

  <VContainer
    class="list-items"
    fluid
  >
<VLayout
  row
  wrap
  align-center
  justify-space-between
  class="pb-2"
>
  <VFlex class="text-xs-left">
    <KButton
      v-if="!loading && channelSets && channelSets.length"
      :text="$tr('aboutChannelSetsLink')"
      class="link-btn"
      appearance="basic-link"
      @click="infoDialog = true"
    />
  </VFlex>
  <VFlex class="text-xs-right" shrink="0">
    <KButton
      v-if="!loading"
      appearance="raised-button"
      primary
      data-test="add-channelset"
      :text="$tr('addChannelSetTitle')"
      @click="newChannelSet"
    />
  </VFlex>
</VLayout>

    <VLayout
      row
      justify-center
      class="pt-2"
    >
      <VFlex xs12>
        <template v-if="loading">
          <LoadingText />
        </template>
        <template
          v-else-if="channelSets && !channelSets.length"
        >
          <div class="text-xs-center mt-4 p-2">
          <p class="mb-0">
            {{ $tr('noChannelSetsFound') }}
          </p>
          <KButton
            :text="$tr('aboutChannelSetsLink')"
            class="link-btn"
            appearance="basic-link"
            @click="infoDialog = true"
          />
          <KModal
            v-if="infoDialog"
            :cancelText="$tr('cancelButtonLabel')"
            :title="$tr('aboutChannelSets')"
            @cancel="infoDialog = false"
          >
            <div>
              <p>
                {{ $tr('channelSetsDescriptionText') }}
              </p>
              <p>
                {{ $tr('channelSetsInstructionsText') }}
              </p>
              <p :class="$computedClass(channelSetsDisclamerStyle)">
                {{ $tr('channelSetsDisclaimer') }}
              </p>
            </div>
          </KModal>
        </div>
      </template>
        <template v-else>
          <KModal
            v-if="infoDialog"
            :cancelText="$tr('cancelButtonLabel')"
            :title="$tr('aboutChannelSets')"
            @cancel="infoDialog = false"
          >
            <div>
              <p>
                {{ $tr('channelSetsDescriptionText') }}
              </p>
              <p>
                {{ $tr('channelSetsInstructionsText') }}
              </p>
              <p :class="$computedClass(channelSetsDisclamerStyle)">
                {{ $tr('channelSetsDisclaimer') }}
              </p>
            </div>
          </KModal>
          <VDataTable
            :headers="headers"
            :items="sortedChannelSets"
            hide-actions
          >
            <template #items="{ item }">
              <ChannelSetItem :channelSetId="item.id" />
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
  import LoadingText from 'shared/views/LoadingText';

  export default {
    name: 'ChannelSetList',
    components: {
      ChannelSetItem,
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
      channelSetsDisclamerStyle() {
        return {
          color: this.$themePalette.red.v_500,
        };
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
          name: RouteNames.NEW_CHANNEL_SET,
        });
      },
    },
    $trs: {
      cancelButtonLabel: 'Close',
      noChannelSetsFound:
        'You can package together multiple channels to create a collection. The entire collection can then be imported to Kolibri at once by using a collection token.',
      addChannelSetTitle: 'New collection',
      aboutChannelSets: 'About collections',
      aboutChannelSetsLink: 'Learn more about collections',
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


<style lang="scss" scoped>

  .list-items {
    margin: 0 auto;
  }

  .link-btn {
    margin: 0 8px;
  }

  ::v-deep .v-datatable {
    background-color: transparent !important;
  }

</style>
