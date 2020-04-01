<template>

  <div class="notranslate">
    <template v-if="items.length">
      <div v-if="inline">
        <ul class="inline-list">
          <li v-for="item in items.slice(0, max)" :key="item">
            {{ item }}
          </li>
          <li v-for="item in items.slice(max)" v-show="expanded" :key="item">
            {{ item }}
          </li>
          <li v-if="items.length > max">
            <ActionLink
              :text="expanded ? $tr('less') : $tr('more', {more: items.length - max})"
              @click="toggle"
            />
          </li>
        </ul>

      </div>
      <div v-else>
        <div v-for="item in items.slice(0, max)" :key="item">
          {{ item }}
        </div>
        <VExpansionPanel v-if="items.length > max" :value="expanded? 0 : null">
          <VExpansionPanelContent>
            <template v-slot:header>
              <span @click="toggle">
                {{ expanded ? $tr('less') : $tr('more', {more: items.length - max}) }}
              </span>
            </template>
            <div v-for="item in items.slice(max)" :key="item">
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
    },
    data() {
      return {
        expanded: false,
      };
    },
    methods: {
      toggle() {
        this.expanded = !this.expanded;
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
