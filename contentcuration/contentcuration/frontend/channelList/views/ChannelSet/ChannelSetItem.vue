<template>

  <VCard class="my-3" :to="channelSetDetailsLink">
    <VCardTitle>
      <VLayout column justify-space-between fill-height>
        <VFlex xs12 class="grey--text">
          {{ $tr('channelCount', {'count': channelSet.channels.length}) }}
        </VFlex>
        <VFlex xs12>
          <h3 class="headline mb-0">
            {{ channelSet.name }}
          </h3>
        </VFlex>
        <VFlex xs12>
          {{ channelSet.description }}
        </VFlex>
      </VLayout>
    </VCardTitle>
    <VCardActions>
      <VSpacer />
      <VBtn
        flat
        color="error"
        @click.prevent="deleteDialog=true"
      >
        {{ $tr('deleteChannelSetTitle') }}
      </VBtn>
      <VBtn
        flat
        color="primary"
        :to="channelSetDetailsLink"
      >
        {{ $tr('edit') }}
      </VBtn>
    </VCardActions>
    <PrimaryDialog v-model="deleteDialog" :title="$tr('deleteChannelSetTitle')">
      {{ $tr('deleteChannelSetText') }}
      <template v-slot:actions>
        <VSpacer />
        <VBtn
          color="primary"
          flat
          @click="deleteDialog=false"
        >
          {{ $tr('cancel') }}
        </VBtn>
        <VBtn
          color="primary"
          @click="deleteChannelSet(channelSet.id)"
        >
          {{ $tr('deleteChannelSetTitle') }}
        </VBtn>
      </template>
    </PrimaryDialog>
  </VCard>

</template>

<script>

  import { mapActions } from 'vuex';
  import { RouterNames } from '../../constants';
  import PrimaryDialog from 'shared/views/PrimaryDialog';

  export default {
    name: 'ChannelSetItem',
    components: {
      PrimaryDialog,
    },
    props: {
      channelSet: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        deleteDialog: false,
      };
    },
    computed: {
      channelSetDetailsLink() {
        return {
          name: RouterNames.CHANNEL_SET_DETAILS,
          params: { channelSetId: this.channelSet.id },
        };
      },
    },
    $trs: {
      deleteChannelSetTitle: 'Delete',
      deleteChannelSetText: 'Are you sure you want to delete this channel collection?',
      channelCount: '{count, plural,\n =1 {# Channel}\n other {# Channels}}',
      cancel: 'Cancel',
      edit: 'Edit collection',
    },
    methods: {
      ...mapActions('channelSet', ['deleteChannelSet']),
    },
  };

</script>


<style lang="less" scoped>

</style>
