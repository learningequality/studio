<template>

  <li class="ListItem" :class="importListItemClass">
    <template v-if="!isChannel">
      <input
        type="checkbox"
        class="ListItem__Checkbox"
        @change="handleCheckboxChange"
        :checked="isChecked || parentIsChecked"
        :disabled="isDisabled || parentIsChecked"
      >
      </input>
    </template>

    <!-- TODO reinstate 'for' attribute and restrict toggling to the toggle element -->
    <label
      class="ListItem__Label"
      :class="{ selected: isChecked }"
      :title="node.title"
      @click="handleClickLabel"
    >
      <i v-if="!isFolder" :class="iconClass"></i>

      <span class="ListItem__Label__Title">
        {{ node.title }}
        <em v-if="isFolder && !isChannel && (resourceCount > 0)" class="ListItem__ChildCount">
          {{ resourceCount | pluralize('Resource') }}
        </em>
      </span>

      <template v-if="isFolder">
        <template v-if="node.children.length > 0">
          <i :class="togglerClass" :style="{ cursor: 'pointer' }"></i>
        </template>

        <em v-else class="ListItem__ChildCount">
          (empty)
        </em>
      </template>

      <i v-show="(isFolder || isChannel) & isChecked" class="ListItem__Counter badge">
        {{ node.metadata.resource_count }}
      </i>
    </label>


    <!-- TODO re-insert smooth transition -->
      <div v-show="isExpanded ">
        <em v-show="isLoading" class="default-item">
          Loading...
        </em>
        <ul class="ListItem__SubList">
          <transition-group name="fade">
            <ImportListItem
              ref="children"
              v-for="file in subFiles"
              :key="file.id"
              :node="file"
              :isFolder="file.kind ==='topic'"
              :isChannel="false"
              :parentIsChecked="isChecked"
            />
          </transition-group>
        </ul>
      </div>
  </li>

</template>


<script>

const _ = require('underscore');
const RequiredBoolean = { type: Boolean, required: true };
const stringHelper = require('../../utils/string_helper');
const { fetchContentNodesById, getIconClassForKind } = require('../util');
const { mapActions } = require('vuex');
const { pluralize } = require('./filters');

module.exports = {
  name: 'ImportListItem',
  props: {
    isChannel: RequiredBoolean,
    isFolder: RequiredBoolean,
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
      return {
        'glyphicon': true,
        'glyphicon-triangle-right': !this.isExpanded,
        'glyphicon-triangle-bottom': this.isExpanded,
      };
    },
    resourceCount() {
      return this.node.metadata.resource_count;
    },
    iconClass() {
      return {
        glyphicon: true,
        [getIconClassForKind(this.node.kind)]: true,
      };
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
  methods: {
    ...mapActions('import', [
      'addItemToImportList',
      'removeItemFromImportList',
    ]),
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
  },
  filters: {
    pluralize,
  }
};

</script>


<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .ListItem__SubList {
    border-left: 2px solid #2196F3;
    margin-left: 30px !important;
    height: auto;
    margin: 0px;
    padding: 0px;
    list-style: none;
    border-left: 2px solid @blue-500;
    width: calc(~"100% - 30px");
  }

  .ListItem__Label {
    max-width: 95%;
    padding: 0px 10px;
    font-size: 16px;
    & > * {
      vertical-align: middle;
    }
  }

  .ListItem__Label__Title {
    width: 95%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ListItem__Checkbox {
    display: inline-block;
    width: 16px;
    height: 16px;
    vertical-align: middle;
    margin: 0px 4px;
    cursor: pointer;
    margin-left: 10px;
  }

  .ListItem__Counter {
    margin-left: 10px;
    background-color: @blue-500;
  }

  .ListItem__ChildCount {
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
    .ListItem__Counter {
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
