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
        items: [
          [
            {
              id: 1,
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
                  ],
                },
                {
                  id: 3,
                  name: 'Sciences',
                  chilren: [
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
          [
            {
              id: 5,
              name: 'At home',
              children: [
                {
                  id: 6,
                  name: 'Shapes',
                  children: [
                    {
                      id: 7,
                      name: 'Blah',
                      children: [
                        {
                          id: 8,
                          name: 'Bleep',
                        },
                        {
                          id: 9,
                          name: 'Wee',
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
