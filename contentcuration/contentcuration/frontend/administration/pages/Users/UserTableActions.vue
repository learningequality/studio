<template>

  <div>
    <ConfirmationDialog
      v-model="deleteDialog"
      :title="$tr('deleteHeading')"
      :text="$tr('deleteText', {count})"
      :confirmButtonText="$tr('delete')"
      :confirmHandler="deleteHandler"
    />
    <ConfirmationDialog
      v-model="deactivateDialog"
      :title="$tr('deactivateHeading')"
      :text="$tr('deactivateText', {count})"
      :confirmButtonText="$tr('deactivate')"
      :confirmHandler="deactivateHandler"
    />
    <EmailUsersDialog
      v-model="emailDialog"
      :users="selected"
    />

    <template v-if="selected.length > 0">
      <VBtn v-if="!anyAreAdmin && allActive" small icon @click="deactivateDialog = true">
        <VIcon small>
          remove_circle_outline
        </VIcon>
      </VBtn>
      <VBtn v-if="!anyAreAdmin && allInactive" small icon @click="deleteDialog = true">
        <VIcon small>
          delete
        </VIcon>
      </VBtn>
      <VBtn small icon @click="emailDialog = true">
        <VIcon small>
          email
        </VIcon>
      </VBtn>
    </template>
    <VBtn disabled small icon />
  </div>

</template>


<script>

  import { every, find } from 'lodash';
  import ConfirmationDialog from '../../components/ConfirmationDialog';
  import EmailUsersDialog from './EmailUsersDialog';

  export default {
    name: 'UserTableActions',
    components: {
      ConfirmationDialog,
      EmailUsersDialog,
    },
    props: {
      selected: Array,
    },
    data: () => ({
      emailDialog: false,
      deleteDialog: false,
      deactivateDialog: false,
    }),
    computed: {
      count() {
        return this.selected.length;
      },
      allActive() {
        return every(this.selected, user => user.is_active);
      },
      allInactive() {
        return every(this.selected, user => !user.is_active);
      },
      anyAreAdmin() {
        return find(this.selected, user => user.is_admin);
      },
    },
    methods: {
      deleteHandler() {
        this.deleteDialog = false;
        this.$store.dispatch('showSnackbarSimple', this.$tr('deleteSuccess'));
      },
      //   activateHandler() {
      //     this.activateDialog = false;
      //   },
      deactivateHandler() {
        this.deactivateDialog = false;
        this.$store.dispatch('showSnackbarSimple', this.$tr('deactivateSuccess'));
      },
    },

    $trs: {
      delete: 'Delete',
      deleteHeading: 'Delete users',
      deleteText:
        'Are you sure you want to permanently delete {count, plural,\n =1 {this user} \n other {these users}}?',
      deleteSuccess: 'Users deleted',
      // activate: "Activate",
      // activateHeading: "Activate users",
      // activateText: "Activating {count, plural,\n =1 {this user} \n other
      // {these users} will allow them to access their account. Are you sure you want to continue?
      deactivate: 'Deactivate',
      deactivateHeading: 'Deactivate users',
      deactivateText:
        'Deactivating {count, plural,\n =1 {this user} \n other {these users}} will block them from accessing their account. Are you sure you want to continue?',
      deactivateSuccess: 'Users deactivated',
      // sendEmail: "Send email",
    },
  };

</script>


<style lang="less" scoped>
</style>
