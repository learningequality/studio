<template>

  <div>
    <VLayout>
      <VFlex xs12 md6 class="pr-2">
        <VSelect
          ref="completion"
          v-model="contentCompletion"
          box
          :items="completion"
          :label="$tr('completionLabel')"
          @focus="trackClick('Completion')"
        />
      </VFlex>
      <!-- if epub and zip AND exact time -->
      <ShortOrLongActivity />
      <!-- <VTextField
        v-if="rightDocument && exactTimeRequired"
        v-model="minutesRequired"
        box
        :label="$tr('minutesRequired')"
      /> -->

    </VLayout>
    <VFlex>
      <KCheckbox
        v-model="learnersCanMarkComplete"
        color="primary"
        :label="$tr('learnersCanMarkComplete')"
        style="margin-top: 0px; padding-top: 0px"
      />
    </VFlex>
  </div>

</template>

<script>

  import { mapGetters, mapActions } from 'vuex';
  import difference from 'lodash/difference';
  import intersection from 'lodash/intersection';
  import ShortOrLongActivity from './ShortOrLongActivity.vue';
  // import HelpTooltip from '../../../shared/views/HelpTooltip.vue';
  // import Checkbox from 'shared/views/form/Checkbox';

  export default {
    name: 'CompletionOptions',
    components: {
      ShortOrLongActivity,
      // HelpTooltip,
      // Checkbox,
    },
    props: {
      nodeIds: {
        type: Array,
        default: () => [],
      },
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        learnersCanMarkComplete: false,
        // minutesRequired: '', // ! will need to move to get/setter
        completionText: 'All content viewed',
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodes', 'getContentNode', 'completion']),
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      node() {
        return this.getContentNode(this.nodeId);
      },
      contentCompletion: {
        get() {
          // console.log("selection from completion")
          return intersection(...this.nodes.map(node => node.completion));
        },
        set(value) {
          // console.log("seting completion")

          const oldValue = intersection(...this.nodes.map(node => node.completion));
          // If selecting a completion, clear the text field
          if (value.length > (oldValue || []).length) {
            this.completionText = null;
            this.addNodeCompletion(difference(value, oldValue));
          } else {
            this.removeNodeCompletion(difference(oldValue, value));
          }
          // console.log('value', value)
          // console.log('this', this)
        },
      },
      rightDocument() {
        return (
          this.node.kind === 'document' || this.node.kind === 'exercise' || this.node.kind === 'zip'
        );
      },
    },
    methods: {
      ...mapActions('contentNode', ['addCompletion', 'removeCompletion']),
      trackClick(label) {
        this.$analytics.trackClick('channel_editor_modal_details', label);
      },
      addNodeCompletion(levels) {
        this.addCompletion({ ids: this.nodeIds, levels });
      },
      removeNodeCompletion(levels) {
        this.removeCompletion({ ids: this.nodeIds, levels });
      },
    },
    $trs: {
      completionLabel: 'Completion',
      learnersCanMarkComplete: 'Allow learners to mark as complete',
    },
  };

</script>
<style lang="scss">

</style>
