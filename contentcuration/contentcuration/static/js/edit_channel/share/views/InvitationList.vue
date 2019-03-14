<template>

<div class="access-list">
  <h4>
    {{ $tr('invitationsHeader') }}
    <span class="count-badge">{{ invitations.length }}</span>
  </h4>
	<p v-if="loading" class="loading">{{ $tr('loading') }}</p>
	<p v-else-if="!invitations.length" class="default-text">{{ $tr('noInvitationsText') }}</p>
	<div v-else>
		<InvitationItem v-for="invitation in invitations" :model="invitation" :key="invitation.id"/>
	</div>
</div>
</template>


<script>

import { mapGetters, mapActions } from 'vuex';
import InvitationItem from './InvitationItem.vue';

export default {
  name: 'InvitationList',
  $trs: {
  	loading: "Loading...",
    noInvitationsText: "No pending invitations found",
    invitationsHeader: "Pending invitations"
  },
  components: {
  	InvitationItem,
  },
  data() {
  	return {
  		loading: true
  	}
  },
  mounted() {
  	this.loadInvitationList().then(() => {
  		this.loading = false;
  	});
  },
  computed: mapGetters('share', ['invitations']),
  methods: mapActions('share', ['loadInvitationList'])
}

</script>


<style lang="less" scoped>
@import '../../../../less/global-variables.less';

.access-list {
	padding: 0px 0px 10px 0px;
	.default-text, .loading {
		padding: 10px 20px;
		font-size: 14pt;
		color: @gray-700;
		font-style: italic;
    &.default-text {
      color: @gray-500;
      font-size: 12pt;
    }
	}
}

</style>

.error_share_list_item{
	background-color:#FFF0F0;
}

.adding_to_list{
	background-color: #FFF1A3 !important;
}

.added_to_list{
	transition: background-color 0.5s ease;
	background-color: transparent;
}
