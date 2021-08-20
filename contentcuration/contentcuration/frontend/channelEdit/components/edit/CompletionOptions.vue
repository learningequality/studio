<template>

  <div>
    <VLayout row wrap>
      <!-- Add v-if for when "practice" -->
      <KCheckbox
        v-model="quiz"
        color="primary"
        :label="$tr('quizCheckboxLabel')"
        style="margin-top: 0px; padding-top: 0px"
      />
      <HelpTooltip
        :text="$tr('quizHelpTooltip')"
        top
        style="margin-left:8px"
      />
    </VLayout>
    <VLayout row wrap>
      <VFlex xs12 md6 class="pr-2">
        <VSelect
          ref="completion"
          v-model="contentCompletion"
          box
          :items="showCorrectDropdown"
          :label="$tr('completionLabel')"
          @focus="trackClick('Completion')"
        />
      </VFlex>
      <VFlex v-if="reference">
        <HelpTooltip
          :text="$tr('referenceTypesTooltip')"
          top
          :small="false"
        />
      </VFlex>
      <VFlex md6>
        <VSelect
          ref="goal"
          v-model="goal"
          box
          :items="completion"
          :label="$tr('goalLabel')"
          @focus="trackClick('Goal')"
        />
      </VFlex>
    </VLayout>
    <PracticeUntilGoalMetActivity />
    <ExactTimeToCompleteActivity :audioVideoUpload="false" />
    <ShortOrLongActivity :shortActivity="true" />
    <VLayout>
      <VFlex v-if="reference">
        {{ $tr('referenceHint') }}
      </VFlex>
    </VLayout>
    <VLayout>
      <VFlex>
        <!-- need to add v-if below for when "!audioVideo" -->
        <KCheckbox
          v-model="learnersCanMarkComplete"
          color="primary"
          :label="$tr('learnersCanMarkComplete')"
          style="margin-top: 0px; padding-top: 0px"
        />
      </VFlex>
    </VLayout>
  </div>

</template>

<script>

  import { mapGetters, mapActions } from 'vuex';
  import difference from 'lodash/difference';
  import intersection from 'lodash/intersection';
  import HelpTooltip from '../../../shared/views/HelpTooltip.vue';
  import ShortOrLongActivity from './ShortOrLongActivity.vue';
  import ExactTimeToCompleteActivity from './ExactTimeToCompleteActivity.vue';
  import PracticeUntilGoalMetActivity from './PracticeUntilGoalMetActivity.vue';
  import { completionOptionsDropdownMap } from 'shared/constants';
  // import Checkbox from 'shared/views/form/Checkbox';

  export default {
    name: 'CompletionOptions',
    components: {
      ShortOrLongActivity,
      HelpTooltip,
      ExactTimeToCompleteActivity,
      PracticeUntilGoalMetActivity,
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
        quiz: false,
        learnersCanMarkComplete: false,
        completionText: 'All content viewed',
        goal: 'M of N',
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodes', 'getContentNode', 'completion']),
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      showCorrectDropdown() {
        return completionOptionsDropdownMap[this.node.kind];
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
        },
      },
      reference() {
        return false;
      },
      // rightDocument() {
      //   return (
      //     this.node.kind === 'document' ||
      //     this.node.kind === 'exercise' ||
      //     this.node.kind === 'zip'
      //   );
      // },
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
      quizCheckboxLabel: 'Make this a quiz',
      quizHelpTooltip:
        'Require learners to complete all questions. They will receive a score and be able to check their answers',
      completionLabel: 'Completion',
      learnersCanMarkComplete: 'Allow learners to mark as complete',
      referenceTypesTooltip: 'Textbooks, dictionaries, indexes, and other similar resources',
      referenceHint:
        'Progress will not be tracked on reference material unless learners mark it as complete',
      goalLabel: 'Goal',
    },
  };

</script>
<style lang="scss">

</style>
