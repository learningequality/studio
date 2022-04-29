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
          v-if="durationValue === 'Short activity' || durationValue === 'Long activity'"
          v-model="minutes"
          :shortActivity="durationValue === 'Short activity' ? true : false"
        />
        <ExactTimeToCompleteActivity
          v-if="durationValue === 'Exact time to complete'"
          v-model="minutes"
          :duration="fileDuration"
          :audioVideoUpload="kind === 'video' || kind === 'audio'"
        />
      </VFlex>
    </VLayout>

    <!-- Reference option -->
    <VFlex v-if="durationValue === 'Reference'" style="margin-bottom: 8px" xs12 md6>
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
// import PracticeUntilGoalMetActivity from './PracticeUntilGoalMetActivity.vue';
import { CompletionCriteriaModels } from 'shared/constants';
import {
  getCompletionValidators,
  getDurationValidators,
  translateValidator,
} from 'shared/utils/validation';
import { metadataStrings, metadataTranslationMixin } from 'shared/mixins';

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
      return this.kind === 'audio' || this.kind === 'video' || this.kind === 'html5' ? false : true;
    },
    minutes: {
      get() {
        return this.time;
      },
      set(value) {
        this.time = value;
        console.log('!!! minutes setter', value, this.time);
        this.durationInSeconds = this.time * 60;
        if (
          this.durationValue === 'Exact time to complete' ||
          this.durationValue === 'Short activity' ||
          this.durationValue === 'Long activity'
        ) {
          this.handleInput({ suggested_duration: this.durationInSeconds });
          // this.$emit('changeTime', this.durationInSeconds);
        }
      },
    },
    // time() {
    //   return (this.value.suggested_duration || 0);
    // },
    selectedDuration: {
      get() {
        if (this.kind === 'audio' || this.kind === 'video') {
          return this.value || {};
        } else {
          console.log('!!!in selectedDuration getter() is ', this.value);
          return this.value || {};
        }
      },
      set(duration) {
        this.durationValue = duration;
        console.log('!!!in selectedDuration: durationValue is ', duration);
        if (
          this.durationValue === 'Exact time to complete' ||
          this.durationValue === 'Short activity' ||
          this.durationValue === 'Long activity'
        ) {
          this.handleInput({ suggested_duration: this.durationInSeconds });
        }

        // // Duration for when COMPLETION is set to 'All content viewed'
        // if (this.completionValue === 'All content viewed') {
        //   if (duration === 'Reference') {
        //     this.handleInput({
        //       model: CompletionCriteriaModels.REFERENCE,
        //       threshold: '100%', //TODO: double-check if this is correct; is there suggested_duration?
        //     });
        //     console.log('!!!in selectedDuration: durationValue', duration);
        //   } else {
        //     this.handleInput({ model: CompletionCriteriaModels.PAGES, threshold: '100%' });
        //     console.log('!!!in selectedDuration: durationValue', duration);

        //     // if (this.time === 0) {
        //     //   if (this.durationValue === 'Short activity') {
        //     //     this.handleInput({ suggested_duration: 10*60 });
        //     //   } else if (this.durationValue === 'Long activity') {
        //     //     this.handleInput({ suggested_duration: 45*60 });
        //     //   }
        //     // }

        //     this.durationInSeconds = this.time * 60;
        //     this.$emit('update', this.durationInSeconds);
        //     // this.handleInput({ suggested_duration: this.durationInSeconds });
        //   }
        // }

        // if (this.completionValue === 'Complete duration') {
        //   if (duration === 'Exact time to complete') {
        //     console.log(
        //       '!!!model: CompletionCriteriaModels.TIME, this.time is',
        //       this.time,
        //       this.durationInSeconds
        //     );
        //     this.handleInput({
        //       model: CompletionCriteriaModels.TIME,
        //       threshold: this.durationInSeconds,
        //     });
        //   } else if (duration === 'Short activity' || duration === 'Long activity') {
        //     console.log(
        //       '!!!model: CompletionCriteriaModels.APPROX_TIME, this.time is',
        //       this.time,
        //       this.durationInSeconds
        //     );
        //     this.handleInput({
        //       model: CompletionCriteriaModels.APPROX_TIME,
        //       threshold: this.durationInSeconds,
        //     });
        //   }
        // }
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

      return CompletionOptionsDropdownMap[this.kind].map((model) => ({
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
      console.log('!!in handleInput, newValue is ', newValue, this.value);
      let data;
      if (newValue.model) {
        data = {
          ...this.value,
          extra_fields: {
            options: {
              completion_criteria: {
                ...newValue,
              },
            },
          },
        };
      } else {
        data = {
          ...this.value,
          ...newValue
        };
      }
      console.log('!!! in handleInput, data is ', data);
      this.$emit('input', data);
    },
  },
  $trs: {
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
