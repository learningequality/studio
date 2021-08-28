<template>

  <div>
    <VCard
      class="mx-auto"
      max-width="500"
    >
      <VSheet class="lighten-2 pa-3 primary">
        <VTextField
          v-model="search"
          :label="$tr('categoryLabel')"
          dark
          flat
          solo-inverted
          hide-details
          clearable
          clear-icon="mdi-close-circle-outline"
        />
        <VCheckbox
          v-model="caseSensitive"
          dark
          hide-details
          label="Case sensitive search"
        />
      </VSheet>
      <VCardText>
        <VTreeview
          selectable
          :items="items"
          :search="search"
          :filter="filter"
          :open.sync="open"
        >
          <template v-slot:prepend="{ item }">
            <VIcon
              v-if="item.children"
              v-text="`mdi-${item.id === 1 ? 'home-variant' : 'folder-network'}`"
            />
          </template>
        </VTreeview>
      </VCardText>
    </VCard>
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
        caseSensitive: false,
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
