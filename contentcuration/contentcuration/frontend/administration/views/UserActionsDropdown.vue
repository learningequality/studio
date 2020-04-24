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
    <ConfirmationDialog
      v-model="emailDialog"
      :title="$tr('email')"
      :confirmButtonText="$tr('email')"
      :confirmHandler="emailHandler"
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
          v-if="!user.is_admin && user.is_active"
          @click="deactivateDialog = true"
        >
          <v-list-tile-title>{{ $tr('deactivate') }}</v-list-tile-title>
        </v-list-tile>
        <v-list-tile
          v-if="!user.is_admin && !user.is_active"
          @click="deleteDialog = true"
        >
          <v-list-tile-title>{{ $tr('delete') }}</v-list-tile-title>
        </v-list-tile>
        <v-list-tile
          @click="emailDialog = true"
        >
          <v-list-tile-title>{{ $tr('email') }}</v-list-tile-title>
        </v-list-tile>
      </v-list>
    </VMenu>

  </div>

</template>


<script>

  import ConfirmationDialog from './ConfirmationDialog';

  export default {
    name: 'UserActionsDropdown',
    components: {
      ConfirmationDialog,
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
      emailHandler() {
        this.emailDialog = false;
      },
      deleteHandler() {
        this.deleteDialog = false;
      },
      //   activateHandler() {
      //     this.activateDialog = false;
      //   },
      deactivateHandler() {
        this.deactivateDialog = false;
      },
    },

    $trs: {
      delete: 'Delete',
      deleteHeading: 'Delete user',
      deleteText: 'Are you sure you want to permanently delete this user?',
      //   activate: 'Activate',
      //   activateHeading: 'Activate user',
      //   activateText:
      //     'Activating this user will allow them to access
      // their account. Are you sure you want to continue?',
      deactivate: 'Deactivate',
      deactivateHeading: 'Deactivate user',
      deactivateText:
        'Deactivating this user will block them from accessing their account. Are you sure you want to continue?',
      email: 'Send email',
    },
  };

</script>


<style lang="less" scoped>
</style>
