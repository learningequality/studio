<template>

<div class="item" :class="{'highlight': highlight}">
	<div class="user-name" :title="userName">
		<span class="access-icon" :title="$tr(permission)" :class="permission"></span>
		{{ userName }}
	</div>
	<div class="user-email" :title="model.email">{{ model.email }}</div>
	<div class="user-actions">
		<slot></slot>
	</div>
</div>

</template>

<script>

import { Permissions } from '../constants';

export default {
  name: 'ShareItem',
  $trs: {
  	[Permissions.OWNER]: "Can Manage (admins only)",
    [Permissions.EDIT]: "Can Edit",
    [Permissions.VIEW_ONLY]: "Can View",
    userName: "{firstName} {lastName}"
  },
  props: {
  	model: {
  		type: Object,
  		required: true
  	},
  	permission: {
  		type: String,
  		required: false
  	},
  	highlight: {
  		type: Boolean,
  		default: false
  	}
  },
  computed: {
  	userName() {
  		return this.$tr('userName', {firstName: this.model.first_name, lastName: this.model.last_name});
  	}
  }
}

</script>


<style lang="less" scoped>
@import '../../../../less/global-variables.less';

.item {
	display: grid;
	grid-auto-flow: column;
	grid-template-columns: 215px 185px auto;
	font-size: 12pt;
	padding: 2px 10px;
	margin-bottom: 5px;
	transition: background-color 200ms linear;
	&:hover {
		background-color: @gray-100;
	}
	&.highlight {
		background-color: @yellow-highlight-color;
	}
	.user-name {
		.truncate;
		.access-icon {
			.material-icons;
			color: @gray-500;
			font-size: 14pt;
			vertical-align: sub;
			padding-right: 5px;
			&.manage::before {
				content: "person";
			}
			&.edit::before {
				content: "edit";
			}
			&.view::before {
				content: "remove_red_eye";
			}
		}
	}
	.user-email {
		color: @gray-500;
		font-style: italic;
		font-size: 10pt;
	}
	.user-actions {
		text-align: right;
		label {
			color: @gray-500;
			font-style: italic;
			font-size: 10pt;
		}
		.option {
			.material-icons;
			cursor: pointer;
			color: @gray-700;
			font-size: 14pt;
			vertical-align: sub;
			font-weight: bold;
			margin-left: 5px;
			&:hover {
				color: @blue-500;
				&.red-option {
					color: @red-error-color;
				}
			}
		}
	}
}

</style>
