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
        <v-btn
          color="primary"
          light
          flat
          v-on="on"
        >
          actions
        </v-btn>
      </template>
      <v-list>
        <v-list-tile
          v-if="channel.deleted"
          @click="restoreDialog = true"
        >
          <v-list-tile-title>{{ $tr('restore') }}</v-list-tile-title>
        </v-list-tile>
        <v-list-tile
          v-if="!channel.deleted"
          @click="viewEditors"
        >
          <v-list-tile-title>{{ $tr('viewEditors') }}</v-list-tile-title>
        </v-list-tile>
        <v-list-tile @click="downloadPDF">
          <v-list-tile-title>{{ $tr('downloadPDF') }}</v-list-tile-title>
        </v-list-tile>
        <v-list-tile @click="downloadCSV">
          <v-list-tile-title>{{ $tr('downloadCSV') }}</v-list-tile-title>
        </v-list-tile>
        <v-list-tile
          v-if="!channel.deleted && !channel.public"
          @click="makePublicDialog = true"
        >
          <v-list-tile-title>{{ $tr('makePublic') }}</v-list-tile-title>
        </v-list-tile>
        <v-list-tile
          v-if="!channel.deleted && channel.public"
          @click="makePrivateDialog = true"
        >
          <v-list-tile-title>{{ $tr('makePrivate') }}</v-list-tile-title>
        </v-list-tile>
        <v-list-tile
          v-if="channel.deleted"
          @click="deleteDialog = true"
        >
          <v-list-tile-title>{{ $tr('delete') }}</v-list-tile-title>
        </v-list-tile>
      </v-list>
    </VMenu>

  </div>

</template>


<script>

  import ConfirmationDialog from './ConfirmationDialog';

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
      downloadPDF: () => {},
      downloadCSV: () => {},
      viewEditors: () => {},
      restoreHandler() {
        this.restoreDialog = false;
      },
      deleteHandler() {
        this.deleteDialog = false;
      },
      makePublicHandler() {
        this.makePublicDialog = false;
      },
      makePrivateHandler() {
        this.makePrivateDialog = false;
      },
    },
    $trs: {
      delete: 'Delete permanently',
      deleteHeading: 'Permanently delete channel',
      deleteText: 'Are you sure you want to permanently delete {name}?  This can not be undone.',
      restore: 'Restore',
      restoreHeading: 'Restore channel',
      restoreText: 'Are you sure you want to restore {name} and make it active again?',
      makePublic: 'Make public',
      makePublicHeading: 'Make channel public',
      makePublicText: 'All users will be able to view and import content from {name}.',
      makePrivate: 'Make private',
      makePrivateHeading: 'Make channel private',
      makePrivateText:
        'Only users with view-only or edit permissions will be able to access {name}.',
      viewEditors: 'View editors',
      downloadCSV: 'Download CSV',
      downloadPDF: 'Download PDF',
    },
  };

</script>


<style lang="less" scoped>
</style>
