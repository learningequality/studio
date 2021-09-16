<template>

  <div id="app">
    <VCombobox
      v-model="comboboxSelected"
      :items="comboboxItems"
      :searchInput.sync="categoryText"
      :label="$tr('categoryLabel')"
      box
      chips
      deletableChips
      multiple
      item-value="id"
      item-text="name"
      @input="onComboboxInput"
    >
      <template v-slot:no-data>
        <VListTile v-if="categoryText && categoryText.trim()">
          <VListTileContent>
            <VListTileTitle>
              {{ $tr('noCategoryFoundText', { text: categoryText.trim() }) }}
            </VListTileTitle>
          </VListTileContent>
        </VListTile>
      </template>
      <template v-slot:item="{ item }">
        <!--
          `@click.stop` to prevent from propagating
          checkboxes updates to combobox automatically
          so that we can use our own handlers instead
        -->
        <VCheckbox
          v-if="nestedCategories"
          :input-value="treeSelected"
          :label="item.name"
          :value="item.id"
          :style="treeItemStyle(item)"
          @click.stop
          @change="onTreeItemChange(item, $event)"
        />
        <VCheckbox
          v-else
          :input-value="treeSelected"
          :label="item.name"
          :value="item.id"
          @click.stop
          @change="onTreeItemChange(item, $event)"
        />
      </template>
    </VCombobox>
  </div>

</template>

<script>

  /**
   * Flatten a tree (combobox doesn't expect nested structures)
   * and save information about depth level and parent ID.
   * Depth level will be used for styling of combobox
   * dropdown items.
   * Parent ID is not needed, just adding to have tree sctructure
   * information available in the flattened tree in case it'd
   * useful at some point.
   */
  function flattenTree(tree) {
    const flatTree = [];
    let level = 0;
    let parentId = null;

    function flatten(tree, level, parentId) {
      tree.forEach(child => {
        flatTree.push({
          name: child.name,
          id: child.id,
          level,
          parentId,
        });
        if (child.children) {
          flatten(child.children, level + 1, child.id);
        }
      });
    }
    flatten(tree, level, parentId);

    return flatTree;
  }

  let findParent = (nodes, id) => {
    let parents = [];
    let searchForParent = (arr, id) => {
      for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        if (item.id === id) {
          parents.push(item.id);
          searchForParent(arr, item.parentId);
          break;
        }
      }
    };
    searchForParent(nodes, id);
    return parents;
  };

  export default {
    name: 'CategoryDropdown',
    components: {},
    props: {},
    data() {
      return {
        categoryText: null,
        treeSelected: [],
        comboboxSelected: [],
        nested: true,
        tree: [
          {
            id: 16,
            name: 'For school',
            children: [
              {
                id: 2,
                name: 'Mathematics',
                children: [
                  {
                    id: 201,
                    name: 'Arithmetic',
                  },
                  {
                    id: 202,
                    name: 'Algebra',
                  },
                  {
                    id: 203,
                    name: 'Geometry',
                    level: 2,
                  },
                  {
                    id: 204,
                    name: 'Calculus',
                    level: 2,
                  },
                  {
                    id: 205,
                    name: 'Statistics',
                  },
                ],
              },
              {
                id: 3,
                name: 'Sciences',
                children: [
                  {
                    id: 301,
                    name: 'Biology',
                  },
                  {
                    id: 302,
                    name: 'Chemistry',
                  },
                ],
              },
            ],
          },
          {
            id: 82,
            name: 'For fun',
            children: [
              {
                id: 83,
                name: 'Running',
              },
            ],
          },
        ],
      };
    },
    computed: {
      comboboxItems() {
        return flattenTree(this.tree);
      },
    },
    methods: {
      treeItemStyle(item) {
        return {
          paddingLeft: `${item.level * 24}px`,
        };
      },
      nestedCategories() {
        this.nested = !this.nested;
      },
      onComboboxInput() {
        this.treeSelected = this.comboboxSelected.map(item => item.id);

        // console.log('*** onComboboxInput ***')
        // console.log('comboboxSelected:')
        // console.log(this.comboboxSelected)
        // console.log('treeSelected:')
        // console.log(this.treeSelected)
        // console.log('this.comboboxItems', this.comboboxItems)
      },
      onTreeItemChange(item, selected) {
        let addChild = selected.find(id => item.id === id);
        if (addChild) {
          this.treeSelected = [
            ...new Set([...selected, ...findParent(this.comboboxItems, item.parentId)]),
          ];
        } else {
          this.treeSelected = this.treeSelected.filter(id => item.id !== id);
        }

        this.comboboxSelected = this.comboboxItems.filter(item =>
          this.treeSelected.includes(item.id)
        );

        // console.log('*** onTreeItemChange ***');
        // console.log('comboboxSelected:', this.comboboxSelected);
        // console.log('treeSelected:', this.treeSelected);
      },
    },
    $trs: {
      categoryLabel: 'Category',
      noCategoryFoundText: 'Category not found',
    },
  };

</script>
<style lang="scss">

</style>
