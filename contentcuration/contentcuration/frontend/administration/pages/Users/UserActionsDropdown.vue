<template>

  <div>
    <KModal
      v-if="deleteDialog"
      title="Delete user"
      submitText="Delete"
      cancelText="Cancel"
      data-test="confirm-delete"
      @submit="deleteHandler"
      @cancel="deleteDialog = false"
    >
      <p>Are you sure you want to permanently delete {{ user.name }}'s account?</p>
    </KModal>

    <KModal
      v-if="deactivateDialog"
      title="Deactivate user"
      submitText="Deactivate"
      cancelText="Cancel"
      data-test="confirm-deactivate"
      @submit="deactivateHandler"
      @cancel="deactivateDialog = false"
    >
      <p>
        Deactivating {{ user.name }}'s account will block them from accessing their account. Are you
        sure you want to continue?
      </p>
    </KModal>
    <UserPrivilegeModal
      v-model="addAdminPrivilegeDialog"
      title="Add admin privileges"
      :text="`Are you sure you want to add admin privileges to user '${user.name}'?`"
      confirmText="Add privileges"
      :confirmAction="addAdminHandler"
    />
    <UserPrivilegeModal
      v-model="removeAdminPrivilegeDialog"
      title="Remove admin privileges"
      :text="`Are you sure you want to remove admin privileges from user '${user.name}'?`"
      confirmText="Remove privileges"
      :confirmAction="removeAdminHandler"
    />
    <EmailUsersDialog
      v-model="emailDialog"
      :initialRecipients="[userId]"
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
              @click.stop
              @click="removeAdminPrivilegeDialog = true"
            >
              <VListTileTitle>Remove admin privileges</VListTileTitle>
            </VListTile>
            <VListTile
              v-else
              data-test="addadmin"
              @click.stop
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

  import useKSnackbar from 'kolibri-design-system/lib/composables/useKSnackbar';

  import { mapActions, mapGetters, mapState } from 'vuex';

  import EmailUsersDialog from './EmailUsersDialog';
  import UserPrivilegeModal from './UserPrivilegeModal';

  export default {
    name: 'UserActionsDropdown',
    components: {
      EmailUsersDialog,
      UserPrivilegeModal,
    },
    setup() {
      const { createSnackbar } = useKSnackbar();
      return { createSnackbar };
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
          this.createSnackbar({
            text: 'User removed',
            autoDismiss: true,
            announce: true,
            duration: 6000,
          });
          this.$emit('deleted');
        });
      },
      activateHandler() {
        this.updateUser({ id: this.userId, is_active: true }).then(() => {
          this.activateDialog = false;
          this.createSnackbar({
            text: 'User activated',
            autoDismiss: true,
            announce: true,
            duration: 6000,
          });
        });
      },
      deactivateHandler() {
        this.updateUser({ id: this.userId, is_active: false }).then(() => {
          this.deactivateDialog = false;
          this.createSnackbar({
            text: 'User deactivated',
            autoDismiss: true,
            announce: true,
            duration: 6000,
          });
        });
      },
      removeAdminHandler() {
        this.updateUser({ id: this.userId, is_admin: false }).then(() => {
          this.removeAdminPrivilegeDialog = false;
          this.createSnackbar({
            text: 'Admin privilege removed',
            autoDismiss: true,
            announce: true,
            duration: 6000,
          });
        });
      },
      addAdminHandler() {
        this.updateUser({ id: this.userId, is_admin: true }).then(() => {
          this.addAdminPrivilegeDialog = false;
          this.createSnackbar({
            text: 'Admin privilege added',
            autoDismiss: true,
            announce: true,
            duration: 6000,
          });
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
