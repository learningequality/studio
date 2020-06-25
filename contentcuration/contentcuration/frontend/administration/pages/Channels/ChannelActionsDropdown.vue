<template>

  <div>
    <ConfirmationDialog
      v-model="restoreDialog"
      title="Restore channel"
      :text="`Are you sure you want to restore ${name} and make it active again?`"
      confirmButtonText="Restore"
      :confirmHandler="restoreHandler"
    />

    <ConfirmationDialog
      v-model="makePublicDialog"
      title="Make channel public"
      :text="`All users will be able to view and import content from ${name}.`"
      confirmButtonText="Make public"
      :confirmHandler="makePublicHandler"
    />
    <ConfirmationDialog
      v-model="makePrivateDialog"
      title="Make channel private"
      :text="`Only users with view-only or edit permissions will be able to access ${name}.`"
      confirmButtonText="Make private"
      :confirmHandler="makePrivateHandler"
    />
    <ConfirmationDialog
      v-model="deleteDialog"
      title="Permanently delete channel"
      :text="`Are you sure you want to permanently delete ${name}?  This can not be undone.`"
      confirmButtonText="Delete permanently"
      :confirmHandler="deleteHandler"
    />
    <VMenu offset-y>
      <template #activator="{ on }">
        <VBtn flat v-on="on">
          actions
          <Icon class="ml-1">
            arrow_drop_down
          </Icon>
        </VBtn>
      </template>
      <VList>
        <VListTile
          v-if="channel.deleted"
          @click="restoreDialog = true"
        >
          <VListTileTitle>Restore</VListTileTitle>
        </VListTile>
        <VListTile
          v-if="!channel.deleted"
          :to="searchChannelEditorsLink"
          target="_blank"
        >
          <VListTileTitle>View editors</VListTileTitle>
        </VListTile>
        <VListTile @click="downloadPDF">
          <VListTileTitle>Download PDF</VListTileTitle>
        </VListTile>
        <VListTile @click="downloadCSV">
          <VListTileTitle>Download CSV</VListTileTitle>
        </VListTile>
        <VListTile
          v-if="!channel.deleted && !channel.public"
          @click="makePublicDialog = true"
        >
          <VListTileTitle>Make public</VListTileTitle>
        </VListTile>
        <VListTile
          v-if="!channel.deleted && channel.public"
          @click="makePrivateDialog = true"
        >
          <VListTileTitle>Make private</VListTileTitle>
        </VListTile>
        <VListTile
          v-if="channel.deleted"
          @click="deleteDialog = true"
        >
          <VListTileTitle>Delete permanently</VListTileTitle>
        </VListTile>
      </VList>
    </VMenu>

  </div>

</template>


<script>

  import ConfirmationDialog from '../../components/ConfirmationDialog';
  import { RouterNames } from '../../constants';

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
      searchChannelEditorsLink() {
        return {
          name: RouterNames.USERS,
          query: {
            search: `${this.name} ${this.channel.id}`,
          },
        };
      },
    },
    methods: {
      downloadPDF() {
        this.$store.dispatch('showSnackbarSimple', 'Generating PDF...');
      },
      downloadCSV() {
        this.$store.dispatch('showSnackbarSimple', 'Generating CSV...');
      },
      restoreHandler() {
        this.restoreDialog = false;
        this.$store.dispatch('showSnackbarSimple', 'Channel restored');
      },
      deleteHandler() {
        this.deleteDialog = false;
        this.$store.dispatch('showSnackbarSimple', 'Channel deleted permanently');
      },
      makePublicHandler() {
        this.makePublicDialog = false;
        this.$store.dispatch('showSnackbarSimple', 'Channel changed to public');
      },
      makePrivateHandler() {
        this.makePrivateDialog = false;
        this.$store.dispatch('showSnackbarSimple', 'Channel changed to private');
      },
    },
  };

</script>


<style lang="less" scoped>
</style>
