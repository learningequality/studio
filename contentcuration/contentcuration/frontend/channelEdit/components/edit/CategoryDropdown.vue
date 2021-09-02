<template>

  <div>
    <VCombobox
      v-model="value"
      :items="items"
      :label="$tr('categoryLabel')"
      box
      chips
      multiple
      deletableChips
    >
      <template v-slot:no-data>
        <VListTile v-if="categoryText && categoryText.trim()">
          <VListTileContent>
            <VListTileTitle>
              {{ $tr('noCategoriesFoundText', { text: categoryText.trim() }) }}
            </VListTileTitle>
          </VListTileContent>
        </VListTile>
      </template>

      <template v-slot:item="{ index, item }">
        <VTreeview
          :items="item"
          selectable
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
        //   category: [],
        //   items: [
        //     [{
        //       id: 16,
        //       name: 'For school',
        //       children: [
        //         [{
        //           id: 2,
        //           name: 'Mathematics',
        //           children: [
        //             {
        //               id: 201,
        //               name: 'Arithmetic',
        //             },
        //             {
        //               id: 202,
        //               name: 'Algebra',
        //             },
        //             {
        //               id: 203,
        //               name: 'Geometry',
        //             },
        //             {
        //               id: 204,
        //               name: 'Calculus',
        //             },
        //             {
        //               id: 205,
        //               name: 'Statistics',
        //             },
        //           ],
        //         }],
        //         [{
        //           id: 3,
        //           name: 'Sciences',
        //           children: [
        //             {
        //               id: 301,
        //               name: 'Biology',
        //             },
        //             {
        //               id: 302,
        //               name: 'Chemistry',
        //             },
        //           ],
        //         }],
        //       ],
        //     }],
        //   ],
        // };
        items: [
          [
            {
              id: 1,
              name: 'For school :',
              children: [
                {
                  id: 2,
                  name: 'Calendar : app',
                },
                {
                  id: 3,
                  name: 'Chrome : app',
                },
                {
                  id: 4,
                  name: 'Webstorm : app',
                },
              ],
            },
          ],
          [
            {
              id: 5,
              name: 'Documents :',
              children: [
                {
                  id: 6,
                  name: 'vuetify :',
                  children: [
                    {
                      id: 7,
                      name: 'src :',
                      children: [
                        {
                          id: 8,
                          name: 'index : ts',
                        },
                        {
                          id: 9,
                          name: 'bootstrap : ts',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        ],
        value: [],
        categoryText: '',
      };
    },
    computed: {
      // filter() {
      //   return this.caseSensitive
      //     ? (item, search, textKey) => item[textKey].indexOf(search) > -1
      //     : undefined;
      // },
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
