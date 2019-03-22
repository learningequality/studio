<template>

<li class="item" v-if="node">
	<div v-if="!isRoot" class="item-wrapper" :class="{topic: isTopic}" @click="isTopic && toggle()">
		<span v-if="!isTopic" class="item-icon">{{icon}}</span>
		<div class="item-title">{{node.title}}</div>
		<span v-if="isTopic">
			<span v-if="node.metadata.total_count">
				<span class="annotation">{{ $tr('resourceCount', {count: node.metadata.resource_count}) }}</span>
				<span v-if="isTopic" class="toggler">{{(expanded)? "keyboard_arrow_down" : "keyboard_arrow_up"}}</span>
			</span>
			<span v-else class="annotation">{{ $tr('emptyText') }}</span>
		</span>


	</div>
	<ul v-if="isTopic" v-show="isRoot || expanded" class="item-children">
		<div v-if="!loaded" class="default-item">{{ $tr('loadingText') }}</div>
		<div v-else-if="!node.children.length" class="default-item">{{ $tr('defaultText') }}</div>
		<div v-else>
      <TreeItem v-for="child in node.children" :nodeID="child" :key="child"/>
		</div>
	</ul>
</li>

</template>

<script>

import { mapGetters, mapActions } from 'vuex';

export default {
  name: 'TreeItem',
  $trs: {
    defaultText: "No content found",
    loadingText: "Loading...",
    resourceCount: "{count, plural, =1 {# resource} other {# resources}}",
    emptyText: "(empty)"
  },
  props: {
  	nodeID: {
  		type: String,
  		required: true
  	},
  	isRoot: {
  		type: Boolean,
  		default: false
  	}
  },
  data() {
  	return {
  		loaded: false,
  		expanded: false
  	};
  },
  mounted() {
  	if(this.isRoot) {
  		this.loadChildren();
  	}
  },
  computed: {
  	...mapGetters('publish', ['getNode', 'nodes']),
  	node() {
  		return this.getNode(this.nodeID);
  	},
  	isTopic() {
  		return this.node.kind === "topic";
  	},
  	icon() {
		  switch (this.node.kind){
		    case "topic":
		      return "folder";
		    case "video":
		      return "theaters";
		    case "audio":
		      return "headset";
		    case "image":
		      return "image";
		    case "exercise":
		      return "star";
		    case "document":
		      return "description";
		    case "html5":
		      return "widgets";
		    default:
		      return "error";
		  }
  	}
  },
  methods: {
  	...mapActions('publish', ['loadNodes']),
  	toggle() {
  		this.expanded = !this.expanded;
  		this.loadChildren();
  	},
  	loadChildren() {
  		if(!this.loaded) {
  			this.loadNodes(this.node.children).then(() => {
  				this.loaded = true;
  			});
  		}
  	}
  }
}

</script>


<style lang="less" scoped>

@import '../../../../less/global-variables.less';

.item-children {
	list-style: none;
	margin-left: 3px;
	border-left: 2px solid @blue-200;
}

.item {
	padding: 3px 15px;
	.item-wrapper {
		font-size: 12pt;
		&.topic {
			cursor: pointer;
			font-weight: bold;
		}
		.item-title {
			.truncate;
			max-width: 80%;
			display: inline-block;
		}
		.item-icon {
			.material-icons;
			color: @gray-500;
			vertical-align: top;
    	font-size: 16pt;
		}
		.toggler {
			.material-icons;
			font-size: 18pt;
			vertical-align: top;
		}
		.annotation {
			vertical-align: super;
    	font-size: 10pt;
    	color: @gray-500;
    	margin: 0px 10px;
    	font-weight: normal;
		}
	}
}
.default-item {
	padding-left: 10px;
	color: @gray-500;
	font-style: italic;
}

</style>
