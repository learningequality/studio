<template>

  <li class="invitation">
    <div class="invitation__main">
      <div class="invitation__main--left">
        {{ invitationText }}
      </div>
      <div class="invitation__main--right">
        <div class="invitation__main--right__btn-one">
          <KIconButton
            :tooltip="organizationStrings.accept$({ organization: invitation.organization_name })"
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
            :tooltip="organizationStrings.declineTooltip$({ organization: invitation.organization_name })"
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
      :submitText="organizationStrings.decline$()"
      :cancelText="organizationStrings.cancel$()"
      :title="organizationStrings.decliningInvitation$()"
      data-testid="organization-invitation-modal"
      @submit="declineAndClose"
      @cancel="dialog = false"
    >
      <template>
        {{ organizationStrings.decliningInvitationMessage$() }}
      </template>
    </KModal>
  </li>

</template>


<script>

  import { InvitationShareModes } from '../../constants';
  import { organizationStrings } from 'shared/strings/organizationStrings';

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
        organizationStrings,
      };
    },
    computed: {
      invitationText() {
        const messageParams = {
          organization: this.invitation.organization_name,
          sender: this.invitation.sender_name,
        };
        if (this.invitation.share_mode === InvitationShareModes.ADMIN) {
          return organizationStrings.ownText$(messageParams);
        } else if (this.invitation.share_mode === InvitationShareModes.EDIT) {
          return organizationStrings.editText$(messageParams);
        }
        return organizationStrings.viewText$(messageParams);
      },
    },
    methods: {
      declineAndClose() {
        this.$emit('decline');
        this.dialog = false;
      },
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
