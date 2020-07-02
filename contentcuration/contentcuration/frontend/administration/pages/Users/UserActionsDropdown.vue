<template>

  <div>
    <ConfirmationDialog
      v-model="deleteDialog"
      title="Delete user"
      :text="`Are you sure you want to permanently delete ${user.name}'s account?`"
      confirmButtonText="Delete"
      :confirmHandler="deleteHandler"
    />
    <ConfirmationDialog
      v-model="deactivateDialog"
      title="Deactivate user"
      :text="`Deactivating ${user.name}'s account will block them from ` +
        `accessing their account. Are you sure you want to continue?`"
      confirmButtonText="Deactivate"
      :confirmHandler="deactivateHandler"
    />
    <EmailUsersDialog
      v-model="emailDialog"
      :userIds="[userId]"
    />
    <VMenu offsetY>
      <template #activator="{ on }">
        <VBtn v-bind="$attrs" v-on="on">
          Actions
          <Icon small>
            arrow_drop_down
          </Icon>
        </VBtn>
      </template>
      <VList>
        <VListTile v-if="!user.is_active" @click="activateHandler">
          <VListTileTitle>Activate</VListTileTitle>
        </VListTile>
        <VListTile
          v-else-if="!user.is_admin"
          @click="deactivateDialog = true"
        >
          <VListTileTitle>Deactivate</VListTileTitle>
        </VListTile>
        <VListTile
          v-if="!user.is_active && !user.is_admin"
          @click="deleteDialog = true"
        >
          <VListTileTitle>Delete</VListTileTitle>
        </VListTile>
        <VListTile @click="emailDialog = true">
          <VListTileTitle>Email</VListTileTitle>
        </VListTile>
      </VList>
    </VMenu>
  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import ConfirmationDialog from '../../components/ConfirmationDialog';
  import EmailUsersDialog from './EmailUsersDialog';

  export default {
    name: 'UserActionsDropdown',
    components: {
      ConfirmationDialog,
      EmailUsersDialog,
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
    }),
    computed: {
      ...mapGetters('userAdmin', ['getUser']),
      user() {
        return this.getUser(this.userId);
      },
    },
    methods: {
      ...mapActions('userAdmin', ['updateUser', 'deleteUser']),
      deleteHandler() {
        this.deleteUser(this.userId).then(() => {
          this.deleteDialog = false;
          this.$store.dispatch('showSnackbarSimple', 'User removed');
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
    },
  };

</script>


<style lang="less" scoped>
</style>
