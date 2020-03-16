<template>

  <VLayout justify-center>
    <VFlex md12>
      <RouterView
        :selected.sync="selected"
        :selectedResourcesCount="selectedResourcesCount"
        @preview="handlePreview"
      />
    </VFlex>

    <!-- VNavigationDrawer used for preview -->
    <VNavigationDrawer
      v-if="Boolean(previewNode)"
      :value="true"
      fixed
      right
      temporary
      @input="handleToggle"
    >
      <pre>
        {{ JSON.stringify(previewNode, null, 2) }}
      </pre>
    </VNavigationDrawer>
  </VLayout>

</template>


<script>

  import sumBy from 'lodash/sumBy';
  import { RouterNames } from '../../constants';

  function getResourceCount(node) {
    if (node.kind === 'topic') {
      if (node.resource_count !== undefined) {
        return node.resource_count;
      } else {
        return node.metadata.resource_count;
      }
    }
    return 1;
  }

  export default {
    name: 'ImportFromChannelsIndex',
    data() {
      return {
        selected: [],
        previewNode: null,
      };
    },
    provide: {
      RouterNames,
    },
    computed: {
      selectedResourcesCount() {
        return sumBy(this.selected, getResourceCount);
      },
    },
    watch: {
      selectedResourcesCount(newVal, oldVal) {
        this.showResourcesSnackbar(newVal, oldVal);
      },
    },
    beforeRouteUpdate(to, from, next) {
      this.$store.dispatch('clearSnackbar');
      next();
    },
    methods: {
      handleToggle(isOpen) {
        if (!isOpen) {
          this.previewNode = null;
        }
      },
      handlePreview(previewNode) {
        this.previewNode = previewNode;
      },
      showResourcesSnackbar(newLength, oldLength) {
        const latestDelta = newLength - oldLength;
        const textFromDelta = delta => {
          const params = { count: Math.abs(delta) };
          return delta >= 0
            ? this.$tr('resourcesAddedSnackbar', params)
            : this.$tr('resourcesRemovedSnackbar', params);
        };
        this.$store.commit('CORE_CREATE_SNACKBAR', {
          text: textFromDelta(latestDelta),
        });
      },
    },
    $trs: {
      resourcesAddedSnackbar:
        'Selected {count, number} {count, plural, one {resource} other {resources}}',
      resourcesRemovedSnackbar:
        'Removed {count, number} {count, plural, one {resource} other {resources}}',
    },
  };

</script>


<style lang="less" scoped>


</style>
