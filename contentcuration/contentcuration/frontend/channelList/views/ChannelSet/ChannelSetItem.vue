<template>
  <VCard class="my-3" :to="channelSetDetailsLink">
    <VLayout>
      <VFlex xs1>
        <VCardTitle>
          <VIcon x-large>storage</VIcon>
        </VCardTitle>
      </VFlex>
      <VFlex xs11>
        <VCardTitle>
          <VLayout row>
            <VFlex xs4>
              <h3 class="headline mb-0">
                {{ channelSet.name }}
              </h3>
            </VFlex>
            <VFlex xs4>
              <p class="headline mb-0">{{ $tr('channelCount', {'count': channelSet.channels.length}) }}</p>
            </VFlex>
            <VFlex xs4>
              <CopyToken
                :token="channelSet.secret_token"
              />
            </VFlex>
          </VLayout>
        </VCardTitle>
        <VLayout>
          <VFlex xs12>
            <VCardText>
              {{ channelSet.description }}
            </VCardText>
          </VFlex>
        </VLayout>
      </VFlex>
    </VLayout>
    <VCardActions>
      <VBtn
        color="primary"
        :to="channelSetDetailsLink"
        >
        {{ $tr('edit') }}
      </VBtn>
      <VSpacer/>
      <VBtn
        color="error"
        @click.prevent="deleteDialog=true"
      >
        {{ $tr('deleteChannelSetTitle') }}
      </VBtn>
    </VCardActions>
    <PrimaryDialog v-model="deleteDialog" :title="$tr('deleteChannelSetTitle')">
      {{ $tr('deleteChannelSetText') }}
      <template v-slot:actions>
        <VBtn
          @click="deleteDialog=false"
        >
          {{ $tr('cancel') }}
        </VBtn>
        <VBtn
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
      deleteChannelSetText: 'Are you sure you want to PERMANENTLY delete this channel collection?',
      channelCount: '{count, plural,\n =1 {# Channel}\n other {# Channels}}',
      cancel: 'Cancel',
      edit: 'Edit',
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
