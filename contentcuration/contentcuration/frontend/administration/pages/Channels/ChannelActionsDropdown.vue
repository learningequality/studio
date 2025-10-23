<template>

  <div>
    <ConfirmationDialog
      v-model="restoreDialog"
      title="Restore channel"
      :text="`Are you sure you want to restore ${name} and make it active again?`"
      data-test="confirm-restore"
      confirmButtonText="Restore"
      @confirm="restoreHandler"
    />

    <ConfirmationDialog
      v-model="makePublicDialog"
      title="Make channel public"
      :text="`All users will be able to view and import content from ${name}.`"
      data-test="confirm-public"
      confirmButtonText="Make public"
      @confirm="makePublicHandler"
    />
    <ConfirmationDialog
      v-model="makePrivateDialog"
      title="Make channel private"
      :text="`Only users with view-only or edit permissions will be able to access ${name}.`"
      data-test="confirm-private"
      confirmButtonText="Make private"
      @confirm="makePrivateHandler"
    />
    <ConfirmationDialog
      v-model="deleteDialog"
      title="Permanently delete channel"
      :text="`Are you sure you want to permanently delete ${name}?  This can not be undone.`"
      data-test="confirm-delete"
      confirmButtonText="Delete permanently"
      @confirm="deleteHandler"
    />
    <ConfirmationDialog
      v-model="softDeleteDialog"
      title="Permanently delete channel"
      :text="`Are you sure you want to delete ${name}?`"
      data-test="confirm-softdelete"
      confirmButtonText="Delete"
      @confirm="softDeleteHandler"
    />
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
          <VTooltip
            v-else-if="isCommunityChannel"
            bottom
            attach="body"
            lazy
          >
            <template #activator="{ on }">
              <div v-on="on">
                <VListTile disabled>
                  <VListTileTitle>Make public</VListTileTitle>
                </VListTile>
              </div>
            </template>
            <span>This channel has been added to the Community Library and cannot be marked
              public.</span>
          </VTooltip>
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
  import ConfirmationDialog from '../../components/ConfirmationDialog';
  import { RouteNames } from '../../constants';
  import { channelExportMixin } from 'shared/views/channel/mixins';

  export default {
    name: 'ChannelActionsDropdown',
    components: {
      ConfirmationDialog,
    },
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
      isCommunityChannel() {
        const status = this.channel.latest_community_library_submission_status;
        return status === 'APPROVED' || status === 'LIVE';
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
  };

</script>


<style lang="scss" scoped></style>
