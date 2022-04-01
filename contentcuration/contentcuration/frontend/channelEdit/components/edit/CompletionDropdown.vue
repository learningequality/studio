<template>

  <div>
    <!-- Checkbox for "Allow learners to mark complete" -->
    <VLayout row wrap>
      <VFlex md6>
        <Checkbox
          v-model="learnerManaged"
          color="primary"
          :label="$tr('learnersCanMarkComplete')"
          style="margin-top: 0px; padding-top: 0px"
        />
      </VFlex>

    </VLayout>

    <!-- Main "Completion" dropdown menu based on node.kind -->
    <VLayout row wrap>
      <VFlex xs6 md6 class="pr-2">
        <VSelect
          v-if="showCompletion"
          ref="completion"
          v-model="selectedCompletion"
          box
          :items="showCorrectDropdownMenu"
          :label="translateMetadataString('completion')"
          :required="required"
          :rules="completionRules"
          @focus="trackClick('Completion')"
        />
      </VFlex>
    </VLayout>

    <!-- "Duration" dropdown menu -->
    <VLayout row wrap>
      <VFlex xs6 md6 class="pr-2">
        <VSelect
          ref="duration"
          v-model="selectedDuration"
          box
          :items="durationOptions"
          :label="translateMetadataString('duration')"
          :required="required"
          :rules="durationRules"
          @focus="trackClick('Duration')"
        />
      </VFlex>
      <VFlex xs6 md6>
        <ShortOrLongActivity
          v-if="selectedDuration === 'Short activity' || selectedDuration === 'Long activity'"
          :shortActivity="selectedDuration === 'Short activity' ? true : false"
        />
        <ExactTimeToCompleteActivity
          v-if="selectedDuration === 'Exact time to complete'"
          :duration="file.id"
          :audioVideoUpload="node.kind === 'video' || node.kind === 'audio'"
        />
      </VFlex>
    </VLayout>

    <!-- Reference option -->
    <VFlex v-if="selectedDuration === 'Reference'" style="margin-bottom: 8px" xs12 md6>
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
        v-if="node.kind === 'exercise' && selectedDuration === 'Practice until goal is met'"
      />
    </VLayout>

  </div>

</template>

<script>

  import { mapGetters } from 'vuex';
  import ShortOrLongActivity from './ShortOrLongActivity.vue';
  import ExactTimeToCompleteActivity from './ExactTimeToCompleteActivity.vue';
  import PracticeUntilGoalMetActivity from './PracticeUntilGoalMetActivity.vue';
  import Checkbox from 'shared/views/form/Checkbox';
  import { CompletionCriteriaModels } from 'shared/constants';
  import {
    getCompletionValidators,
    getDurationValidators,
    translateValidator,
  } from 'shared/utils/validation';
  import { metadataStrings, metadataTranslationMixin } from 'shared/mixins';

  export default {
    name: 'CompletionDropdown',
    components: {
      ShortOrLongActivity,
      ExactTimeToCompleteActivity,
      PracticeUntilGoalMetActivity,
      Checkbox,
    },
    mixins: [metadataStrings, metadataTranslationMixin],
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      required: {
        type: Boolean,
        default: true,
      },
      value: {
        type: Object,
        required: false, //TODO: add validator?
      },
    },
    data() {
      return {
        learnersCanMarkComplete: false,
        goal: 'M of N',
        durationValue: null,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'completion']),
      ...mapGetters('file', ['getContentNodeFiles']),
      file() {
        return this.getContentNodeFiles(this.nodeId)[0];
      },
      showCompletion() {
        return (this.node.kind === 'audio' || this.node.kind === 'video') ? false : true;
      },
      learnerManaged: {
        get() {
          console.log('!!!this.learnersCanMarkComplete', this.learnersCanMarkComplete);
          return this.learnersCanMarkComplete;
        },
        set(value) {
          console.log('!!!value', value);
          this.handleInput({ learner_managed: value });
        }
      },
      selectedDuration: {
        get() {
          if(this.node.kind === 'audio' || this.node.kind === 'video') {
            return this.durationValue || this.durationOptions[0];
          } else {
            return this.durationValue;
          }
        },
        set(value) {
          this.durationValue = value;
          console.log('!!! durationValue', value)
          this.handleInput({ suggested_duration: value })
        },
      },
      selectedCompletion: {
        get() {
          console.log('!!!this.completionValue', CompletionCriteriaModels);
          console.log('!!!this.node.kind', this.node.kind);
          if (this.node.kind === 'document') {
            console.log(this.value)
            return this.value;
          }
          // if (this.node.kind === 'exercise') {
          //   return this.completionValue || CompletionCriteriaModels.MASTERY;
          // }
          return this.completionValue;
        },
        set(value) {
          this.completionValue = value;
          console.log('!!!set completionValue', this.completionValue)
          console.log('!!!this.node', this.node)
          let model, threshold;
          if (this.completionValue === 'All content viewed') {
            model = CompletionCriteriaModels.PAGES;
            threshold = "100%";
            console.log('!!!mode/threshold for all content viewed', model, threshold)
            this.handleInput({ model, threshold })
          }
          if (this.completionValue === 'Complete duration') {
            model = CompletionCriteriaModels.PAGES;
            console.log('!!!model for complete duration', model)
            this.handleInput({ model })
          }
          console.log('!!!else')
          return this.handleInput({ model, threshold })
        },
      },
      showCorrectDropdownMenu() {
        let correctDropdown;
        if (this.node.kind === 'document') {
          correctDropdown = ['All content viewed', 'Complete duration']
        }
        if (this.node.kind === 'exercise') {
          correctDropdown = [
            CompletionCriteriaModels.PRACTICE_UNTIL_GOAL_IS_MET,
            CompletionCriteriaModels.PRACTICE_QUIZ
          ]
        }
        return correctDropdown.map(model => ({
          // text: this.translateConstant(model),
          text: model,
          value: model,
        }));
      },
      node() {
        return this.getContentNode(this.nodeId);
      },
      completionRules() {
        return this.required ? getCompletionValidators().map(translateValidator) : [];
      },
      durationOptions() {//TODO update
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
      handleInput(newValue) {
        let data = {
          ...this.value,
          ...newValue,
        };
        console.log('!!!handleInput data', data)
        this.$emit('input', data);
      },
    },
    $trs: {
      learnersCanMarkComplete: 'Allow learners to mark as complete',
      referenceHint:
        'Progress will not be tracked on reference material unless learners mark it as complete',
      goalLabel: 'Goal',
    },
  };

</script>
<style lang="scss">

</style>
