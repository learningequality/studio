<template>

  <div>
    <ConfirmationDialog
      v-model="restoreDialog"
      :title="$tr('restoreHeading', {name})"
      :text="$tr('restoreText', {name})"
      :confirmButtonText="$tr('restore')"
      :confirmHandler="restoreHandler"
    />
    <ConfirmationDialog
      v-model="makePublicDialog"
      :title="$tr('makePublicHeading', {name})"
      :text="$tr('makePublicText', {name})"
      :confirmButtonText="$tr('makePublic', {name})"
      :confirmHandler="makePublicHandler"
    />
    <ConfirmationDialog
      v-model="makePrivateDialog"
      :title="$tr('makePrivateHeading', {name})"
      :text="$tr('makePrivateText', {name})"
      :confirmButtonText="$tr('makePrivate', {name})"
      :confirmHandler="makePrivateHandler"
    />
    <ConfirmationDialog
      v-model="deleteDialog"
      :title="$tr('deleteHeading', {name})"
      :text="$tr('deleteText', {name})"
      :confirmButtonText="$tr('delete', {name})"
      :confirmHandler="deleteHandler"
    />
    <VMenu>
      <template v-slot:activator="{ on }">
        <VBtn
          color="primary"
          light
          flat
          v-on="on"
        >
          actions
        </VBtn>
      </template>
      <VList>
        <VListTile
          v-if="channel.deleted"
          @click="restoreDialog = true"
        >
          <VListTileTitle>{{ $tr('restore') }}</VListTileTitle>
        </VListTile>
        <VListTile
          v-if="!channel.deleted"
          @click="viewEditors"
        >
          <VListTileTitle>{{ $tr('viewEditors') }}</VListTileTitle>
        </VListTile>
        <VListTile @click="downloadPDF">
          <VListTileTitle>{{ $tr('downloadPDF') }}</VListTileTitle>
        </VListTile>
        <VListTile @click="downloadCSV">
          <VListTileTitle>{{ $tr('downloadCSV') }}</VListTileTitle>
        </VListTile>
        <VListTile
          v-if="!channel.deleted && !channel.public"
          @click="makePublicDialog = true"
        >
          <VListTileTitle>{{ $tr('makePublic') }}</VListTileTitle>
        </VListTile>
        <VListTile
          v-if="!channel.deleted && channel.public"
          @click="makePrivateDialog = true"
        >
          <VListTileTitle>{{ $tr('makePrivate') }}</VListTileTitle>
        </VListTile>
        <VListTile
          v-if="channel.deleted"
          @click="deleteDialog = true"
        >
          <VListTileTitle>{{ $tr('delete') }}</VListTileTitle>
        </VListTile>
      </VList>
    </VMenu>

  </div>

</template>


<script>

  import ConfirmationDialog from '../../components/ConfirmationDialog';

  export default {
    name: 'ChannelActionsDropdown',
    components: {
      ConfirmationDialog,
    },
    props: {
      channel: Object,
    },
    data: () => ({
      deleteDialog: false,
      makePublicDialog: false,
      makePrivateDialog: false,
      restoreDialog: false,
    }),
    computed: {
      name() {
        return this.channel.name;
      },
    },
    methods: {
      viewEditors() {},
      downloadPDF() {
        this.$store.dispatch('showSnackbarSimple', this.$tr('generatingPDF'));
      },
      downloadCSV() {
        this.$store.dispatch('showSnackbarSimple', this.$tr('generatingCSV'));
      },
      restoreHandler() {
        this.restoreDialog = false;
        this.$store.dispatch('showSnackbarSimple', this.$tr('restoreSuccess'));
      },
      deleteHandler() {
        this.deleteDialog = false;
        this.$store.dispatch('showSnackbarSimple', this.$tr('deleteSuccess'));
      },
      makePublicHandler() {
        this.makePublicDialog = false;
        this.$store.dispatch('showSnackbarSimple', this.$tr('makePublicSuccess'));
      },
      makePrivateHandler() {
        this.makePrivateDialog = false;
        this.$store.dispatch('showSnackbarSimple', this.$tr('makePrivateSuccess'));
      },
    },
    $trs: {
      delete: 'Delete permanently',
      deleteHeading: 'Permanently delete channel',
      deleteText: 'Are you sure you want to permanently delete {name}?  This can not be undone.',
      deleteSuccess: 'Channel deleted permanently',
      restore: 'Restore',
      restoreHeading: 'Restore channel',
      restoreText: 'Are you sure you want to restore {name} and make it active again?',
      restoreSuccess: 'Channel restored',
      makePublic: 'Make public',
      makePublicHeading: 'Make channel public',
      makePublicText: 'All users will be able to view and import content from {name}.',
      makePublicSuccess: 'Channel changed to public',
      makePrivate: 'Make private',
      makePrivateHeading: 'Make channel private',
      makePrivateText:
        'Only users with view-only or edit permissions will be able to access {name}.',
      makePrivateSuccess: 'Channel changed to private',
      viewEditors: 'View editors',
      downloadCSV: 'Download CSV',
      generatingCSV: 'Generating CSV...',
      // finishedCSV: 'Finished generating CSV. File sent to your email',
      downloadPDF: 'Download PDF',
      generatingPDF: 'Generating PDF...',
      // finishedPDF: 'Finished generating PDF. File sent to your email',
    },
  };

</script>


<style lang="less" scoped>
</style>
