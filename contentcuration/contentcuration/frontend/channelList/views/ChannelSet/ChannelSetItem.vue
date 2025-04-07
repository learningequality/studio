<template>

  <tr :to="channelSetDetailsLink">
    <td class="notranslate" dir="auto">
      {{ channelSet.name }}
    </td>
    <td style="width: 224px;">
      <CopyToken v-if="channelSet.secret_token" :token="channelSet.secret_token" />
      <!-- TODO: Remove this once syncNow is ready for use -->
      <em v-else class="grey--text">{{ $tr('saving') }}</em>
    </td>
    <td class="text-xs-right">
      {{ $formatNumber(channelCount) }}
    </td>
    <td class="text-xs-right">
      <Menu>
        <template #activator="{ on }">
          <VBtn flat block v-on="on">
            {{ $tr('options') }}
            <Icon
              icon="dropdown"
            />
          </VBtn>
        </template>
        <VList>
          <VListTile data-test="edit" :to="channelSetDetailsLink">
            <VListTileAction>
              <Icon
                icon="edit"
              />
            </VListTileAction>
            <VListTileTitle>{{ $tr('edit') }}</VListTileTitle>
          </VListTile>
          <VListTile @click.prevent="deleteDialog = true">
            <VListTileAction>
              <Icon
                icon="trash"
              />
            </VListTileAction>
            <VListTileTitle>{{ $tr('delete') }}</VListTileTitle>
          </VListTile>
        </VList>
      </Menu>
      <MessageDialog
        v-model="deleteDialog"
        :header="$tr('deleteChannelSetTitle')"
        :text="$tr('deleteChannelSetText')"
      >
        <template #buttons="{ close }">
          <VSpacer />
          <VBtn flat color="primary" @click="close">
            {{ $tr('cancel') }}
          </VBtn>
          <VBtn
            color="primary"
            data-test="delete"
            @click="deleteChannelSet(channelSet); close()"
          >
            {{ $tr('deleteChannelSetTitle') }}
          </VBtn>
        </template>
      </MessageDialog>
    </td>
  </tr>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouteNames } from '../../constants';
  import MessageDialog from 'shared/views/MessageDialog';
  import CopyToken from 'shared/views/CopyToken';

  export default {
    name: 'ChannelSetItem',
    components: {
      MessageDialog,
      CopyToken,
    },
    props: {
      channelSetId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        deleteDialog: false,
      };
    },
    computed: {
      ...mapGetters('channelSet', ['getChannelSet']),
      channelSet() {
        return this.getChannelSet(this.channelSetId);
      },
      channelSetDetailsLink() {
        return {
          name: RouteNames.CHANNEL_SET_DETAILS,
          params: { channelSetId: this.channelSet.id },
        };
      },
      channelCount() {
        return this.channelSet && this.channelSet.channels
          ? this.channelSet.channels.filter(c => c).length
          : 0;
      },
    },
    methods: {
      ...mapActions('channelSet', ['deleteChannelSet']),
    },
    $trs: {
      deleteChannelSetTitle: 'Delete collection',
      deleteChannelSetText: 'Are you sure you want to delete this collection?',
      cancel: 'Cancel',
      edit: 'Edit collection',
      delete: 'Delete collection',
      options: 'Options',
      saving: 'Saving',
    },
  };

</script>


<style lang="scss" scoped>

  td {
    font-size: 12pt !important;
  }

</style>
