<template>

  <div>
    <h1 class="font-weight-bold mt-5 title">
      {{ header }}
    </h1>
    <VDataTable
      hide-headers
      hide-actions
      :items="tableUsers"
    >
      <template #no-data>
        <td class="px-0">
          {{ $tr('noUsersText') }}
        </td>
      </template>
      <template #items="{ item }">
        <tr :class="item.pending ? 'grey--text' : 'black--text'">
          <td
            class="pl-1 subheading text-truncate"
            style="width: 350px; max-width: 350px"
          >
            {{ getUserText(item) }}
          </td>
          <td class="subheading">
            {{ item.email }}
          </td>
          <td>
            <em
              v-if="item.pending"
              class="black--text font-weight-bold"
            >
              {{ $tr('invitePendingText') }}
            </em>
          </td>
          <td class="text-xs-right">
            <BaseMenu v-if="item.id !== user.id && (item.pending || viewOnly)">
              <template #activator="{ on }">
                <VBtn
                  flat
                  v-on="on"
                >
                  {{ $tr('optionsDropdown') }}
                  <Icon
                    class="ml-1"
                    icon="dropdown"
                  />
                </VBtn>
              </template>
              <VList>
                <template v-if="item.pending">
                  <VListTile
                    data-test="resend"
                    @click="resendInvitation(item.email)"
                  >
                    <VListTileTitle>{{ $tr('resendInvitation') }}</VListTileTitle>
                  </VListTile>
                  <VListTile
                    data-test="delete"
                    @click="
                      selected = item;
                      showDeleteInvitation = true;
                    "
                  >
                    <VListTileTitle>{{ $tr('deleteInvitation') }}</VListTileTitle>
                  </VListTile>
                </template>
                <template v-else>
                  <VListTile
                    data-test="makeeditor"
                    @click="
                      selected = item;
                      showMakeEditor = true;
                    "
                  >
                    <VListTileTitle>{{ $tr('makeEditor') }}</VListTileTitle>
                  </VListTile>
                  <VListTile
                    data-test="removeviewer"
                    @click="
                      selected = item;
                      showRemoveViewer = true;
                    "
                  >
                    <VListTileTitle>{{ $tr('removeViewer') }}</VListTileTitle>
                  </VListTile>
                </template>
              </VList>
            </BaseMenu>
          </td>
        </tr>
      </template>
    </VDataTable>

    <!-- Remove viewer confirmation -->
    <MessageDialog
      v-model="showRemoveViewer"
      :header="$tr('removeViewerHeader')"
      :text="
        $tr('removeViewerText', { first_name: selected.first_name, last_name: selected.last_name })
      "
    >
      <template #buttons="{ close }">
        <VBtn
          flat
          @click="close"
        >
          {{ $tr('cancelButton') }}
        </VBtn>
        <VBtn
          color="primary"
          data-test="confirm-remove"
          @click="handleRemoveViewer(selected)"
        >
          {{ $tr('removeViewerConfirm') }}
        </VBtn>
      </template>
    </MessageDialog>

    <!-- Delete invitation confirmation -->
    <MessageDialog
      v-model="showDeleteInvitation"
      :header="$tr('deleteInvitationHeader')"
      :text="$tr('deleteInvitationText', { email: selected.email })"
    >
      <template #buttons="{ close }">
        <VBtn
          flat
          @click="close"
        >
          {{ $tr('cancelButton') }}
        </VBtn>
        <VBtn
          color="primary"
          data-test="confirm-delete"
          @click="handleDelete(selected.id)"
        >
          {{ $tr('deleteInvitationConfirm') }}
        </VBtn>
      </template>
    </MessageDialog>

    <!-- Make editor confirmation -->
    <MessageDialog
      v-model="showMakeEditor"
      :header="$tr('makeEditorHeader')"
      :text="
        $tr('makeEditorText', { first_name: selected.first_name, last_name: selected.last_name })
      "
    >
      <template #buttons="{ close }">
        <VBtn
          flat
          @click="close"
        >
          {{ $tr('cancelButton') }}
        </VBtn>
        <VBtn
          color="primary"
          data-test="confirm-makeeditor"
          @click="grantEditAccess(selected.id)"
        >
          {{ $tr('makeEditorConfirm') }}
        </VBtn>
      </template>
    </MessageDialog>
  </div>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { SharingPermissions } from 'shared/constants';
  import MessageDialog from 'shared/views/MessageDialog';

  export default {
    name: 'ChannelSharingTable',
    components: {
      MessageDialog,
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
      mode: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        showRemoveViewer: false,
        showDeleteInvitation: false,
        showMakeEditor: false,
        selected: {},
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannelUsers', 'getChannelInvitations']),
      ...mapState({
        user: state => state.session.currentUser,
      }),
      users() {
        const users = this.getChannelUsers(this.channelId, this.mode);

        // Make sure current user is at the top of the list
        if (users.find(u => u.id === this.user.id)) {
          return [this.user].concat(users.filter(user => user.id !== this.user.id));
        }
        return users;
      },
      invitations() {
        return this.getChannelInvitations(this.channelId, this.mode).map(invitation => {
          return {
            ...invitation,
            pending: true,
          };
        });
      },
      // Remove invitations if they've been accepted
      tableUsers() {
        // Have to use email because invitation ids are ids for the invitations, not
        // the user itself.
        const channelUserEmails = this.users.map(u => u.email);
        return this.users.concat(
          this.invitations.filter(i => !channelUserEmails.includes(i.email)),
        );
      },
      header() {
        if (this.mode === SharingPermissions.EDIT) {
          return this.$tr('editorsSubheading', { count: this.users.length });
        }
        return this.$tr('viewersSubheading', { count: this.users.length });
      },
      viewOnly() {
        return this.mode === SharingPermissions.VIEW_ONLY;
      },
    },
    methods: {
      ...mapActions('channel', [
        'sendInvitation',
        'deleteInvitation',
        'makeEditor',
        'removeViewer',
      ]),
      getUserText(user) {
        const nameParams = {
          first_name: user.first_name,
          last_name: user.last_name,
        };
        if (user.email === this.user.email) {
          return this.$tr('currentUserText', nameParams);
        } else if (!user.first_name) {
          return this.$tr('guestText');
        }
        return `${user.first_name} ${user.last_name}`;
      },
      resendInvitation(email) {
        return this.sendInvitation({
          email: email,
          shareMode: this.mode,
          channelId: this.channelId,
        })
          .then(() => {
            this.$store.dispatch('showSnackbar', { text: this.$tr('invitationSentMessage') });
          })
          .catch(() => {
            this.$store.dispatch('showSnackbar', { text: this.$tr('invitationFailedError') });
          });
      },
      handleDelete(invitationId) {
        this.deleteInvitation(invitationId).then(() => {
          this.showDeleteInvitation = false;
          this.$store.dispatch('showSnackbar', { text: this.$tr('invitationDeletedMessage') });
        });
      },
      grantEditAccess(userId) {
        this.showMakeEditor = false;
        this.makeEditor({ userId, channelId: this.channelId }).then(() => {
          this.$store.dispatch('showSnackbar', {
            text: this.$tr('editPermissionsGrantedMessage'),
          });
        });
      },
      handleRemoveViewer(user) {
        const userId = user.id;
        this.showRemoveViewer = false;
        this.removeViewer({ userId, channelId: this.channelId })
          .then(() => {
            // In Vuex, delete any invitations for the same email address so they
            // do not re-appear as pending invitations
            this.invitations.forEach(invite => {
              if (invite.email === user.email) {
                this.$store.commit('channel/DELETE_INVITATION', invite.id);
              }
            });
          })
          .then(() => {
            this.$store.dispatch('showSnackbar', {
              text: this.$tr('userRemovedMessage'),
            });
          });
      },
    },
    $trs: {
      editorsSubheading:
        '{count, plural,\n =1 {# user who can edit}\n other {# users who can edit}}',
      viewersSubheading:
        '{count, plural,\n =1 {# user who can view}\n other {# users who can view}}',
      currentUserText: '{first_name} {last_name} (you)',
      guestText: 'Guest',
      noUsersText: 'No users found',
      invitePendingText: 'Invite pending',

      // Options dropdown
      optionsDropdown: 'Options',
      resendInvitation: 'Resend invitation',
      deleteInvitation: 'Delete invitation',
      makeEditor: 'Grant edit permissions',
      removeViewer: 'Revoke view permissions',

      // Snackbar messages
      invitationDeletedMessage: 'Invitation deleted',
      invitationSentMessage: 'Invitation sent',
      userRemovedMessage: 'User removed',
      editPermissionsGrantedMessage: 'Edit permissions granted',
      invitationFailedError: 'Invitation failed to resend. Please try again',

      // Confirmation dialogs
      cancelButton: 'Cancel',
      removeViewerHeader: 'Revoke view permissions',
      removeViewerText:
        'Are you sure you would like to revoke view permissions for {first_name} {last_name}?',
      removeViewerConfirm: 'Yes, revoke',
      deleteInvitationHeader: 'Delete invitation',
      deleteInvitationText: 'Are you sure you would like to delete the invitation for {email}?',
      deleteInvitationConfirm: 'Delete invitation',
      makeEditorHeader: 'Grant edit permissions',
      makeEditorText:
        'Are you sure you would like to grant edit permissions to {first_name} {last_name}?',
      makeEditorConfirm: 'Yes, grant permissions',
    },
  };

</script>
