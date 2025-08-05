<template>

  <div>
    <li class="invitation">
      <div class="invitation__main">
        <div class="invitation__main--left">
          {{ invitationText }} 
        </div>
        <div class="invitation__main--right">
          <div class="invitation__main--right__btn-one">
            <KIconButton
              :tooltip="$tr('accept')"
              text="Flat button"
              :primary="true"
              icon="check"
              :color="$themePalette.green.v_600"
              data-test="accept"
              appearance="flat-button"
              @click="accept"
            />
          </div>
          <div class="invitation__main--right__btn-two">
            <KIconButton
              :tooltip="$tr('decline')"
              text="Flat button"
              :primary="true"
              icon="close"
              :color="$themePalette.red.v_500"
              data-test="decline"
              appearance="flat-button"
              @click="dialog = true"
            />
          </div>
        </div>
      </div>
    </li>
    <KModal
      v-if="dialog"
      size="small"
      :title="$tr('decliningInvitation')"
    >
      <template>
        {{ $tr('decliningInvitationMessage') }}
      </template>
      <template #actions>
        <div class="modal-actions">
          <div class="modal-actions__close">
            <KButton @click="close">{{ $tr('cancel') }} </KButton>
          </div>
          <div class="modal-actions__decline">
            <KButton
              :primary="true"
              appearance="raised-button"
              data-test="decline-close"
              @click="declineAndClose"
            >
              {{ $tr('decline') }}
            </KButton>
          </div>
        </div>
      </template>
    </KModal>
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
      close() {
        this.dialog = false;
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


<style lang="scss" scoped>

  /deep/ .v-list__tile {
    height: unset;
    padding: 16px;
    cursor: default;
  }

  .v-list__tile__title {
    height: unset;
    white-space: unset;
  }

  .invitation {
    list-style: none;
    font-size: 16px;
    padding: 16px 16px 0 16px;
    &__main{ 
      display: flex;
      align-items: center;
      justify-content: space-between;
      &--right {
        display: flex;
        flex-direction: row;
        [dir='ltr'] &__btn-one {
          margin-right: 15px;
          margin-left: 0;
        }
        [dir='rtl'] &__btn-two, &__btn-one {
          margin-right: 0;
          margin-left: 15px;
        }
      }
    }
  }

  .modal-actions {
    display: flex;
    justify-content: end;
    &__close {
      margin-right: 10px;
    }
  }

</style>
