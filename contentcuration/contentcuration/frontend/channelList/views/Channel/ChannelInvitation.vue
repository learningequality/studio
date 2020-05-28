<template>

  <div>
    <VListTile @click.stop>
      <VListTileContent>
        <VListTileTitle>{{ invitationText }}</VListTileTitle>
      </VListTileContent>

      <template v-if="!invitation.accepted && !invitation.declined">
        <VListTileAction>
          <VTooltip bottom>
            <template v-slot:activator="{ on }">
              <VBtn
                icon
                data-test="accept"
                v-on="on"
                @click="acceptInvitation(invitationID)"
              >
                <VIcon color="green" class="notranslate">
                  check
                </VIcon>
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
                <VIcon color="red" class="notranslate">
                  clear
                </VIcon>
              </VBtn>
            </template>
            <span>{{ $tr('decline') }}</span>
          </VTooltip>
        </VListTileAction>
      </template>
      <VListTileAction v-else>
        <VTooltip bottom>
          <template v-slot:activator="{ on }">
            <VBtn
              icon
              v-on="on"
              @click="invitation.accepted || invitation.declined ?
                removeInvitation(invitationID) : dialog = true"
            >
              <VIcon color="grey" class="notranslate">
                clear
              </VIcon>
            </VBtn>
          </template>
          <span>{{ $tr('clear') }}</span>
        </VTooltip>
      </VListTileAction>
    </VListTile>
    <PrimaryDialog v-model="dialog" :title="$tr('decliningInvitation')" lazy>
      {{ $tr('decliningInvitationMessage') }}
      <template v-slot:actions>
        <VSpacer />
        <VBtn flat color="primary" @click="dialog = false">
          {{ $tr('cancel') }}
        </VBtn>
        <VBtn data-test="decline-close" color="primary" @click="declineAndClose">
          {{ $tr('decline') }}
        </VBtn>
      </template>
    </PrimaryDialog>
  </div>

</template>


<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { InvitationShareModes } from '../../constants';
  import PrimaryDialog from 'shared/views/PrimaryDialog';

  export default {
    name: 'ChannelInvitation',
    components: {
      PrimaryDialog,
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
        if (this.invitation.accepted) {
          if (this.invitation.share_mode === InvitationShareModes.EDIT) {
            messageId = 'acceptedEditText';
          } else {
            messageId = 'acceptedViewText';
          }
        } else if (this.invitation.declined) {
          if (this.invitation.share_mode === InvitationShareModes.EDIT) {
            messageId = 'declinedEditText';
          } else {
            messageId = 'declinedViewText';
          }
        } else {
          if (this.invitation.share_mode === InvitationShareModes.EDIT) {
            messageId = 'editText';
          } else {
            messageId = 'viewText';
          }
        }
        return this.$tr(messageId, messageParams);
      },
    },
    methods: {
      ...mapMutations('channelList', {
        removeInvitation: 'REMOVE_INVITATION',
      }),
      ...mapActions('channelList', ['acceptInvitation', 'declineInvitation']),
      declineAndClose() {
        this.declineInvitation(this.invitationID).then(() => {
          this.dialog = false;
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
      clear: 'Clear',
      decliningInvitation: 'Declining Invitation',
      decliningInvitationMessage: 'Are you sure you want to decline this invitation?',
    },
  };

</script>

<style scoped>
  /deep/ .v-list__tile {
    height: unset;
  }
  .v-list__tile__title {
    height: unset;
    white-space: unset;
  }
</style>
