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
            <KButton
              v-if="item.id !== user.id && (item.pending || viewOnly)"
              :text="$tr('optionsDropdown')"
              appearance="flat-button"
              hasDropdown
            >
              <template #menu>
                <KDropdownMenu
                  :constrainToScrollParent="false"
                  :options="getMenuOptions(item)"
                  @select="onMenuSelect"
                />
              </template>
            </KButton>
          </td>
        </tr>
      </template>
    </VDataTable>

    <KModal
      v-if="showRemoveViewer"
      :title="$tr('removeViewerHeader')"
      :cancelText="$tr('cancelButton')"
      :submitText="$tr('removeViewerConfirm')"
      @cancel="showRemoveViewer = false"
      @submit="handleRemoveViewer(selected)"
    >
      {{
        $tr('removeViewerText', { first_name: selected.first_name, last_name: selected.last_name })
      }}
    </KModal>

    <KModal
      v-if="showDeleteInvitation"
      :title="$tr('deleteInvitationHeader')"
      :cancelText="$tr('cancelButton')"
      :submitText="$tr('deleteInvitationConfirm')"
      @cancel="showDeleteInvitation = false"
      @submit="handleDelete(selected.id)"
    >
      {{ $tr('deleteInvitationText', { email: selected.email }) }}
    </KModal>

    <KModal
      v-if="showMakeEditor"
      :title="$tr('makeEditorHeader')"
      :cancelText="$tr('cancelButton')"
      :submitText="$tr('makeEditorConfirm')"
      @cancel="showMakeEditor = false"
      @submit="grantEditAccess(selected.id)"
    >
      {{
        $tr('makeEditorText', { first_name: selected.first_name, last_name: selected.last_name })
      }}
    </KModal>
  </div>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { SharingPermissions } from 'shared/constants';

  export default {
    name: 'ChannelSharingTable',
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
      getMenuOptions(item) {
        if (item.pending) {
          return [
            { id: 'resend-invitation', label: this.$tr('resendInvitation'), item },
            { id: 'delete-invitation', label: this.$tr('deleteInvitation'), item },
          ];
        } else {
          return [
            { id: 'make-editor', label: this.$tr('makeEditor'), item },
            { id: 'remove-viewer', label: this.$tr('removeViewer'), item },
          ];
        }
      },
      onMenuSelect(selection) {
        switch (selection.id) {
          case 'resend-invitation':
            this.resendInvitation(selection.item.email);
            break;
          case 'delete-invitation':
            this.selected = selection.item;
            this.showDeleteInvitation = true;
            break;
          case 'make-editor':
            this.selected = selection.item;
            this.showMakeEditor = true;
            break;
          case 'remove-viewer':
            this.selected = selection.item;
            this.showRemoveViewer = true;
            break;
          default:
            break;
        }
      },
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
