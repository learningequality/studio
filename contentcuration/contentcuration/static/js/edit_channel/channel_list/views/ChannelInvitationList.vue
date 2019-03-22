<template>
  <div class="invitation-list">
    <div v-if="loading" class="default-item">
      {{ $tr('loading') }}
    </div>
    <div v-else>
      <ChannelInvitationItem
        v-for="invitation in invitations"
        :key="invitation.id"
        :invitationID="invitation.id"
        @acceptedInvitation="acceptedInvitation"
      />
    </div>
  </div>
</template>

<script>

  import { mapGetters, mapActions } from 'vuex';
  import { ChannelInvitationMapping } from './../constants';
  import ChannelInvitationItem from './ChannelInvitationItem.vue';

  export default {
    name: 'ChannelInvitationList',
    $trs: {
      loading: 'Checking for invitations...',
    },
    components: {
      ChannelInvitationItem,
    },
    data() {
      return {
        loading: true,
      };
    },
    computed: mapGetters('channel_list', ['invitations']),
    mounted() {
      this.loadChannelInvitationList().then(() => {
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('channel_list', ['loadChannelInvitationList']),
      acceptedInvitation(shareMode) {
        this.$emit('setActiveList', ChannelInvitationMapping[shareMode]);
      },
    },
  };

</script>


<style lang="less" scoped>

  .invitation-list {
    padding-top: 20px;
    .default-item {
      font-size: 12pt;
      font-weight: normal;
    }
  }

</style>
