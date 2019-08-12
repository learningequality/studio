<template>
  <VCard class="my-3" :to="channelSetDetailsLink">
    <VCardText>
      {{ $tr('channelCount', {'count': channelSet.channels.length}) }}
    </VCardText>
    <VCardTitle>
      <h3 class="headline mb-0">
        {{ channelSet.name }}
      </h3>
    </VCardTitle>
    <VCardText>
      {{ channelSet.description }}
    </VCardText>
    <VCardActions>
      <VSpacer/>
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
        <VSpacer/>
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
  import ChannelSetModal from './ChannelSetModal';
  import CopyToken from 'shared/views/CopyToken';
  import PrimaryDialog from 'shared/views/PrimaryDialog';
  import { RouterNames } from '../../constants';

  export default {
    name: 'ChannelSetItem',
    $trs: {
      deleteChannelSetTitle: 'Delete',
      deleteChannelSetText: 'Are you sure you want to delete this channel collection?',
      channelCount: '{count, plural,\n =1 {# Channel}\n other {# Channels}}',
      cancel: 'Cancel',
      edit: 'Edit collection',
    },
    components: {
      CopyToken,
      ChannelSetModal,
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
        return { name: RouterNames.CHANNEL_SET_DETAILS, params: {channelSetId: this.channelSet.id }};
      },
    },
    methods: {
      ...mapActions('channelSet', ['deleteChannelSet']),
    },
  };

</script>


<style lang="less" scoped>

</style>
