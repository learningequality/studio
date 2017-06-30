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
      <div v-if="!isFolder" :class="iconClass"></div>
      <div class="truncate">
        {{ node.title }}
      </div>

      <template v-if="isFolder">
        <template v-if="node.children.length > 0">
          <template v-if="isFolder">
            <em v-if="!isChannel">
              {{ resourceCount }}
            </em>
          </template>
          <!-- This seems to be a dead branch since outer v-if is isFolder = true -->
          <template v-else>
            <em>
              {{ resourceSize }}
            </em>
          </template>
          <div :class="togglerClass"></div>
        </template>

        <em v-else class="ListItem__Empty">
          (empty)
        </em>
      </template>

      <i v-show="(isFolder || isChannel) & isChecked" class="ListItem__Counter badge">
        {{ node.metadata.resource_count }}
      </i>
    </label>


    <!-- TODO re-insert smooth transition -->
    <transition name="fade">
      <div v-if="isExpanded ">
        <em v-show="isLoading" class="default-item">
          Loading...
        </em>
        <ul class="topic_list list-border import-list modal-list-default">
          <ImportListItem
            ref="children"
            v-for="file in subFiles"
            :key="file.id"
            :node="file"
            :isFolder="file.kind ==='topic'"
            :isChannel="false"
            :parentIsChecked="isChecked"
            :store="store"
          />
        </ul>
      </div>
    </transition>
  </li>

</template>


<script>
const _ = require('underscore');
const RequiredBoolean = { type: Boolean, required: true };
const stringHelper = require('../../utils/string_helper');

function formatCount(text, count) {
  if (Number(count) === 1) {
    return count + " " + text;
  }
  return count + " " + text + "s";
}

function getIcon(kind) {
  switch (kind){
    case "topic":
      return "glyphicon glyphicon-folder-close";
    case "video":
      return "glyphicon glyphicon-film";
    case "audio":
      return "glyphicon glyphicon-headphones";
    case "image":
      return "glyphicon glyphicon-picture";
    case "exercise":
      return "glyphicon glyphicon-star";
    case "document":
      return "glyphicon glyphicon-file";
    case "html5":
      return "glyphicon glyphicon-certificate";
    default:
      return "glyphicon glyphicon-exclamation-sign";
  }
}

module.exports = {
  name: 'ImportListItem',
  props: {
    store: {
      type: Object,
    },
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
    }
  },
  mounted() {
    this.isChecked = this.parentIsChecked;
  },
  watch: {
    parentIsChecked(newVal) {
      // if parent is suddenly checked, remove this node from the list
      if (newVal && this.isChecked) {
        this.store.removeItemToImport(this.node.id);
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
    iconClass() {
      return {
        glyphicon: true,
        [getIcon(this.node.kind)]: true,
      };
    },
    importListItemClass() {
      return {
        disabled: this.isDisabled || this.parentIsChecked,
      }
    },
    resourceCount() {
      return formatCount('Resource', this.node.metadata.resource_count);
    },
    resourceSize() {
      return stringHelper.format_size(this.node.metadata.resource_size);
    },
    hasChildren() {
      return this.node.children.length > 0;
    }
  },
  methods: {
    fetchChildData() {
      this.isLoading = true;
      this.store.fetchContentNodesById(this.node.children)
      .then((childData) => {
        this.isLoading = false;
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
        this.store.addItemToImport(_.clone(this.node));
      } else {
        this.store.removeItemToImport(this.node.id);
      }
    },
  },
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
    width: -moz-max-content;
    width: -webkit-max-content;
    width: max-content;
  }

  .ListItem__Label {
    padding: 0px 10px;
    font-size: 16px;
    & > * {
      display: inline-block;
      vertical-align: middle;
    }
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

  .ListItem__Empty {
    font-size: 10pt;
    color: gray;
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
    transition: opacity .5s
  }
  .fade-leave-active {
    transition: opacity .25s
  }

  .fade-enter, .fade-leave-to /* .fade-leave-active in <2.1.8 */ {
    opacity: 0
  }
</style>
