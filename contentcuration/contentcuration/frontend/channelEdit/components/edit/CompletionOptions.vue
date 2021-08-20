<template>

  <div>
    <!-- Checkbox visible only for "Practice" activities -->
    <VLayout v-if="node.kind === 'exercise'" row wrap>
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

    <!-- Main "Completion" dropdown menu -->
    <VLayout row wrap>
      <VFlex xs12 md6 class="pr-2">
        <VSelect
          ref="completion"
          v-model="completionOptions"
          box
          :items="showCorrectDropdown"
          :label="$tr('completionLabel')"
          @focus="trackClick('Completion')"
          @change="switchOptions"
        />
      </VFlex>
      <VFlex v-if="reference">
        <HelpTooltip
          :text="$tr('referenceTypesTooltip')"
          top
          :small="false"
        />
      </VFlex>

      <!-- Practice -->
      <VFlex v-if="node.kind === 'exercise'" md6>
        <VSelect
          ref="goal"
          v-model="goal"
          box
          :items="completion"
          :label="$tr('goalLabel')"
          @focus="trackClick('Goal')"
        />
      </VFlex>
      <!-- Other options -->
      <ExactTimeToCompleteActivity :audioVideoUpload="false" />
      <ShortOrLongActivity :shortActivity="true" />

    </VLayout>
    <PracticeUntilGoalMetActivity v-if="node.kind === 'exercise'" />
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

  import { mapGetters } from 'vuex';
  import HelpTooltip from '../../../shared/views/HelpTooltip.vue';
  import ShortOrLongActivity from './ShortOrLongActivity.vue';
  import ExactTimeToCompleteActivity from './ExactTimeToCompleteActivity.vue';
  import PracticeUntilGoalMetActivity from './PracticeUntilGoalMetActivity.vue';
  import { completionOptionsDropdownMap } from 'shared/constants';

  export default {
    name: 'CompletionOptions',
    components: {
      ShortOrLongActivity,
      HelpTooltip,
      ExactTimeToCompleteActivity,
      PracticeUntilGoalMetActivity,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        quiz: false,
        learnersCanMarkComplete: false,
        goal: 'M of N',
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'completion']),
      completionOptions: {
        get() {
          return completionOptionsDropdownMap[this.node.kind][0];
        },
        set(val) {
          // if content node kind is document? or how to tell if vselect
          this.$emit('input', val);
        },
      },
      showCorrectDropdown() {
        return completionOptionsDropdownMap[this.node.kind];
      },
      node() {
        return this.getContentNode(this.nodeId);
      },
      reference() {
        return false;
      },
    },
    methods: {
      trackClick(label) {
        this.$analytics.trackClick('channel_editor_modal_details', label);
      },
      switchOptions(val) {
        console.log('here', val);
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
