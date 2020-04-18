<template>

  <div>
    <h1 class="font-weight-bold title">
      {{ $tr('inviteSubheading') }}
    </h1>
    <VForm ref="form" style="max-width: 600px;" class="py-4" @submit.prevent="submitEmail">
      <VLayout row align-center>
        <VFlex grow class="pr-2">
          <VTextField
            v-model="email"
            outline
            color="primary"
            :label="$tr('emailLabel')"
          />
        </VFlex>
        <VFlex shrink>
          <VSelect
            v-model="shareMode"
            outline
            color="primary"
            menu-props="offsetY"
            :items="permissions"
            item-value="id"
            item-text="text"
            style="max-width: 200px;"
            single-line
          />
        </VFlex>
      </VLayout>
      <VBtn color="primary" type="submit">
        {{ $tr('inviteButton') }}
      </VBtn>
    </VForm>

    <ChannelSharingTable
      v-for="permission in permissions"
      :key="`sharing-table-${permission.id}`"
      :mode="permission.id"
      :channelId="channelId"
    />
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import ChannelSharingTable from './ChannelSharingTable';
  import { SharingPermissions } from 'shared/constants';

  export default {
    name: 'ChannelSharing',
    components: {
      ChannelSharingTable,
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        email: '',
        shareMode: SharingPermissions.VIEW_ONLY,
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      permissions() {
        return [
          {
            id: SharingPermissions.EDIT,
            text: this.$tr('canEdit'),
          },
          {
            id: SharingPermissions.VIEW_ONLY,
            text: this.$tr('canView'),
          },
        ];
      },
    },
    mounted() {
      if (this.channel.edit) {
        this.shareMode = SharingPermissions.EDIT;
      }
    },
    methods: {
      // ...mapActions('share', ['sendInvitation']),
      submitEmail() {
        if (this.$refs.form.validate()) {
          this.attemptSendInvitation();
        }
      },
      attemptSendInvitation() {
        // let email = this.$refs.email.value
        // if(email.length) {
        // 	this.shareError = "";
        // 	let payload = {
        // 			email: email,
        // 			share_mode: this.$refs.share_mode.value,
        // 			...data
        // 		}
        // 		this.sharing = true;
        // 		this.sendInvitation(payload).then((data) => {
        // 			this.sharing = false;
        // 			if (data.prompt_to_upgrade) {
        // 				this.promptUpgrade();
        // 			} else if (data.reinvite) {
        // 				this.promptReinvite();
        // 			} else {
        // 				this.shareSuccess = this.$tr("invitationSentMessage", {email});
        // 				this.$refs.email.value = "";
        // 			}
        // 		}).catch((error) => {
        // 			this.shareError = error;
        // 			this.sharing = false;
        // 		})
        // }
      },
    },
    $trs: {
      inviteSubheading: 'Invite collaborators',
      emailLabel: 'Email',
      canEdit: 'Can edit',
      canView: 'Can view',
      inviteButton: 'Send invitation',
    },
  };

</script>


<style lang="less" scoped>

</style>
