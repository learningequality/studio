<template>

  <div>
    <template v-if="items.length">
      <div v-if="inline">
        <ul class="inline-list">
          <li v-for="item in items.slice(0, maxItems)" :key="item">
            {{ item }}
          </li>
          <li v-for="item in items.slice(maxItems)" v-show="isExpanded" :key="item">
            {{ item }}
          </li>
          <li v-if="items.length > maxItems">
            <ActionLink
              :text="toggleText"
              @click="toggle"
            />
          </li>
        </ul>

      </div>
      <div v-else>
        <div v-for="item in items.slice(0, maxItems)" :key="item">
          {{ item }}
        </div>
        <VExpansionPanel v-if="items.length > maxItems" :value="isExpanded? 0 : null">
          <VExpansionPanelContent>
            <template v-slot:header>
              <span @click="toggle">
                {{ toggleText }}
              </span>
            </template>
            <div v-for="item in items.slice(maxItems)" :key="item">
              {{ item }}
            </div>
          </VExpansionPanelContent>
        </VExpansionPanel>
      </div>

    </template>
    <div v-else-if="noItemsText">
      <em>{{ noItemsText }}</em>
    </div>
  </div>

</template>

<script>

  import ActionLink from './ActionLink';

  export default {
    name: 'ExpandableList',
    components: {
      ActionLink,
    },
    props: {
      items: {
        type: Array,
      },
      max: {
        type: Number,
        default: 10,
      },
      inline: {
        type: Boolean,
        default: false,
      },
      noItemsText: {
        type: String,
      },
      expanded: {
        type: Boolean,
        default: false,
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
        let moreCount = this.items.length - this.max;
        return this.isExpanded
          ? this.$tr('less')
          : this.$tr('more', { more: this.$formatNumber(moreCount) });
      },
    },
    methods: {
      toggle() {
        this.isExpanded = !this.isExpanded;
      },
    },
    $trs: {
      more: 'Show More ({more})',
      less: 'Show Less',
    },
  };

</script>

<style lang="less" scoped>

  .v-expansion-panel {
    box-shadow: none;
    /deep/ .v-expansion-panel__header {
      padding: 0;
    }
  }
  .inline-list {
    padding: 0;
    li {
      display: inline;
      &:not(:last-child)::after {
        content: ' • ';
      }
    }
  }

</style>
