<template>

  <li class="list-item" :class="import-list-item-class">
    <template v-if="!isChannel && !readOnly">
      <input
        type="checkbox"
        class="list-item-checkbox"
        @change="handleCheckboxChange"
        :checked="isChecked || parentIsChecked"
        :disabled="isDisabled || parentIsChecked"
      />
    </template>

    <!-- TODO reinstate 'for' attribute and restrict toggling to the toggle element -->
    <label
      class="list-item-label"
      :class="{ selected: isChecked }"
      :title="node.title"
      @click="handleClickLabel"
    >
      <i v-if="!isFolder" class="material-icons node-icon">{{iconClass}}</i>

      <span class="list-item-label-title">
        {{ node.title }}
        <em v-if="isFolder && !isChannel && (resourceCount > 0)" class="list-item-child-count">
          {{ $tr('resourceCount', {'resourceCount': resourceCount}) }}
        </em>
      </span>

      <template v-if="isFolder">
        <template v-if="node.children.length > 0">
          <i class="material-icons" :style="{ cursor: 'pointer' }">{{togglerClass}}</i>
        </template>

        <em v-else class="list-item-child-count">
          {{ $tr('empty') }}
        </em>
      </template>

      <i v-show="(isFolder || isChannel) & isChecked" class="list-item-counter badge">
        {{ $tr('resourceCount', {'resourceCount': resourceCount}) }}
      </i>
    </label>


    <!-- TODO re-insert smooth transition -->
      <div v-show="isExpanded ">
        <em v-show="isLoading" class="default-item">
          {{ $tr('loading') }}
        </em>
        <ul class="list-item-sub-list">
          <transition-group name="fade">
            <ImportListItem
              ref="children"
              v-for="file in subFiles"
              :key="file.id"
              :node="file"
              :isFolder="file.kind ==='topic'"
              :isChannel="false"
              :parentIsChecked="isChecked"
              :readOnly="readOnly"
            />
          </transition-group>
        </ul>
      </div>
  </li>

</template>


<script>

import _ from 'underscore';
import stringHelper from '../../utils/string_helper';
import { fetchContentNodesById, getIconClassForKind } from '../util';
import { mapActions } from 'vuex';
import { pluralize } from './filters';

const RequiredBoolean = { type: Boolean, required: true };

export default {
  name: 'ImportListItem',
  $trs: {
    'loading': "Loading",
    'empty': "(empty)",
    'resourceCount': "{resourceCount, plural, =1 {# Resource} other {# Resources}}",
  },
  props: {
    isChannel: RequiredBoolean,
    isFolder: RequiredBoolean,
    readOnly: {
      type: Boolean,
      default: false,
    },
    isRoot: {
      type: Boolean,
      default: false,
    },
    parentIsChecked: {
      type: Boolean,
      default: false,
    },
    // node :: { title: String, children: Array }
    node: {
      type: Object,
      required: true,
    }
  },
  data() {
    return {
      isLoading: false,
      isChecked: false,
      subFiles: [],
      isExpanded: false,
      childrenAreLoaded: false,
    }
  },
  mounted() {
    this.isChecked = this.parentIsChecked;
  },
  watch: {
    parentIsChecked(newVal) {
      // if parent is suddenly checked, remove this node from the list
      if (newVal && this.isChecked) {
        this.removeItemFromImportList(this.node.id);
      }
      this.isChecked = newVal;
    }
  },
  computed: {
    togglerClass() {
      return (this.isExpanded)? 'arrow_drop_down': 'arrow_drop_up';
    },
    resourceCount() {
      return this.node.metadata.resource_count;
    },
    iconClass() {
      return getIconClassForKind(this.node.kind);
    },
    importListItemClass() {
      return {
        disabled: this.isDisabled || this.parentIsChecked,
      }
    },
    resourceSize() {
      return stringHelper.format_size(this.node.metadata.resource_size);
    },
    hasChildren() {
      return this.node.children.length > 0;
    }
  },
  methods: Object.assign(
    mapActions('import', [
      'addItemToImportList',
      'removeItemFromImportList',
    ]),
    {
      fetchChildData() {
        // If children are loaded once, then do nothing
        if (this.childrenAreLoaded) return;
        this.isLoading = true;
        return fetchContentNodesById(this.node.children)
        .then((childData) => {
          this.isLoading = false;
          this.childrenAreLoaded = true;
          this.subFiles = childData;
        });
      },
      handleClickLabel() {
        const isToggleable = this.isChannel || this.hasChildren;
        if (isToggleable) {
          this.isExpanded = !this.isExpanded;
          if (this.isExpanded) {
            this.fetchChildData();
          }
        }
      },
      handleCheckboxChange() {
        this.isChecked = !this.isChecked;
        if (this.isChecked) {
          this.addItemToImportList(_.clone(this.node));
        } else {
          this.removeItemFromImportList(this.node.id);
        }
      },
    }
  ),
  filters: {
    pluralize,
  }
};

</script>


<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .list-item {
    width: -moz-max-content;
    width: max-content;
  }

  .list-item-sub-list {
    border-left: 2px solid #2196F3;
    margin-left: 30px !important;
    height: auto;
    margin: 0px;
    padding: 0px;
    list-style: none;
    border-left: 2px solid @blue-500;
    width: calc(~"100% - 30px");
  }

  .list-item-label {
    padding: 0px 10px;
    font-size: 16px;
    .node-icon {
      color: @gray-500;
    }
    & > * {
      vertical-align: middle;
    }
  }

  .list-item-checkbox {
    display: inline-block;
    width: 16px;
    height: 16px;
    vertical-align: middle;
    margin: 0px 4px;
    cursor: pointer;
    margin-left: 10px;
  }

  .list-item-counter {
    margin-left: 10px;
    background-color: @blue-500;
  }

  .list-item-child-count {
    font-size: 10pt;
    color: gray;
    display: inline-block;
  }

  .disabled {
    color: @gray-700;
    opacity: 1 !important;
    input[type=checkbox] {
      cursor: not-allowed !important;
    }
    .list-item-counter {
      background-color: @gray-400 !important;
    }
  }

  .fade-enter-active {
    transition: opacity .5s;
  }
  .fade-leave-active {
    transition: opacity .25s;
  }

  .fade-enter {
    height: 0;
    opacity: 0;
  }

  .fade-leave-to {
    opacity: 0;
  }

</style>
