<template>

  <div>
    <h1 class="font-weight-bold title mt-5">
      {{ header }}
    </h1>
    <VDataTable
      hide-headers
      hide-actions
      :items="users.concat(invitations)"
    >
      <template #no-data>
        <td class="px-0">
          {{ $tr('noUsersText') }}
        </td>
      </template>
      <template #items="{item}">
        <tr :class="item.pending? 'grey--text' : 'black--text'">
          <td class="pl-1 text-truncate subheading" style="width: 350px; max-width: 350px;">
            {{ getUserText(item) }}
          </td>
          <td class="subheading">
            {{ item.email }}
          </td>
          <td>
            <em v-if="item.pending" class="black--text font-weight-bold">
              {{ $tr('invitePendingText') }}
            </em>
          </td>
          <td class="text-xs-right">
            <VMenu v-if="item.pending || viewOnly" offset-y>
              <template v-slot:activator="{ on }">
                <VBtn flat v-on="on">
                  {{ $tr('optionsDropdown') }}
                  <Icon class="ml-1">
                    arrow_drop_down
                  </Icon>
                </VBtn>
              </template>
              <VList>
                <template v-if="item.pending">
                  <VListTile @click="resendInvitation(item.email)">
                    <VListTileTitle>{{ $tr('resendInvitation') }}</VListTileTitle>
                  </VListTile>
                  <VListTile @click="selected = item; showDeleteInvitation = true">
                    <VListTileTitle>{{ $tr('deleteInvitation') }}</VListTileTitle>
                  </VListTile>
                </template>
                <template v-else-if="channel.edit">
                  <VListTile @click="selected = item; showMakeEditor = true">
                    <VListTileTitle>{{ $tr('makeEditor') }}</VListTileTitle>
                  </VListTile>
                  <VListTile @click="selected = item; showRemoveViewer = true">
                    <VListTileTitle>{{ $tr('removeViewer') }}</VListTileTitle>
                  </VListTile>
                </template>
              </VList>
            </VMenu>
          </td>
        </tr>
      </template>
    </VDataTable>

    <!-- Remove viewer confirmation -->
    <MessageDialog
      v-model="showRemoveViewer"
      :header="$tr('removeViewerHeader')"
      :text="$tr('removeViewerText',
                 {first_name: selected.first_name, last_name: selected.last_name})"
    >
      <template #buttons="{close}">
        <VBtn flat @click="close">
          {{ $tr('cancelButton') }}
        </VBtn>
        <VBtn color="primary" @click="handleRemoveViewer(selected.id)">
          {{ $tr('removeViewerConfirm') }}
        </VBtn>
      </template>
    </MessageDialog>

    <!-- Delete invitation confirmation -->
    <MessageDialog
      v-model="showDeleteInvitation"
      :header="$tr('deleteInvitationHeader')"
      :text="$tr('deleteInvitationText', {email: selected.email})"
    >
      <template #buttons="{close}">
        <VBtn flat @click="close">
          {{ $tr('cancelButton') }}
        </VBtn>
        <VBtn color="primary" @click="handleDelete(selected.id)">
          {{ $tr('deleteInvitationConfirm') }}
        </VBtn>
      </template>
    </MessageDialog>

    <!-- Make editor confirmation -->
    <MessageDialog
      v-model="showMakeEditor"
      :header="$tr('makeEditorHeader')"
      :text="$tr('makeEditorText',
                 {first_name: selected.first_name, last_name: selected.last_name})"
    >
      <template #buttons="{close}">
        <VBtn flat @click="close">
          {{ $tr('cancelButton') }}
        </VBtn>
        <VBtn color="primary" @click="grantEditAccess(selected.id)">
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
      ...mapGetters('channel', ['getChannel', 'getChannelUsers', 'getChannelInvitations']),
      ...mapState({
        user: state => state.session.currentUser,
      }),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      users() {
        let users = this.getChannelUsers(this.channelId, this.mode).filter(
          user => user.id !== this.user.id
        );

        // Make sure current user is at the top of the list
        if (this.mode === SharingPermissions.EDIT && this.channel.edit) {
          return [this.user].concat(users);
        } else if (this.mode === SharingPermissions.VIEW_ONLY && this.channel.view) {
          return [this.user].concat(users);
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
        let nameParams = {
          first_name: user.first_name,
          last_name: user.last_name,
        };
        if (user.email === this.user.email) {
          return this.$tr('currentUserText', nameParams);
        } else if (!user.first_name) {
          return this.$tr('guestText');
        }
        return this.$tr('userText', nameParams);
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
      handleRemoveViewer(userId) {
        this.showRemoveViewer = false;
        this.removeViewer({ userId, channelId: this.channelId }).then(() => {
          this.$store.dispatch('showSnackbar', {
            text: this.$tr('userRemovedMessage'),
          });
        });
      },
    },
    $trs: {
      editorsSubheading: '{count, plural,\n =1 {# editor}\n other {# editors}}',
      viewersSubheading: '{count, plural,\n =1 {# viewer}\n other {# viewers}}',
      currentUserText: '{first_name} {last_name} (you)',
      userText: '{first_name} {last_name}',
      guestText: 'Guest',
      noUsersText: 'No users found',
      invitePendingText: 'Invite pending',

      // Options dropdown
      optionsDropdown: 'Options',
      resendInvitation: 'Resend invitation',
      deleteInvitation: 'Delete invitation',
      makeEditor: 'Make editor',
      removeViewer: 'Remove viewer',

      // Snackbar messages
      invitationDeletedMessage: 'Invitation deleted',
      invitationSentMessage: 'Invitation sent',
      userRemovedMessage: 'User removed',
      editPermissionsGrantedMessage: 'Edit permissions granted',
      invitationFailedError: 'Unable to resend your invitation. Please try again',

      // Confirmation dialogs
      cancelButton: 'Cancel',
      removeViewerHeader: 'Remove viewer',
      removeViewerText:
        'Are you sure you would like to remove {first_name} {last_name} from viewing your channel?',
      removeViewerConfirm: 'Yes, remove',
      deleteInvitationHeader: 'Delete invitation',
      deleteInvitationText: 'Are you sure you would like to uninvite {email}?',
      deleteInvitationConfirm: 'Yes, uninvite',
      makeEditorHeader: 'Make editor',
      makeEditorText: 'Are you sure you would like to make {first_name} {last_name} an editor?',
      makeEditorConfirm: 'Yes, make editor',
    },
  };

</script>
