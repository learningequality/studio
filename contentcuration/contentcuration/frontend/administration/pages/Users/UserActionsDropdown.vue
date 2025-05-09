<template>

  <div>
    <ConfirmationDialog
      v-model="deleteDialog"
      title="Delete user"
      :text="`Are you sure you want to permanently delete ${user.name}'s account?`"
      confirmButtonText="Delete"
      data-test="confirm-delete"
      @confirm="deleteHandler"
    />
    <ConfirmationDialog
      v-model="deactivateDialog"
      title="Deactivate user"
      :text="
        `Deactivating ${user.name}'s account will block them from ` +
          `accessing their account. Are you sure you want to continue?`
      "
      confirmButtonText="Deactivate"
      data-test="confirm-deactivate"
      @confirm="deactivateHandler"
    />
    <UserPrivilegeModal
      v-model="addAdminPrivilegeDialog"
      header="Add admin privileges"
      :text="`Are you sure you want to add admin privileges to user '${user.name}'?`"
      confirmText="Add privileges"
      :confirmAction="addAdminHandler"
    />
    <UserPrivilegeModal
      v-model="removeAdminPrivilegeDialog"
      header="Remove admin privileges"
      :text="`Are you sure you want to remove admin privileges from user '${user.name}'?`"
      confirmText="Remove privileges"
      :confirmAction="removeAdminHandler"
    />
    <EmailUsersDialog
      v-model="emailDialog"
      :query="{ ids: [userId] }"
    />
    <BaseMenu>
      <template #activator="{ on }">
        <VBtn
          v-bind="$attrs"
          v-on="on"
        >
          Actions
          <Icon icon="dropdown" />
        </VBtn>
      </template>
      <VList>
        <VListTile
          data-test="email"
          @click="emailDialog = true"
        >
          <VListTileTitle>Email</VListTileTitle>
        </VListTile>
        <template v-if="user.is_active">
          <template v-if="user.id !== currentId">
            <VListTile
              v-if="user.is_admin"
              data-test="removeadmin"
              @click="removeAdminPrivilegeDialog = true"
            >
              <VListTileTitle>Remove admin privileges</VListTileTitle>
            </VListTile>
            <VListTile
              v-else
              data-test="addadmin"
              @click="addAdminPrivilegeDialog = true"
            >
              <VListTileTitle>Add admin privileges</VListTileTitle>
            </VListTile>
          </template>
          <VListTile
            v-if="!user.is_admin"
            data-test="deactivate"
            @click="deactivateDialog = true"
          >
            <VListTileTitle>Deactivate</VListTileTitle>
          </VListTile>
        </template>
        <template v-else>
          <VListTile
            data-test="activate"
            @click="activateHandler"
          >
            <VListTileTitle>Activate</VListTileTitle>
          </VListTile>

          <VListTile
            v-if="!user.is_admin"
            data-test="delete"
            @click="deleteDialog = true"
          >
            <VListTileTitle>Delete</VListTileTitle>
          </VListTile>
        </template>
      </VList>
    </BaseMenu>
  </div>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import ConfirmationDialog from '../../components/ConfirmationDialog';
  import EmailUsersDialog from './EmailUsersDialog';
  import UserPrivilegeModal from './UserPrivilegeModal';

  export default {
    name: 'UserActionsDropdown',
    components: {
      ConfirmationDialog,
      EmailUsersDialog,
      UserPrivilegeModal,
    },
    props: {
      userId: {
        type: String,
        required: true,
      },
    },
    data: () => ({
      emailDialog: false,
      deleteDialog: false,
      deactivateDialog: false,
      activateDialog: false,
      removeAdminPrivilegeDialog: false,
      addAdminPrivilegeDialog: false,
    }),
    computed: {
      ...mapState({
        currentId: state => state.session.currentUser.id.toString(),
      }),
      ...mapGetters('userAdmin', ['getUser']),
      user() {
        return this.getUser(this.userId);
      },
    },
    methods: {
      ...mapActions('userAdmin', ['updateUser', 'deleteUser']),
      deleteHandler() {
        return this.deleteUser(this.userId).then(() => {
          this.deleteDialog = false;
          this.$store.dispatch('showSnackbarSimple', 'User removed');
          this.$emit('deleted');
        });
      },
      activateHandler() {
        this.updateUser({ id: this.userId, is_active: true }).then(() => {
          this.activateDialog = false;
          this.$store.dispatch('showSnackbarSimple', 'User activated');
        });
      },
      deactivateHandler() {
        this.updateUser({ id: this.userId, is_active: false }).then(() => {
          this.deactivateDialog = false;
          this.$store.dispatch('showSnackbarSimple', 'User deactivated');
        });
      },
      removeAdminHandler() {
        this.updateUser({ id: this.userId, is_admin: false }).then(() => {
          this.removeAdminPrivilegeDialog = false;
          this.$store.dispatch('showSnackbarSimple', 'Admin privilege removed');
        });
      },
      addAdminHandler() {
        this.updateUser({ id: this.userId, is_admin: true }).then(() => {
          this.addAdminPrivilegeDialog = false;
          this.$store.dispatch('showSnackbarSimple', 'Admin privilege added');
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
