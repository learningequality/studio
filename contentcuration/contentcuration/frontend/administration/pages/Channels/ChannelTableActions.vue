<template>

  <div>
    <ConfirmationDialog
      v-model="restoreDialog"
      :title="$tr('restoreHeading')"
      :text="$tr('restoreText', {count})"
      :confirmButtonText="$tr('restore')"
      :confirmHandler="restoreHandler"
    />
    <ConfirmationDialog
      v-model="deleteDialog"
      :title="$tr('deleteHeading')"
      :text="$tr('deleteText', {count})"
      :confirmButtonText="$tr('delete')"
      :confirmHandler="deleteHandler"
    />

    <template v-if="selected.length > 0">
      <VBtn v-if="allDeleted" small icon @click="restoreDialog = true">
        <VIcon small>
          history
        </VIcon>
      </VBtn>
      <VBtn small icon @click="downloadCSV">
        <VIcon small>
          get_app
        </VIcon>
      </VBtn>
      <VBtn small icon @click="downloadPDF">
        <VIcon small>
          picture_as_pdf
        </VIcon>
      </VBtn>
      <VBtn v-if="allDeleted" small icon @click="deleteDialog = true">
        <VIcon small>
          delete
        </VIcon>
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
    },
    methods: {
      downloadPDF: () => {},
      downloadCSV: () => {},
      //   viewEditors: () => {},
      restoreHandler() {
        this.restoreDialog = false;
        this.$store.dispatch('showSnackbarSimple', this.$tr('restoreSuccess'));
      },
      deleteHandler() {
        this.deleteDialog = false;
        this.$store.dispatch('showSnackbarSimple', this.$tr('deleteSuccess'));
      },
    },
    $trs: {
      delete: 'Delete permanently',
      deleteHeading: 'Permanently delete channels',
      deleteText:
        'Are you sure you want to permanently delete {count, plural,\n =1 {this channel} \n other {these # channels}}?  This can not be undone.',
      deleteSuccess: 'Channel(s) deleted permanently',
      restore: 'Restore',
      restoreHeading: 'Restore channels',
      restoreText:
        'Are you sure you want to restore {count, plural,\n =1 {this channel and make it} \n other {these # channels and make them}} active again?',
      restoreSuccess: 'Channels restored',
      //   downloadCSV: 'Download CSV',
      //   downloadPDF: 'Download PDF',
    },
  };

</script>


<style lang="less" scoped>
</style>
