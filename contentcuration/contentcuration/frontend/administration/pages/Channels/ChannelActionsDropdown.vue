<template>

  <div>
    <KModal
      v-if="restoreDialog"
      :title="$tr('restoreChannelTitle')"
      :submitText="$tr('restoreAction')"
      :cancelText="$tr('cancelAction')"
      data-test="confirm-restore"
      @submit="restoreHandler"
      @cancel="restoreDialog = false"
    >
      <div class="kmodal-confirmation-content">
        <p>{{ $tr('restoreChannelMessage', { name: name }) }}</p>
      </div>
    </KModal>

    <KModal
      v-if="makePublicDialog"
      :title="$tr('makePublicTitle')"
      :submitText="$tr('makePublicAction')"
      :cancelText="$tr('cancelAction')"
      data-test="confirm-public"
      @submit="makePublicHandler"
      @cancel="makePublicDialog = false"
    >
      <div class="kmodal-confirmation-content">
        <p>{{ $tr('makePublicMessage', { name: name }) }}</p>
      </div>
    </KModal>

    <KModal
      v-if="makePrivateDialog"
      :title="$tr('makePrivateTitle')"
      :submitText="$tr('makePrivateAction')"
      :cancelText="$tr('cancelAction')"
      data-test="confirm-private"
      @submit="makePrivateHandler"
      @cancel="makePrivateDialog = false"
    >
      <div class="kmodal-confirmation-content">
        <p>{{ $tr('makePrivateMessage', { name: name }) }}</p>
      </div>
    </KModal>

    <KModal
      v-if="deleteDialog"
      :title="$tr('permanentDeleteTitle')"
      :submitText="$tr('permanentDeleteAction')"
      :cancelText="$tr('cancelAction')"
      data-test="confirm-delete"
      @submit="deleteHandler"
      @cancel="deleteDialog = false"
    >
      <div class="kmodal-confirmation-content">
        <p>{{ $tr('permanentDeleteMessage', { name: name }) }}</p>
      </div>
    </KModal>

    <KModal
      v-if="softDeleteDialog"
      :title="$tr('softDeleteTitle')"
      :submitText="$tr('softDeleteAction')"
      :cancelText="$tr('cancelAction')"
      data-test="confirm-softdelete"
      @submit="softDeleteHandler"
      @cancel="softDeleteDialog = false"
    >
      <div class="kmodal-confirmation-content">
        <p>{{ $tr('softDeleteMessage', { name: name }) }}</p>
      </div>
    </KModal>

    <BaseMenu>
      <template #activator="{ on }">
        <VBtn
          v-bind="$attrs"
          v-on="on"
        >
          actions
          <Icon
            icon="dropdown"
            class="ml-1"
          />
        </VBtn>
      </template>
      <VList>
        <template v-if="channel.deleted">
          <VListTile
            data-test="restore"
            @click="restoreDialog = true"
          >
            <VListTileTitle>Restore</VListTileTitle>
          </VListTile>
          <VListTile
            data-test="delete"
            @click="deleteDialog = true"
          >
            <VListTileTitle>Delete permanently</VListTileTitle>
          </VListTile>
        </template>
        <template v-else>
          <VListTile
            :to="searchChannelEditorsLink"
            target="_blank"
          >
            <VListTileTitle>View editors</VListTileTitle>
          </VListTile>
          <VListTile
            data-test="pdf"
            @click="downloadPDF"
          >
            <VListTileTitle>Download PDF</VListTileTitle>
          </VListTile>
          <VListTile
            data-test="csv"
            @click="downloadCSV"
          >
            <VListTileTitle>Download CSV</VListTileTitle>
          </VListTile>
          <VListTile
            v-if="channel.public"
            data-test="private"
            @click="makePrivateDialog = true"
          >
            <VListTileTitle>Make private</VListTileTitle>
          </VListTile>
          <VListTile
            v-else
            data-test="public"
            @click="makePublicDialog = true"
          >
            <VListTileTitle>Make public</VListTileTitle>
          </VListTile>
          <VListTile
            v-if="!channel.public"
            data-test="softdelete"
            @click="softDeleteDialog = true"
          >
            <VListTileTitle>Delete channel</VListTileTitle>
          </VListTile>
        </template>
      </VList>
    </BaseMenu>
  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouteNames } from '../../constants';
  import { channelExportMixin } from 'shared/views/channel/mixins';

  export default {
    name: 'ChannelActionsDropdown',
    mixins: [channelExportMixin],
    props: {
      channelId: {
        type: String,
        required: true,
      },
    },
    data: () => ({
      deleteDialog: false,
      makePublicDialog: false,
      makePrivateDialog: false,
      restoreDialog: false,
      softDeleteDialog: false,
    }),
    computed: {
      ...mapGetters('channel', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId);
      },
      name() {
        return this.channel.name;
      },
      searchChannelEditorsLink() {
        return {
          name: RouteNames.USERS,
          query: {
            keywords: `${this.channel.id}`,
          },
        };
      },
    },
    methods: {
      ...mapActions('channelAdmin', [
        'getAdminChannelListDetails',
        'deleteChannel',
        'updateChannel',
      ]),
      async downloadPDF() {
        this.$store.dispatch('showSnackbarSimple', 'Generating PDF...');
        const channelList = await this.getAdminChannelListDetails([this.channel.id]);
        return this.generateChannelsPDF(channelList);
      },
      async downloadCSV() {
        this.$store.dispatch('showSnackbarSimple', 'Generating CSV...');
        const channelList = await this.getAdminChannelListDetails([this.channel.id]);
        return this.generateChannelsCSV(channelList);
      },
      restoreHandler() {
        this.restoreDialog = false;
        this.updateChannel({
          id: this.channelId,
          deleted: false,
        }).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Channel restored');
        });
      },
      softDeleteHandler() {
        this.softDeleteDialog = false;
        this.updateChannel({
          id: this.channelId,
          deleted: true,
        }).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Channel deleted');
        });
      },
      deleteHandler() {
        this.deleteDialog = false;
        this.$emit('deleted');
        return this.deleteChannel(this.channelId).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Channel deleted permanently');
        });
      },
      makePublicHandler() {
        this.makePublicDialog = false;
        this.updateChannel({
          id: this.channelId,
          isPublic: true,
        }).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Channel changed to public');
        });
      },
      makePrivateHandler() {
        this.makePrivateDialog = false;
        this.updateChannel({
          id: this.channelId,
          isPublic: false,
        }).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Channel changed to private');
        });
      },
    },
    $trs: {
      restoreChannelTitle: 'Restore channel',
      restoreAction: 'Restore',
      cancelAction: 'Cancel',
      restoreChannelMessage: 'Are you sure you want to restore {name} and make it active again?',
      
      makePublicTitle: 'Make channel public',
      makePublicAction: 'Make public',
      makePublicMessage: 'All users will be able to view and import content from {name}.',
      
      makePrivateTitle: 'Make channel private',
      makePrivateAction: 'Make private',
      makePrivateMessage: 'Only users with view-only or edit permissions will be able to access {name}.',
      
      permanentDeleteTitle: 'Permanently delete channel',
      permanentDeleteAction: 'Delete permanently',
      permanentDeleteMessage: 'Are you sure you want to permanently delete {name}? This can not be undone.',
      
      softDeleteTitle: 'Delete channel',
      softDeleteAction: 'Delete',
      softDeleteMessage: 'Are you sure you want to delete {name}?',
    },
  };

</script>


<style lang="scss" scoped>

.kmodal-confirmation-content{
  color: rgba(0, 0, 0, 0.87) !important;
  white-space: normal !important;
  text-align: left !important;
}

::v-deep .title {
  color: rgba(0, 0, 0, 0.87) !important;
  text-align: left !important;
}

</style>