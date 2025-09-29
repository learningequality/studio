<template>

  <div>
    <VListTile @click.stop>
      <VListTileContent>
        <VListTileTitle>{{ invitationText }}</VListTileTitle>
      </VListTileContent>

      <template>
        <VListTileAction>
          <VTooltip
            bottom
            lazy
          >
            <template #activator="{ on }">
              <VBtn
                icon
                data-test="accept"
                v-on="on"
                @click="accept"
              >
                <Icon icon="done" />
              </VBtn>
            </template>
            <span>{{ $tr('accept') }}</span>
          </VTooltip>
        </VListTileAction>
        <VListTileAction>
          <VTooltip
            bottom
            lazy
          >
            <template #activator="{ on }">
              <VBtn
                icon
                data-test="decline"
                v-on="on"
                @click="dialog = true"
              >
                <Icon
                  color="red"
                  icon="clear"
                />
              </VBtn>
            </template>
            <span>{{ $tr('decline') }}</span>
          </VTooltip>
        </VListTileAction>
      </template>
    </VListTile>
    <MessageDialog
      v-model="dialog"
      :header="$tr('decliningInvitation')"
      :text="$tr('decliningInvitationMessage')"
    >
      <template #buttons="{ close }">
        <VSpacer />
        <VBtn
          flat
          @click="close"
        >
          {{ $tr('cancel') }}
        </VBtn>
        <VBtn
          data-test="decline-close"
          color="primary"
          @click="declineAndClose"
        >
          {{ $tr('decline') }}
        </VBtn>
      </template>
    </MessageDialog>
  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { InvitationShareModes } from '../../constants';
  import MessageDialog from 'shared/views/MessageDialog';

  export default {
    name: 'ChannelInvitation',
    components: {
      MessageDialog,
    },
    props: {
      invitationID: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        dialog: false,
      };
    },
    computed: {
      ...mapGetters('channelList', ['getInvitation']),
      invitation() {
        return this.getInvitation(this.invitationID);
      },
      invitationText() {
        const messageParams = {
          channel: this.invitation.channel_name,
          sender: this.invitation.sender_name,
        };
        if (this.invitation.share_mode === InvitationShareModes.EDIT) {
          return this.$tr('editText', messageParams);
        } else {
          return this.$tr('viewText', messageParams);
        }
      },
    },
    methods: {
      ...mapActions('channelList', ['acceptInvitation', 'declineInvitation']),
      accept() {
        const channelId = this.invitation.channel;
        this.acceptInvitation(this.invitationID).then(() => {
          this.$store.dispatch('showSnackbar', {
            text: this.$tr('acceptedSnackbar'),
            actionText: this.$tr('goToChannelSnackbarAction'),
            actionCallback: () => {
              window.location = window.Urls.channel(channelId);
            },
          });
        });
      },
      declineAndClose() {
        this.declineInvitation(this.invitationID).then(() => {
          this.dialog = false;
          this.$store.dispatch('showSnackbarSimple', this.$tr('declinedSnackbar'));
        });
      },
    },
    $trs: {
      editText: '{sender} has invited you to edit {channel}',
      viewText: '{sender} has invited you to view {channel}',
      goToChannelSnackbarAction: 'Go to channel',
      acceptedSnackbar: 'Accepted invitation',
      declinedSnackbar: 'Declined invitation',
      accept: 'Accept',
      decline: 'Decline',
      cancel: 'Cancel',
      decliningInvitation: 'Declining Invitation',
      decliningInvitationMessage: 'Are you sure you want to decline this invitation?',
    },
  };

</script>


<style scoped>

  /deep/ .v-list__tile {
    height: unset;
    padding: 16px;
    cursor: default;
  }

  .v-list__tile__title {
    height: unset;
    white-space: unset;
  }

</style>
