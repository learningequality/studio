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
      :text="`Deactivating ${user.name}'s account will block them from ` +
        `accessing their account. Are you sure you want to continue?`"
      confirmButtonText="Deactivate"
      data-test="confirm-deactivate"
      @confirm="deactivateHandler"
    />
    <EmailUsersDialog
      v-model="emailDialog"
      :query="{ ids: [userId] }"
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
        <VListTile data-test="email" @click="emailDialog = true">
          <VListTileTitle>Email</VListTileTitle>
        </VListTile>
        <template v-if="user.is_active">
          <VListTile
            v-if="!user.is_admin"
            data-test="deactivate"
            @click="deactivateDialog = true"
          >
            <VListTileTitle>Deactivate</VListTileTitle>
          </VListTile>
        </template>
        <template v-else>
          <VListTile data-test="activate" @click="activateHandler">
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
    },
  };

</script>


<style lang="less" scoped>
</style>
