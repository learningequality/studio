<template>
  <VContent>
    <VContainer fluid fillHeight>
      <VLayout v-if="selected.length" justifyCenter>
        <VFlex grow>
          <VTabs fixedTabs sliderColor="primary">
            <VTab v-for="(component, key) in tabs" :key="key" @click="currentTab=key">
              {{ $tr(key) }}
            </VTab>
          </VTabs>

          <!-- Not using v-tab-items as it loads everything into page at once -->
          <component :is="tabContent" />
        </VFlex>
      </VLayout>
      <VLayout v-else justifyCenter alignCenter fillHeight>
        <VFlex grow class="default-content">
          {{ noItemText }}
        </VFlex>
      </VLayout>
    </VContainer>
  </VContent>
</template>

<script>

  import _ from 'underscore';
  import { mapGetters, mapState } from 'vuex';
  import { TabNames } from '../constants';
  import DetailsEditView from './DetailsEditView.vue';
  import DetailsViewOnlyView from './DetailsViewOnlyView.vue';

  export default {
    name: 'EditView',
    $trs: {
      [TabNames.DETAILS]: 'Details',
      [TabNames.PREVIEW]: 'Preview',
      [TabNames.QUESTIONS]: 'Questions',
      [TabNames.PREREQUISITES]: 'Prerequisites',
      noItemsToEditText: 'Please select an item or items to edit',
      noItemsToViewText: 'Please select an item or items to view',
    },
    components: {
      DetailsEditView, // eslint-disable-line vue/no-unused-components
      DetailsViewOnlyView, // eslint-disable-line vue/no-unused-components
    },
    data() {
      return {
        currentTab: null,
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['selected']),
      ...mapState('edit_modal', ['viewOnly', 'isClipboard']),
      noItemText() {
        return this.viewOnly ? this.$tr('noItemsToViewText') : this.$tr('noItemsToEditText');
      },
      tabs() {
        // TODO: Add counts

        let map = {
          [TabNames.DETAILS]: { component: 'DetailsEditView' },
        };

        // Set detail view to view only mode
        if (this.viewOnly) {
          map[TabNames.DETAILS] = { component: 'DetailsViewOnlyView' };
        }

        // Only show some tabs if only one item is selected
        if (this.selected.length === 1) {
          map[TabNames.PREVIEW] = { component: 'DetailsViewOnlyView' };

          // Only show question editor if the item is a question
          if (this.selected[0].kind === 'exercise') {
            map[TabNames.QUESTIONS] = {
              component: 'DetailsViewOnlyView',
              // badge: this.selected[0].questions.length
            };
          }

          // Only show prerequisites if not editing clipboard item
          if (!this.isClipboard) {
            map[TabNames.PREREQUISITES] = {
              component: 'DetailsViewOnlyView',
              // badge: this.selected[0].prerequisite.length
            };
          }
        }

        return map;
      },
      tabContent() {
        let slot = this.tabs[this.currentTab];
        return slot && slot.component;
      },
      allExercises() {
        return _.every(this.selected, { kind: 'exercise' });
      },
    },
    mounted() {
      this.currentTab = TabNames.DETAILS;
    },
  };

</script>

<style lang="less" scoped>
@import '../../../../less/global-variables.less';

.default-content {
  .empty_default;
}

/deep/ .v-tabs__item {
  font-weight: bold;
}

</style>
