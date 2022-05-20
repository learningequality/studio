<template>

  <div>
    <!-- Main "Completion" dropdown menu based on node.kind -->
    <VLayout row wrap>
      <VFlex xs6 md6 class="pr-2">
        <VSelect
          v-if="showCompletion"
          ref="completion"
          v-model="selectedCompletion"
          box
          :items="showCorrectDropdownOptions"
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
          v-if="selectedDuration === 'shortActivity' || selectedDuration === 'longActivity'"
          v-model="minutes"
          :shortActivity="
            selectedDuration === 'shortActivity' || durationValue === 'shortActivity' ? true : false
          "
        />
        <ExactTimeToCompleteActivity
          v-if="selectedDuration === 'exactTime' && durationValue !== 'reference'"
          v-model="minutes"
          :duration="fileDuration"
          :audioVideoUpload="kind === 'video' || kind === 'audio'"
        />
      </VFlex>
      <!-- Reference option -->
      <VFlex v-if="selectedDuration === 'reference'" style="margin-bottom: 8px" xs6 md6>
        {{ $tr('referenceHint') }}
      </VFlex>
    </VLayout>

    <!-- Practice -->
    <!-- <VFlex v-if="node.kind === 'exercise' && selected === 'Practice until goal is met'" md6>
      <VSelect
        ref="goal"
        v-model="goal"
        box
        :items="completion"
        :label="$tr('goalLabel')"
        @focus="trackClick('Goal')"
      />
    </VFlex> -->

    <!-- Other options -->
    <!-- <VLayout row wrap>
      <PracticeUntilGoalMetActivity
        v-if="node.kind === 'exercise' && selectedDuration === 'Practice until goal is met'"
      />
    </VLayout> -->
  </div>

</template>

<script>

  import ShortOrLongActivity from './ShortOrLongActivity.vue';
  import ExactTimeToCompleteActivity from './ExactTimeToCompleteActivity.vue';
  // import PracticeUntilGoalMetActivity from './PracticeUntilGoalMetActivity.vue';
  import { CompletionCriteriaModels } from 'shared/constants';
  import {
    getCompletionValidators,
    getDurationValidators,
    translateValidator,
  } from 'shared/utils/validation';
  import { metadataStrings, metadataTranslationMixin } from 'shared/mixins';

  const DEFAULT_SHORT_ACTIVITY = 600;
  const DEFAULT_LONG_ACTIVITY = 2700;
  const CompletionOptionsMap = {
    allContent: 'All content viewed',
    completeDuration: 'Complete duration',
    goal: 'Practice until goal is met',
    practiceQuiz: 'Practice quiz',
  };

  export default {
    name: 'CompletionOptions',
    components: {
      ShortOrLongActivity,
      ExactTimeToCompleteActivity,
      // PracticeUntilGoalMetActivity,
    },
    mixins: [metadataStrings, metadataTranslationMixin],
    props: {
      kind: {
        type: String,
        required: false,
      },
      fileDuration: {
        type: Number,
        default: null,
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
        // goal: 'M of N',
        durationValue: null,
        completionValue: 'All content viewed',
        time: this.value.suggested_duration || DEFAULT_SHORT_ACTIVITY,
      };
    },
    computed: {
      showCompletion() {
        return this.kind === 'audio' || this.kind === 'video' || this.kind === 'html5'
          ? false
          : true;
      },
      minutes: {
        get() {
          return this.value.suggested_duration;
        },
        set(value) {
          if (
            this.selectedDuration === 'exactTime' ||
            this.selectedDuration === 'shortActivity' ||
            this.selectedDuration === 'longActivity'
          ) {
            this.handleInput({
              suggested_duration: value,
              completion_criteria: {
                model: CompletionCriteriaModels.APPROX_TIME,
                threshold: value,
              },
            });
          }
        },
      },
      selectedDuration: {
        get() {
          if (this.kind === 'audio' || this.kind === 'video') {
            if (this.value.model === 'approx_time') {
              if (this.durationValue === 'longActivity' || this.value.suggested_duration > 1860) {
                return 'longActivity';
              }
              if (this.durationValue === 'shortActivity') {
                return 'shortActivity';
              }
            }
            return this.value.model ? this.findDurationObject(this.value.model).id : 'exactTime';
            //this could probably be simplified to just be 'reference'
          } else {
            return this.value || {};
          }
        },
        set(duration) {
          this.durationValue = duration;
          if (this.durationValue === 'exactTime') {
            this.handleInput({
              suggested_duration: 849, //TODO: temporary - remove!
              completion_criteria: {
                model: CompletionCriteriaModels.TIME,
                threshold: 849, //TODO: temporary - remove!
              },
            });
          } else if (this.durationValue === 'reference') {
            this.handleInput({
              completion_criteria: {
                model: CompletionCriteriaModels.REFERENCE,
                threshold: null,
              },
            });
          } else if (
            this.durationValue === 'shortActivity' ||
            this.durationValue === 'longActivity'
          ) {
            console.log(
              '!!! set duration',
              this.durationValue,
              this.selectedDuration,
              this.value,
              this.time
            );
            if (this.durationValue === 'shortActivity' && this.value.suggested_duration > 1860) {
              this.time = DEFAULT_SHORT_ACTIVITY;
            } else if (
              this.durationValue === 'longActivity' &&
              this.value.suggested_duration < 1860
            ) {
              this.time = DEFAULT_LONG_ACTIVITY;
            }
            // If we are switching between short and long activities
            this.handleInput({
              suggested_duration: this.time,
              completion_criteria: {
                model: CompletionCriteriaModels.APPROX_TIME,
                threshold: this.time,
              },
            });
          }
        },
      },
      selectedCompletion: {
        get() {
          if (this.kind === 'document') {
            if (!this.completionValue) {
              this.handleInput({ model: CompletionCriteriaModels.PAGES, threshold: '100%' });
            }
            return this.completionValue || CompletionOptionsMap.allContent;
          }
          return this.completionValue;
        },
        set(value) {
          this.completionValue = value;

          //Do something if completion is 'All content viewed', else wait for duration to be set
          if (this.completionValue === CompletionOptionsMap.allContent) {
            return this.handleInput({ model: CompletionCriteriaModels.PAGES, threshold: '100%' });
          }
        },
      },
      showCorrectDropdownOptions() {
        const CompletionOptionsDropdownMap = {
          document: [`allContent`, `completeDuration`],
          exercise: [CompletionOptionsMap.goal, CompletionOptionsMap.practiceQuiz],
        };

        return CompletionOptionsDropdownMap[this.kind].map(model => ({
          text: this.$tr(model),
          value: CompletionOptionsMap[model],
        }));
      },
      showDurationOptions() {
        //this is used because of this Vuetify issue for dropdowns with multiple values: https://github.com/vuetifyjs/vuetify/issues/11529
        return [
          {
            text: this.$tr('exactTime'),
            value: CompletionCriteriaModels.TIME,
            id: 'exactTime',
          },
          {
            text: this.translateMetadataString('shortActivity'),
            value: CompletionCriteriaModels.APPROX_TIME,
            id: 'shortActivity',
          },
          {
            text: this.translateMetadataString('longActivity'),
            value: CompletionCriteriaModels.APPROX_TIME,
            id: 'longActivity',
          },
          {
            text: this.translateMetadataString('readReference'),
            value: CompletionCriteriaModels.REFERENCE,
            id: 'reference',
          },
        ];
      },
      durationOptions() {
        return this.showDurationOptions.map(model => ({ value: model.id, text: model.text }));
      },
      completionRules() {
        return this.required ? getCompletionValidators().map(translateValidator) : [];
      },
      durationRules() {
        return getDurationValidators().map(translateValidator);
      },
    },
    methods: {
      findDurationObject(model) {
        //workaround for Vuetify issue with multiple ids in dropdowns
        return this.showDurationOptions.find(i => i.value === model);
      },
      trackClick(label) {
        this.$analytics.trackClick('channel_editor_modal_details', label);
      },
      handleInput({ completion_criteria, suggested_duration } = {}) {
        const data = {
          completion_criteria,
          suggested_duration,
        };
        if (!completion_criteria) {
          data['completion_criteria'] = this.value['completion_criteria'];
        }
        if (suggested_duration === undefined) {
          data['suggested_duration'] = this.value['suggested_duration'];
        }
        this.$emit('input', data);
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      allContent: 'All content viewed',
      completeDuration: 'Complete duration',
      goal: 'Practice until goal is met',
      practiceQuiz: 'Practice quiz',
      exactTime: 'Exact time to complete',
      /* eslint-enable kolibri/vue-no-unused-translations */
      referenceHint:
        'Progress will not be tracked on reference material unless learners mark it as complete',
      // goalLabel: 'Goal',
    },
  };

</script>
<style lang="scss">
</style>
