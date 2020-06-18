<template>

  <div>
    <ConfirmationDialog
      v-model="deleteDialog"
      :title="$tr('deleteHeading')"
      :text="$tr('deleteText')"
      :confirmButtonText="$tr('delete')"
      :confirmHandler="deleteHandler"
    />
    <ConfirmationDialog
      v-model="deactivateDialog"
      :title="$tr('deactivateHeading')"
      :text="$tr('deactivateText')"
      :confirmButtonText="$tr('deactivate')"
      :confirmHandler="deactivateHandler"
    />
    <EmailUsersDialog
      v-model="emailDialog"
      :users="[user]"
    />



    <VMenu v-if="!user.is_admin">
      <template v-slot:activator="{ on }">
        <VBtn
          color="primary"
          light
          flat
          v-on="on"
        >
          actions
          <VIcon small>
            mdi-caret-down
          </VIcon>
        </VBtn>
      </template>
      <VList>
        <VListTile
          v-if="user.is_active"
          @click="deactivateDialog = true"
        >
          <VListTileTitle>{{ $tr('deactivate') }}</VListTileTitle>
        </VListTile>
        <VListTile
          v-if="!user.is_active"
          @click="deleteDialog = true"
        >
          <VListTileTitle>{{ $tr('delete') }}</VListTileTitle>
        </VListTile>
        <VListTile
          @click="emailDialog = true"
        >
          <VListTileTitle>{{ $tr('email') }}</VListTileTitle>
        </VListTile>
      </VList>
    </VMenu>

    <VBtn
      v-if="user.is_admin"
      color="primary"
      light
      flat
      @click="emailDialog = true"
    >
      {{ $tr('email') }}
    </VBtn>


  </div>

</template>


<script>

  import ConfirmationDialog from '../../components/ConfirmationDialog';
  import EmailUsersDialog from './EmailUsersDialog';

  export default {
    name: 'UserActionsDropdown',
    components: {
      ConfirmationDialog,
      EmailUsersDialog,
    },
    props: {
      user: Object,
    },
    data: () => ({
      emailDialog: false,
      deleteDialog: false,
      deactivateDialog: false,
      activateDialog: false,
    }),
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
      deleteHeading: 'Delete user',
      deleteText: 'Are you sure you want to permanently delete this user?',
      deleteSuccess: 'User removed',
      //   activate: 'Activate',
      //   activateHeading: 'Activate user',
      //   activateText:
      //     'Activating this user will allow them to access
      // their account. Are you sure you want to continue?',
      deactivate: 'Deactivate',
      deactivateHeading: 'Deactivate user',
      deactivateText:
        'Deactivating this user will block them from accessing their account. Are you sure you want to continue?',
      deactivateSuccess: 'User deactivated',
      email: 'Email',
    },
  };

</script>


<style lang="less" scoped>
</style>
