<template>

  <div>
    <KModal
      v-if="activeDialog"
      :title="dialogConfig.title"
      :submitText="dialogConfig.submitText"
      cancelText="Cancel"
      data-test="confirm-dialog"
      :errorMessage="dialogConfig.errorMessage"
      :submitDisabled="dialogConfig.submitDisabled"
      @submit="handleSubmit"
      @cancel="activeDialog = null"
    >
      <p>{{ dialogConfig.message }}</p>
    </KModal>

    <BaseMenu>
      <template #activator="{ on }">
        <VBtn
          v-bind="$attrs"
          v-on="on"
        >
          Actions
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
            @click="openDialog('restore')"
          >
            <VListTileTitle>Restore</VListTileTitle>
          </VListTile>
          <VListTile
            data-test="delete"
            @click="openDialog('permanentDelete')"
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
            @click="openDialog('makePrivate')"
          >
            <VListTileTitle>Make private</VListTileTitle>
          </VListTile>
          <VListTile
            v-else
            data-test="public"
            @click="openDialog('makePublic')"
          >
            <VListTileTitle>Make public</VListTileTitle>
          </VListTile>
          <VListTile
            v-if="!channel.public"
            data-test="softdelete"
            @click="openDialog('softDelete')"
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
  import { CommunityLibraryStatus } from 'shared/constants';

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
      activeDialog: null,
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
      dialogConfig() {
        const configs = {
          restore: {
            title: 'Restore channel',
            submitText: 'Restore',
            message: `Are you sure you want to restore ${this.name} and make it active again?`,
            handler: this.restoreHandler,
            errorMessage: '',
            submitDisabled: false,
          },
          makePublic: {
            title: 'Make channel public',
            submitText: 'Make public',
            message: `All users will be able to view and import content from ${this.name}.`,

            handler: this.makePublicHandler,
            errorMessage: this.communityChannelErrorMessage,
            submitDisabled: this.isCommunityChannel,
          },
          makePrivate: {
            title: 'Make channel private',
            submitText: 'Make private',
            message: `Only users with view-only or edit permissions will be able to access ${this.name}.`,

            handler: this.makePrivateHandler,
            errorMessage: '',
            submitDisabled: false,
          },
          permanentDelete: {
            title: 'Permanently delete channel',
            submitText: 'Delete permanently',
            message: `Are you sure you want to permanently delete ${this.name}? This can not be undone.`,
            handler: this.deleteHandler,
            errorMessage: '',
            submitDisabled: false,
          },
          softDelete: {
            title: 'Delete channel',
            submitText: 'Delete',
            message: `Are you sure you want to delete ${this.name}?`,
            handler: this.softDeleteHandler,
            errorMessage: '',
            submitDisabled: false,
          },
        };
        return configs[this.activeDialog] || {};
      },
      isCommunityChannel() {
        const status = this.channel.latest_community_library_submission_status;
        return status === CommunityLibraryStatus.APPROVED || status === CommunityLibraryStatus.LIVE;
      },
      communityChannelErrorMessage() {
        if (this.isCommunityChannel) {
          return 'This channel has been added to the Community Library and cannot be marked public.';
        }
        return '';
      },
    },
    methods: {
      ...mapActions('channelAdmin', [
        'getAdminChannelListDetails',
        'deleteChannel',
        'updateChannel',
      ]),
      openDialog(type) {
        this.activeDialog = type;
      },
      handleSubmit() {
        if (this.dialogConfig.handler) {
          this.dialogConfig.handler();
        }
        this.activeDialog = null;
      },
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
        this.updateChannel({
          id: this.channelId,
          deleted: false,
        }).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Channel restored');
        });
      },
      softDeleteHandler() {
        this.updateChannel({
          id: this.channelId,
          deleted: true,
        }).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Channel deleted');
        });
      },
      deleteHandler() {
        this.$emit('deleted');
        return this.deleteChannel(this.channelId).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Channel deleted permanently');
        });
      },
      makePublicHandler() {
        this.updateChannel({
          id: this.channelId,
          isPublic: true,
        }).then(() => {
          this.$store.dispatch('showSnackbarSimple', 'Channel changed to public');
        });
      },
      makePrivateHandler() {
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

