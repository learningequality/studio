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

    <!-- Main "Completion" dropdown menu based on node.kind -->
    <VLayout row wrap>
      <VFlex xs12 md6 class="pr-2">
        <VSelect
          ref="completion"
          v-model="selected"
          box
          :items="showCorrectDropdownMenu"
          :label="$tr('completionLabel')"
          @focus="trackClick('Completion')"
        />
        <!-- Reference -->
        <VFlex v-if="selected === 'Reference'" style="margin-bottom: 8px">
          {{ $tr('referenceHint') }}
        </VFlex>
        <VLayout row wrap>
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
      </VFlex>
      <!-- Reference -->
      <VFlex v-if="selected === 'Reference'">
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
      <ExactTimeToCompleteActivity
        v-if="selected === 'Exact time to complete'"
        :audioVideoUpload="node.kind === 'video' || node.kind === 'audio'"
      />
      <ShortOrLongActivity
        v-if="selected === 'Short activity' || selected === 'Long activity'"
        :shortActivity="selected === 'Short activity' ? true : false"
      />
    </VLayout>
    <PracticeUntilGoalMetActivity v-if="node.kind === 'exercise'" />
  </div>

</template>

<script>

  import { mapGetters } from 'vuex';
  import HelpTooltip from '../../../shared/views/HelpTooltip.vue';
  import ShortOrLongActivity from './ShortOrLongActivity.vue';
  import ExactTimeToCompleteActivity from './ExactTimeToCompleteActivity.vue';
  import PracticeUntilGoalMetActivity from './PracticeUntilGoalMetActivity.vue';
  import { completionDropdownMap } from 'shared/constants';

  export default {
    name: 'CompletionDropdown',
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
        value: null,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'completion']),
      selected: {
        get() {
          return this.value || completionDropdownMap[this.node.kind][0];
        },
        set(value) {
          // this.$emit('input', value); // I don't think we currently need this
          this.value = value;
        },
      },
      showCorrectDropdownMenu() {
        return completionDropdownMap[this.node.kind];
      },
      node() {
        return this.getContentNode(this.nodeId);
      },
    },
    methods: {
      trackClick(label) {
        this.$analytics.trackClick('channel_editor_modal_details', label);
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
