<template>

  <div>
    <VCombobox
      v-model="search"
      :label="$tr('categoryLabel')"
      :items="items"
      box
      chips
      multiple
      deletableChips
      maxlength="30"
    >
      <template v-slot:items="{ items }">
        <VTreeview
          selectable
          :items="item"
          :search="search"
          :filter="filter"
          :open.sync="open"
        />
      </template>
    </VCombobox>
  </div>

</template>

<script>

  export default {
    name: 'CategoryDropdown',
    components: {},
    props: {},
    data() {
      return {
        open: [16, 3],
        search: null,
        items: [
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
                  },
                  {
                    id: 204,
                    name: 'Calculus',
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
        ],
      };
    },
    computed: {
      filter() {
        return this.caseSensitive
          ? (item, search, textKey) => item[textKey].indexOf(search) > -1
          : undefined;
      },
    },
    $trs: {
      categoryLabel: 'Category',
      noCategoriesFoundText:
        'No results found for "{text}". Press \'Enter\' key to create a new category',
    },
  };

</script>
<style lang="scss">

</style>
