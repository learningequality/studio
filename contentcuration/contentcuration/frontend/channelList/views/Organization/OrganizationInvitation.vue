<template>

  <li class="invitation">
    <div class="invitation__main">
      <div class="invitation__main--left">
        {{ invitationText }}
      </div>
      <div class="invitation__main--right">
        <div class="invitation__main--right__btn-one">
          <KIconButton
            :tooltip="$tr('accept', { organization: invitation.organization_name })"
            :primary="true"
            icon="check"
            :color="$themePalette.green.v_600"
            data-test="accept"
            appearance="flat-button"
            @click="$emit('accept')"
          />
        </div>
        <div class="invitation__main--right__btn-two">
          <KIconButton
            :tooltip="$tr('declineTooltip', { organization: invitation.organization_name })"
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

    <KModal
      v-if="dialog"
      size="small"
      :submitText="$tr('decline')"
      :cancelText="$tr('cancel')"
      :title="$tr('decliningInvitation')"
      data-testid="organization-invitation-modal"
      @submit="declineAndClose"
      @cancel="dialog = false"
    >
      <template>
        {{ $tr('decliningInvitationMessage') }}
      </template>
    </KModal>
  </li>

</template>


<script>

  import { InvitationShareModes } from '../../constants';

  export default {
    name: 'OrganizationInvitation',
    props: {
      invitation: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        dialog: false,
      };
    },
    computed: {
      invitationText() {
        const messageParams = {
          organization: this.invitation.organization_name,
          sender: this.invitation.sender_name,
        };
        if (this.invitation.share_mode === InvitationShareModes.ADMIN) {
          return this.$tr('ownText', messageParams);
        } else if (this.invitation.share_mode === InvitationShareModes.EDIT) {
          return this.$tr('editText', messageParams);
        }
        return this.$tr('viewText', messageParams);
      },
    },
    methods: {
      declineAndClose() {
        this.$emit('decline');
        this.dialog = false;
      },
    },
    $trs: {
      editText: '{sender} has invited you to edit {organization}',
      viewText: '{sender} has invited you to view {organization}',
      ownText: '{sender} has invited you to own {organization}',
      accept: 'Accept invitation to {organization}',
      declineTooltip: 'Decline invitation to {organization}',
      decline: 'Decline',
      cancel: 'Cancel',
      decliningInvitation: 'Declining invitation',
      decliningInvitationMessage: 'Are you sure you want to decline this invitation?',
    },
  };

</script>


<style lang="scss" scoped>

  .invitation {
    padding: 16px 16px 0;
    font-size: 16px;
    list-style: none;

    &__main {
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

        [dir='rtl'] &__btn-two,
        &__btn-one {
          margin-right: 0;
          margin-left: 15px;
        }
      }
    }
  }

</style>
