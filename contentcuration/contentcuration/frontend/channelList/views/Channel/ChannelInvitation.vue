<template>

  <div>
    <VListTile @click.stop>
      <VListTileContent>
        <VListTileTitle>{{ invitationText }}</VListTileTitle>
      </VListTileContent>

      <template>
        <VListTileAction>
          <VTooltip bottom>
            <template v-slot:activator="{ on }">
              <VBtn
                icon
                data-test="accept"
                v-on="on"
                @click="accept"
              >
                <Icon color="green">
                  check
                </Icon>
              </VBtn>
            </template>
            <span>{{ $tr('accept') }}</span>
          </VTooltip>
        </VListTileAction>
        <VListTileAction>
          <VTooltip bottom>
            <template v-slot:activator="{ on }">
              <VBtn
                icon
                data-test="decline"
                v-on="on"
                @click="dialog = true"
              >
                <Icon color="red">
                  clear
                </Icon>
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
      <template #buttons="{close}">
        <VSpacer />
        <VBtn flat @click="close">
          {{ $tr('cancel') }}
        </VBtn>
        <VBtn data-test="decline-close" color="primary" @click="declineAndClose">
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
        let messageId;
        if (this.invitation.share_mode === InvitationShareModes.EDIT) {
          messageId = 'editText';
        } else {
          messageId = 'viewText';
        }
        return this.$tr(messageId, messageParams);
      },
    },
    methods: {
      ...mapActions('channelList', ['acceptInvitation', 'declineInvitation']),
      accept() {
        // Get invitation before it gets deleted
        const shareMode = this.invitation.share_mode;
        const channel = this.invitation.channel_name;

        this.acceptInvitation(this.invitationID).then(() => {
          if (shareMode === InvitationShareModes.EDIT) {
            this.$store.dispatch('showSnackbar', {
              text: this.$tr('acceptedEditText', { channel }),
            });
          } else {
            this.$store.dispatch('showSnackbar', {
              text: this.$tr('acceptedViewText', { channel }),
            });
          }
        });
      },
      declineAndClose() {
        // Get invitation before it gets deleted
        const shareMode = this.invitation.share_mode;
        const channel = this.invitation.channel_name;

        this.declineInvitation(this.invitationID).then(() => {
          this.dialog = false;
          if (shareMode === InvitationShareModes.EDIT) {
            this.$store.dispatch('showSnackbar', {
              text: this.$tr('declinedEditText', { channel }),
            });
          } else {
            this.$store.dispatch('showSnackbar', {
              text: this.$tr('declinedViewText', { channel }),
            });
          }
        });
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      editText: '{sender} has invited you to edit {channel}',
      viewText: '{sender} has invited you to view {channel}',
      acceptedEditText: 'Accepted invitation to edit {channel}',
      declinedEditText: 'Declined invitation to edit {channel}',
      acceptedViewText: 'Accepted invitation to view {channel}',
      declinedViewText: 'Declined invitation to view {channel}',
      /* eslint-enable */
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
