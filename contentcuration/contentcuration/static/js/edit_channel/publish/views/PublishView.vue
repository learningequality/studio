<template>

<div class="publish-view">
	<h4 :title="channel.name">{{channel.name}}</h4>
	<p>
		<span>{{ $tr('topicCountText', {count: topicCount}) }}</span>
		<span>{{ $tr('resourceCountText', {count: resourceCount}) }}</span>
		<span>{{ $tr('versionText', {version: channel.version}) }}</span>
	</p>
	<hr/>
	<div class="language-wrapper" :class="{invalid: !channel.language}">
		<span v-if="!channel.language" class="invalid-prompt">{{ $tr('languageRequired') }}</span>
		<span v-else></span>
		<LanguageDropdown :language="channel.language" @changed="setLanguage"/>
	</div>
	<label>{{ $tr('publishHeader') }}</label>
	<ul class="tree-wrapper">
    <TreeItem :nodeID="channel.main_tree.id" :isRoot="true"/>
  </ul>
</div>

</template>


<script>


import { mapGetters, mapActions, mapState } from 'vuex';
import _ from 'underscore';
import { dialog, alert } from 'edit_channel/utils/dialog';

import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown.vue';
import TreeItem  from './TreeItem.vue';

export default {
  name: 'PublishView',
  $trs: {
  	topicCountText: '{count, plural, =1 {# Topic} other {# Topics}}',
  	resourceCountText: '{count, plural, =1 {# Resource} other {# Resources}}',
    versionText: 'Current Version: {version}',
    languageRequired: 'Channel language required',
    publishHeader: 'The following content will be published'
  },
  components: {
  	LanguageDropdown,
  	TreeItem,
  },
  mounted() {
  	console.log(this.channel)
  },
  computed: {
  	...mapState('publish', ['channel']),
  	resourceCount() {
  		return this.channel.main_tree.metadata.resource_count;
  	},
  	topicCount() {
  		return this.channel.main_tree.metadata.total_count - this.resourceCount;
  	}
  },
  methods: {
  	// ...mapActions('share', ['sendInvitation']),
  	setLanguage(languageID) {
  		this.selected = languageID;
  	}
  }
}

</script>


<style lang="less" scoped>
@import '../../../../less/global-variables.less';

.publish-view {
	min-height: 200px;
	h4 {
		font-weight: bold;
	}
	p {
		color: @gray-700;
		span:not(:first-child)::before {
			content: " • ";
		}
	}

	.language-wrapper {
		display: grid;
    grid-auto-flow: column;
    justify-content: space-between;
    padding: 5px 10px;
    margin-bottom: 15px;
    &.invalid {
    	background-color: cornsilk;
    }
    .invalid-prompt {
    	font-style: italic;
    	color: @gray-700;
    }
	}
	.tree-wrapper {
		list-style: none;
		margin-bottom: 30px;
	}
}

</style>

"calculating": "(Calculating...)",
"publishing": "Publishing...",
"invalid_channel_prompt": "Please address the issues listed above before publishing..."

language_selected: function(){
    State.current_channel.save({"language": this.$("#select_language").val()}, {
        success: this.toggle_language_prompt
    });
},
publish:function(){
    var self = this;
    this.display_load(this.get_translation("publishing"), function(resolve, reject){
        State.current_channel.publish().then(function(){
            self.onpublish(WorkspaceManager.get_published_collection());
            self.close();
            resolve(true);
        }).catch(function(error){
            reject(error);
        });
    });
}
