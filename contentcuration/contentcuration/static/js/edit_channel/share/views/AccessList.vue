<template>

<div class="access-list">
  <h4>
    {{ $tr('accessListHeader') }}
    <span v-if="!loading" class="count-badge">{{ accessList.length }}</span>
  </h4>
  <UserItem :model="currentUser"/>

	<p v-if="loading" class="loading">{{ $tr('loading') }}</p>
	<div v-else>
		<UserItem v-for="user in accessList" v-if="currentUser.id !== user.id" :model="user" :key="user.id"/>
	</div>
</div>
</template>


<script>

import { mapGetters, mapActions } from 'vuex';
import UserItem from './UserItem.vue';
import State from 'edit_channel/state';

export default {
  name: 'AccessList',
  $trs: {
  	loading: "Loading...",
    accessListHeader: "Channel collaborators",
  },
  components: {
  	UserItem,
  },
  data() {
  	return {
  		loading: true
  	}
  },
  mounted() {
  	this.loadAccessList().then(() => {
  		this.loading = false;
  	});
  },
  computed: Object.assign(
    mapGetters('share', ['accessList']),
    {
      currentUser() {
        return State.current_user.toJSON();
      }
    }
  ),
  methods: mapActions('share', ['loadAccessList'])
}

</script>


<style lang="less" scoped>
@import '../../../../less/global-variables.less';

.access-list {
	padding: 0px 0px 10px 0px;
	.loading {
		padding: 10px 20px;
		font-size: 14pt;
		color: @gray-700;
		font-style: italic;
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
