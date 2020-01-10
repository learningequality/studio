<template>

  <tr :to="channelSetDetailsLink">
    <td class="notranslate">
      {{ channelSet.name }}
    </td>
    <td>
      <CopyToken :token="channelSet.secret_token" />
    </td>
    <td class="text-xs-right">
      {{ $formatNumber(channelCount) }}
    </td>
    <td class="text-xs-right">
      <VMenu offset-y>
        <template v-slot:activator="{ on }">
          <VBtn flat block v-on="on">
            {{ $tr('options') }}
            <VIcon class="notranslate">
              arrow_drop_down
            </VIcon>
          </VBtn>
        </template>
        <VList>
          <VListTile data-test="edit" :to="channelSetDetailsLink">
            <VListTileAction>
              <VIcon class="notranslate">
                edit
              </VIcon>
            </VListTileAction>
            <VListTileTitle>{{ $tr('edit') }}</VListTileTitle>
          </VListTile>
          <VListTile @click.prevent="deleteDialog=true">
            <VListTileAction>
              <VIcon class="notranslate">
                delete
              </VIcon>
            </VListTileAction>
            <VListTileTitle>{{ $tr('delete') }}</VListTileTitle>
          </VListTile>
        </VList>
      </VMenu>
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
            data-test="delete"
            @click="deleteChannelSet(channelSet.id)"
          >
            {{ $tr('deleteChannelSetTitle') }}
          </VBtn>
        </template>
      </PrimaryDialog>
    </td>
  </tr>

</template>

<script>

  import { mapActions } from 'vuex';
  import { RouterNames } from '../../constants';
  import PrimaryDialog from 'shared/views/PrimaryDialog';
  import CopyToken from 'shared/views/CopyToken';

  export default {
    name: 'ChannelSetItem',
    components: {
      PrimaryDialog,
      CopyToken,
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
      channelCount() {
        return this.channelSet.channels.filter(c => c).length;
      },
    },
    methods: {
      ...mapActions('channelSet', ['deleteChannelSet']),
    },
    $trs: {
      deleteChannelSetTitle: 'Delete',
      deleteChannelSetText: 'Are you sure you want to delete this channel collection?',
      cancel: 'Cancel',
      edit: 'Edit collection',
      delete: 'Delete collection',
      options: 'Options',
    },
  };

</script>


<style lang="less" scoped>

  td {
    font-size: 12pt !important;
  }

</style>
