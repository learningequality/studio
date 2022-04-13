<template>

  <div>
    <!-- Checkbox for "Allow learners to mark complete" -->
    <VLayout row wrap>
      <VFlex md6 class="pb-2">
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
          v-model="completedOption"
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
          v-if="selectedDuration === 'Short activity' || selectedDuration === 'Long activity'"
          v-model="minutes"
          :shortActivity="selectedDuration === 'Short activity' ? true : false"
        />
        <ExactTimeToCompleteActivity
          v-if="selectedDuration === 'Exact time to complete'"
          v-model="minutes"
          :duration="fileDuration"
          :audioVideoUpload="kind === 'video' || kind === 'audio'"
        />
      </VFlex>
    </VLayout>

    <!-- Reference option -->
    <VFlex v-if="selectedDuration === 'Reference'" style="margin-bottom: 8px" xs12 md6>
      {{ $tr('referenceHint') }}
    </VFlex>

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
  import PracticeUntilGoalMetActivity from './PracticeUntilGoalMetActivity.vue';
  import Checkbox from 'shared/views/form/Checkbox';
  import { CompletionCriteriaModels } from 'shared/constants';
  import {
    getCompletionValidators,
    getDurationValidators,
    translateValidator,
  } from 'shared/utils/validation';
  import { metadataStrings, metadataTranslationMixin } from 'shared/mixins';

  const CompletionOptionsMap = {
    allContent: 'All content viewed',
    completeDuration: "Complete duration",
    goal: 'Practice until goal is met',
    practiceQuiz: 'Practice quiz',
  }

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
      kind: {
        type: String,
        required: false,
      },
      fileDuration: {
        type: Number,
        default: 0,
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
        // goal: 'M of N',
        durationValue: null,
        durationInSeconds: 0,
        completionValue: 'All content viewed',
        time: this.value.suggested_duration || 0,
      };
    },
    computed: {
      // ...mapGetters('contentNode', ['getContentNode', 'completion']),
      showCompletion() {
        return (this.kind === 'audio' || this.kind === 'video') ? false : true;
      },
      learnerManaged: {
        get() {
          return this.learnersCanMarkComplete;
        },
        set(value) {
          this.handleInput({ learner_managed: value });
        }
      },
      minutes: {
        get() {
          return this.time; //TODO: find out what this is in the backend?
        },
        set(value) {
          this.time = value;
          console.log('!!! minutes setter', value, this.time)
          this.durationInSeconds = this.time * 60;
          if (this.durationValue === 'Exact time to complete' ||
            this.durationValue === 'Short activity' ||
            this.durationValue === 'Long activity')
          {
            this.handleInput({ suggested_duration: this.durationInSeconds });
            // this.$emit('changeTime', this.durationInSeconds);
          }
        }
      },
      // time() {
      //   return (this.value.suggested_duration || 0);
      // },
      selectedDuration: {
        get() {
          if(this.kind === 'audio' || this.kind === 'video') {
            return this.durationValue || {};
          } else {
            console.log('!!!in selectedDuration getter(), ', this.durationValue)
            return this.durationValue || {};
          }
        },
        set(duration) {
          console.log('!!!in selectedDuration: durationValue', duration)
          this.durationValue = duration; //TODO update this to the object

          // Duration for when COMPLETION is set to 'All content viewed'
          if (this.completionValue === 'All content viewed') {
            if (duration === 'Reference') {
              this.handleInput({
                model: CompletionCriteriaModels.REFERENCE,
                threshold: '100%', //TODO: double-check if this is correct; is there suggested_duration?
              })
            } else {
              this.handleInput({ model: CompletionCriteriaModels.PAGES, threshold: '100%' });

              // if (this.time === 0) {
              //   if (this.durationValue === 'Short activity') {
              //     this.handleInput({ suggested_duration: 10*60 });
              //   } else if (this.durationValue === 'Long activity') {
              //     this.handleInput({ suggested_duration: 45*60 });
              //   }
              // }

              this.durationInSeconds = this.time * 60;
              this.$emit('update', this.durationInSeconds);
              // this.handleInput({ suggested_duration: this.durationInSeconds });

            }
          }

          if (this.completionValue === 'Complete duration') {
            if (duration === 'Exact time to complete') {
              console.log('!!!model: CompletionCriteriaModels.TIME, this.time is', this.time, this.durationInSeconds)
              this.handleInput({
                model: CompletionCriteriaModels.TIME,
                threshold: this.durationInSeconds,
              });
            } else if (duration === 'Short activity' || duration === 'Long activity') {
              console.log("!!!model: CompletionCriteriaModels.APPROX_TIME, this.time is", this.time, this.durationInSeconds)
              this.handleInput({
                model: CompletionCriteriaModels.APPROX_TIME,
                threshold: this.durationInSeconds,
              });
            }
          }

        },
      },
      completedOption: {
        get() {
          if (this.kind === 'document') {
            if (!this.completionValue) {
              this.handleInput({ model: CompletionCriteriaModels.PAGES, threshold: '100%' })
            }
            return this.completionValue || CompletionOptionsMap.allContent;
          }
          return this.completionValue;
        },
        set(value) {
          this.completionValue = value;

          //Do something if completion is 'All content viewed', else wait for duration to be set
          if (this.completionValue === CompletionOptionsMap.allContent) {
            return this.handleInput({ model: CompletionCriteriaModels.PAGES, threshold: '100%' })
          }
        },
      },
      showCorrectDropdownOptions() {
        const CompletionOptionsDropdownMap = {
          document: [`allContent`, `completeDuration`],
          exercise: [CompletionOptionsMap.goal, CompletionOptionsMap.practiceQuiz],
        }

        return CompletionOptionsDropdownMap[this.kind].map(model => ({
          text: this.$tr(model),
          value: CompletionOptionsMap[model],
        }));
      },
      durationOptions() {
        return ['Exact time to complete', 'Short activity', 'Long activity', 'Reference'];
      },
      completionRules() {
        return this.required ? getCompletionValidators().map(translateValidator) : [];
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
        console.log('!!newValue', newValue, this.value)
        let data;
        if (newValue.model) {
          data = {
            ...this.value,
            extra_fields: {
              options: {
                ...newValue,
              }
            },
          };
        } else {
          data = {
            ...this.value,
            suggested_duration: newValue,
          };
        }

        console.log('!!!handleInput data', data)
        if(data.suggested_duration !== 0) {
          this.$emit('changeTime', data);
        } else {
          this.$emit('input', data);
        }
      },
    },
    $trs: {
      learnersCanMarkComplete: 'Allow learners to mark as complete',
      /* eslint-disable kolibri/vue-no-unused-translations */
      allContent: 'All content viewed',
      completeDuration: 'Complete duration',
      goal: 'Practice until goal is met',
      practiceQuiz: 'Practice quiz',
      /* eslint-enable kolibri/vue-no-unused-translations */
      referenceHint:
        'Progress will not be tracked on reference material unless learners mark it as complete',
      // goalLabel: 'Goal',
    },
  };

</script>
<style lang="scss">

</style>
