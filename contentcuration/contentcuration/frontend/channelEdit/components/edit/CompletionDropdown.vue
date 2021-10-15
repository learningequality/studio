<template>

  <div>
    <!-- Checkbox for "Allow learners to mark complete" -->
    <VLayout row wrap>
      <VFlex v-if="showLearnersCompleteCheckbox" md6>
        <KCheckbox
          v-model="learnersCanMarkComplete"
          color="primary"
          :label="$tr('learnersCanMarkComplete')"
          style="margin-top: 0px; padding-top: 0px"
        />
      </VFlex>

    </VLayout>

    <!-- Checkbox that is visible only for "Practice" activities -->
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
          v-if="node.kind !== 'audio'"
          ref="completion"
          v-model="selected"
          box
          :items="showCorrectDropdownMenu"
          :label="$tr('completionLabel')"
          :required="required"
          :rules="completionRules"
          @focus="trackClick('Completion')"
        />
      </VFlex>
    </VLayout>

    <!-- "Duration" dropdown menu -->
    <VLayout row wrap>
      <VFlex xs12 md6 class="pr-2">
        <VSelect
          ref="duration"
          v-model="durationSelected"
          box
          :items="durationOptions"
          :label="$tr('durationLabel')"
          :required="required"
          :rules="durationRules"
          @focus="trackClick('Completion')"
        />
      </VFlex>
      <VFlex xs12 md6>
        <ShortOrLongActivity
          v-if="durationSelected === 'Short activity' || durationSelected === 'Long activity'"
          :shortActivity="durationSelected === 'Short activity' ? true : false"
        />
        <ExactTimeToCompleteActivity
          v-if="durationSelected === 'Exact time to complete'"
          :audioVideoUpload="node.kind === 'video' || node.kind === 'audio'"
        />
      </VFlex>
    </VLayout>

    <!-- Reference option -->
    <VFlex v-if="durationSelected === 'Reference'" style="margin-bottom: 8px" xs12 md6>
      {{ $tr('referenceHint') }}
    </VFlex>

    <!-- Practice -->
    <VFlex v-if="node.kind === 'exercise' && selected === 'Practice until goal is met'" md6>
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
    <VLayout row wrap>
      <PracticeUntilGoalMetActivity
        v-if="node.kind === 'exercise' && durationSelected === 'Practice until goal is met'"
      />
    </VLayout>

  </div>

</template>

<script>

  import { mapGetters } from 'vuex';
  import HelpTooltip from '../../../shared/views/HelpTooltip.vue';
  import ShortOrLongActivity from './ShortOrLongActivity.vue';
  import ExactTimeToCompleteActivity from './ExactTimeToCompleteActivity.vue';
  import PracticeUntilGoalMetActivity from './PracticeUntilGoalMetActivity.vue';
  import { completionDropdownMap } from 'shared/constants';
  import {
    getCompletionValidators,
    getDurationValidators,
    translateValidator,
  } from 'shared/utils/validation';

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
      required: {
        type: Boolean,
        default: true,
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
      durationSelected: {
        get() {
          console.log('get', this.value);
          return this.value;
        },
        set(value) {
          this.value = value;
          this.$emit('input', value);
        },
      },
      selected: {
        get() {
          // allows us to use default values only on audio, video, or docs in dropdown
          if (this.node.kind === 'exercise' || this.node.kind == 'zip') {
            return this.value;
          } else {
            return this.value || completionDropdownMap[this.node.kind][0];
          }
        },
        set(value) {
          this.value = value;
          console.log('*******new completion value:', this.value, this.learnersCanMarkComplete);
          this.$emit('input', value);
        },
      },
      showCorrectDropdownMenu() {
        return completionDropdownMap[this.node.kind];
      },
      node() {
        return this.getContentNode(this.nodeId);
      },
      showLearnersCompleteCheckbox() {
        if (this.node.kind !== 'video' || this.node.kind !== 'audio') {
          if (this.selected === 'Exact time to complete') {
            return false;
          }
        }
        return true;
      },
      completionRules() {
        return this.required ? getCompletionValidators().map(translateValidator) : [];
      },
      durationOptions() {
        return ['Exact time to complete', 'Short activity', 'Long activity', 'Reference'];
      },
      durationRules() {
        return this.required ? getDurationValidators().map(translateValidator) : [];
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
      durationLabel: 'Duration',
      learnersCanMarkComplete: 'Allow learners to mark as complete',
      referenceHint:
        'Progress will not be tracked on reference material unless learners mark it as complete',
      goalLabel: 'Goal',
    },
  };

</script>
<style lang="scss">

</style>
