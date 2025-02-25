<template>

  <div>
    <template v-if="items.length">
      <div v-if="inline">
        <template v-if="!printing">
          <ul
            class="inline-list"
            :class="{ delimit }"
          >
            <li
              v-for="item in items.slice(0, maxItems)"
              :key="getKey(item)"
            >
              <slot
                name="item"
                :item="item"
              >
                {{ item }}
              </slot>
            </li>
            <li
              v-for="item in items.slice(maxItems)"
              v-show="isExpanded"
              :key="getKey(item)"
            >
              <slot
                name="item"
                :item="item"
              >
                {{ item }}
              </slot>
            </li>
            <li v-if="items.length > maxItems">
              <ActionLink
                :text="toggleText"
                @click="toggle"
              />
            </li>
          </ul>
        </template>
        <template v-else>
          <p>{{ items.join(', ') }}</p>
        </template>
      </div>
      <div v-else>
        <template v-if="!printing">
          <div
            v-for="item in items.slice(0, maxItems)"
            :key="getKey(item)"
          >
            <slot
              name="item"
              :item="item"
            >
              {{ item }}
            </slot>
          </div>
          <VExpansionPanel
            v-if="items.length > maxItems"
            :value="isExpanded ? 0 : null"
          >
            <VExpansionPanelContent>
              <template #header>
                <span @click="toggle">
                  {{ toggleText }}
                </span>
              </template>
              <div
                v-for="item in items.slice(maxItems)"
                :key="getKey(item)"
              >
                <slot
                  name="item"
                  :item="item"
                >
                  {{ item }}
                </slot>
              </div>
            </VExpansionPanelContent>
          </VExpansionPanel>
        </template>
        <template v-else>
          <p
            v-for="item in items"
            :key="getKey(item)"
          >
            {{ item }}
          </p>
        </template>
      </div>
    </template>
    <div v-else-if="noItemsText">
      <em>{{ noItemsText }}</em>
    </div>
  </div>

</template>


<script>

  import ActionLink from './ActionLink';
  import { printingMixin } from 'shared/mixins';

  export default {
    name: 'ExpandableList',
    components: {
      ActionLink,
    },
    mixins: [printingMixin],
    props: {
      items: {
        type: Array,
        required: true,
        default: () => [],
      },
      max: {
        type: Number,
        default: 10,
      },
      inline: {
        type: Boolean,
        default: false,
      },
      delimit: {
        type: Boolean,
        default: true,
      },
      noItemsText: {
        type: String,
        default: null,
      },
      expanded: {
        type: Boolean,
        default: false,
      },
      itemId: {
        type: String,
        default: 'id',
      },
    },
    data() {
      return {
        isExpanded: false,
      };
    },
    computed: {
      maxItems() {
        return this.expanded ? this.items && this.items.length : this.max;
      },
      toggleText() {
        const moreCount = this.items.length - this.max;
        return this.isExpanded
          ? this.$tr('less')
          : this.$tr('more', { more: this.$formatNumber(moreCount) });
      },
    },
    methods: {
      toggle() {
        this.isExpanded = !this.isExpanded;
      },
      getKey(item) {
        return item[this.itemId] || item;
      },
    },
    $trs: {
      more: 'Show more ({more})',
      less: 'Show less',
    },
  };

</script>


<style lang="scss" scoped>

  .v-expansion-panel {
    box-shadow: none;

    ::v-deep .v-expansion-panel__header {
      padding: 0;
    }
  }

  .inline-list {
    padding: 0;

    li {
      display: inline;
    }

    &.delimit li:not(:last-child)::after {
      content: ' • ';
    }
  }

</style>
