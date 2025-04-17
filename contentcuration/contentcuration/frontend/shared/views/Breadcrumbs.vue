<template>

  <VBreadcrumbs
    ref="breadcrumbs"
    v-resize="handleOverflow"
    :items="items"
    style="width: 100%; max-height: 100%"
  >
    <template #divider>
      <Icon
        icon="chevronRight"
        style="font-size: 20px"
      />
    </template>
    <!-- Overflow menu -->
    <VBreadcrumbsItem
      v-if="breadcrumbStartingIndex > 0"
      tag="div"
    >
      <BaseMenu bottom>
        <template #activator="{ on }">
          <VBtn
            icon
            flat
            class="ma-0"
            v-on="on"
          >
            <Icon icon="optionsHorizontal" />
          </VBtn>
        </template>
        <VCard style="max-width: 300px">
          <VList
            v-for="(item, i) in collapsedItems"
            :key="`collapsed-${i}`"
          >
            <VListTile :to="item.to">
              <VListTileTitle>
                <slot
                  name="item"
                  :item="item"
                  :index="i"
                  :isLast="false"
                  :isFirst="items[0].id === item.id"
                >
                </slot>
              </VListTileTitle>
            </VListTile>
          </VList>
        </VCard>
      </BaseMenu>
    </VBreadcrumbsItem>

    <!-- Visible breadcrumbs -->
    <VBreadcrumbsItem
      v-for="(item, index) in breadcrumbs"
      ref="breadcrumb"
      :key="`breadcrumb-${index}`"
      tag="div"
      class="breadcrumb px-2 subheading"
      :to="index < breadcrumbs.length - 1 ? item.to : undefined"
      exact
    >
      <slot
        name="item"
        :item="item"
        :index="index"
        :isFirst="items[0].id === item.id"
        :isLast="index === breadcrumbs.length - 1"
      ></slot>
    </VBreadcrumbsItem>
  </VBreadcrumbs>

</template>


<script>

  export default {
    name: 'Breadcrumbs',
    props: {
      items: {
        type: Array,
        default() {
          return [];
        },
      },
    },
    data() {
      return {
        breadcrumbStartingIndex: 0,
      };
    },
    computed: {
      collapsedItems() {
        return this.items.slice(0, this.breadcrumbStartingIndex).reverse();
      },
      breadcrumbs() {
        return this.items.slice(this.breadcrumbStartingIndex, this.items.length);
      },
    },
    watch: {
      items: {
        handler() {
          this.handleOverflow();
        },
        deep: true,
      },
    },
    methods: {
      handleOverflow() {
        const maxWidth = this.$refs.breadcrumbs.$el.offsetWidth;
        let totalWidth = 0;
        this.breadcrumbStartingIndex = 0;
        this.$nextTick(() => {
          if (this.$refs.breadcrumb) {
            for (var i = this.$refs.breadcrumb.length - 1; i >= 0; --i) {
              totalWidth += this.$refs.breadcrumb[i].$el.offsetWidth + 68;

              // Bounds exceeded, go back to previous index
              if (totalWidth >= maxWidth - 48) {
                this.breadcrumbStartingIndex = Math.min(this.items.length - 1, i + 1);
                break;
              }
            }
          }
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  /* Truncate text if the last item is too long */
  .breadcrumb:last-child {
    max-width: calc(100% - 86px);
  }

  ::v-deep .v-breadcrumbs__item {
    overflow: hidden;
    text-overflow: ellipsis;
  }

</style>
