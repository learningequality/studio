<template>

  <div>
    <ConfirmationDialog
      v-model="restoreDialog"
      title="Restore channels"
      :text="`Are you sure you want to restore ${countText} active again?`"
      confirmButtonText="Restore"
      :confirmHandler="restoreHandler"
    />
    <ConfirmationDialog
      v-model="deleteDialog"
      title="Permanently delete channels"
      :text="`Are you sure you want to permanently delete ${countText}?  This can not be undone.`"
      confirmButtonText="Delete permanently"
      :confirmHandler="deleteHandler"
    />
    <template v-if="selected.length > 0">
      <VBtn v-if="allDeleted" small icon @click="restoreDialog = true">
        <Icon small>
          history
        </Icon>
      </VBtn>
      <VBtn small icon @click="downloadCSV">
        <Icon small>
          get_app
        </Icon>
      </VBtn>
      <VBtn small icon @click="downloadPDF">
        <Icon small>
          picture_as_pdf
        </Icon>
      </VBtn>
      <VBtn v-if="allDeleted" small icon @click="deleteDialog = true">
        <Icon small>
          delete
        </Icon>
      </VBtn>
    </template>
    <VBtn disabled small icon />
  </div>

</template>


<script>

  import { every } from 'lodash';
  import ConfirmationDialog from '../../components/ConfirmationDialog';

  export default {
    name: 'ChannelTableActions',
    components: {
      ConfirmationDialog,
    },
    props: {
      selected: Array,
    },
    data: () => ({
      deleteDialog: false,
      makePublicDialog: false,
      makePrivateDialog: false,
      restoreDialog: false,
    }),
    computed: {
      count() {
        return this.selected.length;
      },
      allDeleted() {
        return every(this.selected, channel => channel.deleted);
      },
      countText() {
        return `${this.count} ${this.count === 1 ? 'channel' : 'channels'}`;
      },
    },
    methods: {
      downloadPDF: () => {},
      downloadCSV: () => {},
      restoreHandler() {
        this.restoreDialog = false;
        this.$store.dispatch('showSnackbarSimple', 'Channels restored');
      },
      deleteHandler() {
        this.deleteDialog = false;
        this.$store.dispatch('showSnackbarSimple', 'Channel(s) deleted permanently');
      },
    },
  };

</script>


<style lang="less" scoped>
</style>
