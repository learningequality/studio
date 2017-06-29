<template>

  <li :class="importListItemClass">
    <template v-if="!isChannel">
      <input
        type="checkbox"
        @change="handleCheckboxChange"
        :checked="isChecked || parentIsChecked"
        :disabled="isDisabled || parentIsChecked"
      >
      </input>
    </template>

    <!-- TODO reinstate 'for' attribute and restrict toggling to the toggle element -->
    <label
      class="list-item-label"
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
        <template v-else>
          <em class="modal-item-metadata-default">(empty)</em>
        </template>
      </template>

      <i v-if="isFolder || isChannel" class="badge selected_counter">
        <span v-show="isChecked">
          {{ node.metadata.resource_count }}
        </span>
      </i>
    </label>

    <em v-show="isFolder && isLoading" class="default-item">
      Loading...
    </em>

    <!-- TODO re-insert smooth transition -->
    <ul v-show="isExpanded" class="topic_list list-border import-list modal-list-default">
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
        'child-offset': !this.isRoot,
        'modal-list-item-default': true,
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

  .list-border {
    border-left: 2px solid #2196F3;
  }

  .child-offset {
    margin-left: 30px;
  }

  .list-item-label {
    padding: 0px 10px;
    font-size: 16px;
  }

</style>
