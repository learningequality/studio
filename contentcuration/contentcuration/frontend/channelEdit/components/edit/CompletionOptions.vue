<template>

  <div>
    <!-- "Completion" dropdown menu  -->
    <VLayout xs6 md6>
      <VFlex v-if="showCompletionDropdown" xs6 md6 class="pr-2">
        <VSelect
          ref="completion"
          v-model="completionDropdown"
          box
          :items="showCorrectCompletionOptions"
          :label="translateMetadataString('completion')"
          :required="required"
          :rules="completionRules"
          @focus="trackClick('Completion')"
        />
      </VFlex>
      <VFlex>
        <Goal
          v-if="kind === 'exercise'"
          ref="mastery_model"
          v-model="goal"
          :placeholder="getPlaceholder('mastery_model')"
          :required="isUnique(mastery_model)"
          @focus="trackClick('Mastery model')"
        />
      </VFlex>
    </VLayout>
    <VLayout>
      <MasteryDropdown
        v-if="kind === 'exercise'"
        ref="mastery_model"
        v-model="masteryModelItem"
        :masteryModel="mastery_model"
        :mPlaceholder="getPlaceholder('m')"
        :mRequired="isUnique(m)"
        :nPlaceholder="getPlaceholder('n')"
        :nRequired="isUnique(n)"
        @mFocus="trackClick('Mastery m value')"
        @nFocus="trackClick('Mastery n value')"
      />
    </VLayout>

    <VLayout row wrap>
      <VFlex xs6 md6 class="pr-2">
        <!-- "Duration" dropdown menu when required -->
        <VSelect
          v-if="!hideDurationDropdown"
          v-model="durationDropdown"
          box
          :items="durationOptions"
          :label="translateMetadataString('duration')"
          :required="required"
          @focus="trackClick('Duration')"
        />
        <!-- v-if="durationRequired" -->
        <!-- "Duration" dropdown menu w/clearble 'x' button -->
        <!-- <VSelect
          v-else
          v-model="durationDropdown"
          box
          clearable
          :items="durationOptions"
          :label="translateMetadataString('duration')"
          @focus="trackClick('Duration')"
        /> -->
      </VFlex>

      <!-- "Activity duration" input and details textbox -->
      <VFlex xs6 md6>
        <ActivityDuration
          v-if="showActivityDurationDropdown"
          v-model="minutes"
          :selectedDuration="currentDurationDropdown || durationDropdown"
          :duration="fileDuration"
          :audioVideoUpload="kind === 'video' || kind === 'audio'"
        />
      </VFlex>

      <!-- Reference hint -->
      <VFlex v-if="showReferenceHint" style="margin-bottom: 8px" xs6 md6>
        {{ $tr('referenceHint') }}
      </VFlex>
    </VLayout>
  </div>

</template>

<script>

  import ActivityDuration from './ActivityDuration.vue';
  import Goal from 'shared/views/Goal';
  import MasteryDropdown from 'shared/views/MasteryDropdown';
  import { CompletionCriteriaModels } from 'shared/constants';
  import {
    getCompletionValidators,
    // getDurationValidators,
    translateValidator,
  } from 'shared/utils/validation';
  import { metadataStrings, metadataTranslationMixin } from 'shared/mixins';

  const DEFAULT_SHORT_ACTIVITY = 600;
  const DEFAULT_LONG_ACTIVITY = 3000;
  const SHORT_LONG_ACTIVITY_MIDPOINT = 1860;
  const nonUniqueValue = {};
  nonUniqueValue.toString = () => '';

  const CompletionOptionsMap = {
    allContent: 'allContent',
    completeDuration: 'completeDuration',
    determinedByResource: 'determinedByResource',
    goal: 'goal',
    practiceQuiz: 'practiceQuiz',
    reference: 'reference',
  };

  export default {
    name: 'CompletionOptions',
    components: {
      ActivityDuration,
      MasteryDropdown,
      Goal,
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
      isPracticeQuiz: {
        type: Boolean,
        default: false,
      },
      value: {
        type: Object,
        required: false, //TODO: add validator?
      },
    },
    data() {
      return {
        disabledReference: ['reference'],
        // required state because we need to know the durationDropdown before it is set in backend
        currentDurationDropdown: null,
        // required state because we need to know the completion to determine durationDropdown model
        currentCompletionDropdown: null,
        mastery_model: null,
        m: null,
        n: null,
      };
    },
    computed: {
      showCompletionDropdown() {
        if (this.kind === 'exercise' && !this.isPracticeQuiz) {
          return false;
        }
        return true;
      },
      audioVideoResource() {
        return this.kind === 'audio' || this.kind === 'video';
      },
      hideDurationDropdown() {
        // named "hide" instead of "show" because "show" is the default behavior
        return (
          this.currentCompletionDropdown === CompletionOptionsMap.reference ||
          (this.value.model === 'reference' &&
            !this.currentCompletionDropdown &&
            this.audioVideoResource) ||
          //should be hidden if model is reference and we're getting this from the BE
          this.currentCompletionDropdown === CompletionOptionsMap.determinedByResource
        );
      },
      showReferenceHint() {
        if (this.kind === 'h5p' || this.kind === 'html5') {
          if (this.currentCompletionDropdown === CompletionOptionsMap.determinedByResource) {
            return false;
          }
          if (
            this.value.model === 'reference' &&
            this.currentCompletionDropdown === 'completeDuration'
          ) {
            return true;
          }
        }
        return (
          (this.durationDropdown === 'reference' &&
            this.currentCompletionDropdown === 'allContent') ||
          this.currentCompletionDropdown === 'reference' ||
          (this.value.model === 'reference' &&
            this.currentCompletionDropdown !== 'completeDuration')
        );
      },
      showActivityDurationDropdown() {
        if (!this.audioVideoResource) {
          // when user changes completion dropdown without having chosen from duration dropdown
          if (
            (this.currentCompletionDropdown === 'completeDuration' &&
              Object.values(this.value).every(key => key === null)) ||
            (this.currentCompletionDropdown === 'allContent' &&
              Object.values(this.value).every(key => key === null))
          ) {
            return false;
          }
          if (
            this.value.model !== 'reference' &&
            this.currentCompletionDropdown === 'completeDuration'
          ) {
            return true;
          }
          if (this.value.model !== 'reference' && this.currentCompletionDropdown === 'allContent') {
            return true;
          }
          if (this.value.model === 'reference') {
            return false;
          }
          if (!Object.values(this.value).every(key => key === null)) {
            // for initial, default state
            return true;
          }
        }
        if (this.audioVideoResource && this.value.model !== 'reference') {
          return true;
        }
        return false;
      },
      completionDropdown: {
        get() {
          if (this.audioVideoResource) {
            if (this.value.model === 'reference') {
              return CompletionOptionsMap.reference;
            }
            return CompletionOptionsMap.completeDuration; // default
          }

          if (this.kind === 'document') {
            if (!this.value['model']) {
              return CompletionOptionsMap.allContent;
            } else {
              if (this.value.model === 'pages' || this.value.model === 'reference') {
                return CompletionOptionsMap.allContent;
              }
              return CompletionOptionsMap.completeDuration;
            }
          }

          if (this.kind === 'html5') {
            if (!('this.value.model' in this.value)) {
              return CompletionOptionsMap.completeDuration;
            }
            return this.value.model;
          }

          if (this.kind === 'h5p') {
            if (!('this.value.model' in this.value)) {
              return CompletionOptionsMap.determinedByResource;
            }
            return CompletionOptionsMap.completeDuration;
          }

          if (this.kind === 'exercise') {
            if (this.value['model'] === 'mastery' && this.practiceQuiz) {
              return CompletionOptionsMap.goal;
            }
            // if the practice quiz flag is set, return "practice quiz"
            // else set to practice until goal is met
            return this.value.model;
          }

          return '';
        },
        set(value) {
          this.currentCompletionDropdown = value;
          let update = {};

          if (value === 'reference') {
            update.suggested_duration_type = null;
            update.completion_criteria = {
              model: CompletionCriteriaModels.REFERENCE,
              threshold: null,
            };
          }

          this.handleInput(update);
        },
      },
      goal: {
        get() {
          console.log('*** get mastery model item', this.value.mastery_model);
          return {
            mastery_model: this.value.mastery_model,
          };
        },
        set(goal) {
          console.log(goal);
          this.handleInput(goal);
        },
      },
      masteryModelItem: {
        get() {
          return {
            mastery_model: this.value.mastery_model,
            m: this.value.m,
            n: this.value.n,
          };
        },
        set(mastery_criteria) {
          console.log(mastery_criteria);
          this.handleInput(mastery_criteria);
        },
      },
      // durationRequired() {
      //   if (this.audioVideoResource) {
      //     console.log('!!!! duration required TRUE', this.completionDropdown);
      //     return true;
      //   }
      //   if (
      //     this.kind === 'document' &&
      //     this.completionDropdown === CompletionOptionsMap.completeDuration
      //   ) {
      //     console.log('!!!! duration required TRUE', this.completionDropdown);
      //     return true;
      //   }

      //   if (
      //     this.kind === 'html5' &&
      //     this.completionDropdown === CompletionOptionsMap.completeDuration
      //   ) {
      //     console.log('!!!! duration required TRUE', this.completionDropdown);
      //     return true;
      //   }
      //   console.log('!!!! duration required FALSE', this.completionDropdown);
      //   return false;
      // },
      isLongActivity() {
        return (
          this.value.suggested_duration > SHORT_LONG_ACTIVITY_MIDPOINT &&
          this.value.suggested_duration_type === 'approx_time'
        );
      },
      isShortActivity() {
        return (
          this.value.suggested_duration <= SHORT_LONG_ACTIVITY_MIDPOINT &&
          this.value.suggested_duration_type === 'approx_time'
        );
      },
      isExactTime() {
        // return this.value.model === 'time';
        return this.value.suggested_duration_type === 'time';
      },
      isSwitchingFromCompleteDurationToAllContent() {
        return (
          this.completionDropdown === CompletionOptionsMap.completeDuration &&
          this.currentCompletionDropdown === CompletionOptionsMap.allContent
        );
      },
      isSwitchingFromAllContentToCompleteDuration() {
        return (
          this.completionDropdown === CompletionOptionsMap.allContent &&
          this.currentCompletionDropdown === CompletionOptionsMap.completeDuration
        );
      },
      requiresAudioVideoDefault() {
        return this.audioVideoResource && !this.value.model;
      },
      completionDropdownIsCompleteDuration() {
        return (
          (this.completionDropdown === null &&
            this.currentCompletionDropdown === 'completeDuration') ||
          (this.completionDropdown === 'completeDuration' &&
            this.currentCompletionDropdown === null) ||
          (this.completionDropdown === 'completeDuration' &&
            this.currentCompletionDropdown === 'completeDuration') ||
          this.currentCompletionDropdown === 'completeDuration'
        );
      },
      completionDropdownIsAllContentViewed() {
        return (
          (this.completionDropdown === null && this.currentCompletionDropdown === 'allContent') ||
          (this.completionDropdown === 'allContent' && this.currentCompletionDropdown === null) ||
          (this.completionDropdown === 'allContent' &&
            this.currentCompletionDropdown === 'allContent')
        );
      },
      durationDropdown: {
        get() {
          console.log('GET this.value', this.value);

          if (
            this.value.model === 'reference' ||
            (this.currentCompletionDropdown === CompletionOptionsMap.completeDuration &&
              this.currentDurationDropdown === 'reference')
          ) {
            return 'reference';
          } else if (this.value.model === 'pages') {
            if (this.isLongActivity) {
              return 'longActivity';
            }
            if (this.isShortActivity) {
              return 'shortActivity';
            }
            if (this.isExactTime) {
              return 'exactTime';
            }
          } else if (this.value.model === 'time' || this.audioVideoResource) {
            return 'exactTime';
          } else {
            if (this.isLongActivity) {
              return 'longActivity';
            }
            if (this.isShortActivity) {
              return 'shortActivity';
            }
          }
          return '';
        },
        set(duration) {
          this.currentDurationDropdown = duration;
          console.log(
            'this.currentDurationDropdown before setter',
            this.currentDurationDropdown,
            this.durationDropdown,
            this.currentCompletionDropdown,
            this.completionDropdown
          );

          const update = {};

          if (duration === 'reference') {
            update.suggested_duration_type = null;
            update.completion_criteria = {
              model: CompletionCriteriaModels.REFERENCE,
              threshold: null,
            };
          } else if (
            this.isSwitchingFromCompleteDurationToAllContent ||
            this.completionDropdownIsAllContentViewed
          ) {
            if (duration === 'exactTime') {
              update.suggested_duration_type = 'time';
              update.suggested_duration = this.value.suggested_duration || 60;
            }
            if (duration === 'shortActivity') {
              update.suggested_duration_type = 'approx_time';
              const roundedValue = Math.round(this.value.suggested_duration / 300) * 300;
              if (roundedValue > SHORT_LONG_ACTIVITY_MIDPOINT || roundedValue <= 0) {
                update.suggested_duration = DEFAULT_SHORT_ACTIVITY;
              } else {
                update.suggested_duration = roundedValue;
              }
            }
            if (duration === 'longActivity') {
              update.suggested_duration_type = 'approx_time';
              const roundedValue = Math.round(this.value.suggested_duration / 600) * 600;
              if (roundedValue < SHORT_LONG_ACTIVITY_MIDPOINT || roundedValue > 7200) {
                update.suggested_duration = DEFAULT_LONG_ACTIVITY;
              } else {
                update.suggested_duration = roundedValue;
              }
            }
            update.completion_criteria = {
              model: CompletionCriteriaModels.PAGES,
              threshold: '100%',
            };
          } else if (
            this.isSwitchingFromAllContentToCompleteDuration ||
            this.requiresAudioVideoDefault ||
            this.completionDropdownIsCompleteDuration
          ) {
            if (duration === 'shortActivity') {
              update.suggested_duration_type = 'approx_time';
              const roundedValue = Math.round(this.value.suggested_duration / 300) * 300;
              if (roundedValue > SHORT_LONG_ACTIVITY_MIDPOINT || roundedValue <= 0) {
                update.suggested_duration = DEFAULT_SHORT_ACTIVITY;
              } else {
                update.suggested_duration = roundedValue;
              }
              update.completion_criteria = {
                model: CompletionCriteriaModels.APPROX_TIME,
                threshold: update.suggested_duration,
              };
            }
            if (duration === 'longActivity') {
              update.suggested_duration_type = 'approx_time';
              const roundedValue = Math.round(this.value.suggested_duration / 600) * 600;
              if (roundedValue < SHORT_LONG_ACTIVITY_MIDPOINT || roundedValue > 7200) {
                update.suggested_duration = DEFAULT_LONG_ACTIVITY;
              } else {
                update.suggested_duration = roundedValue;
              }
              update.completion_criteria = {
                model: CompletionCriteriaModels.APPROX_TIME,
                threshold: update.suggested_duration,
              };
            }
            if (duration === 'exactTime') {
              update.suggested_duration_type = 'time';
              update.suggested_duration = this.value.suggested_duration || 60;
              update.completion_criteria = {
                model: CompletionCriteriaModels.TIME,
                threshold: update.suggested_duration,
              };
            }
          }

          console.log('update', update);
          this.handleInput(update);
        },
      },
      minutes: {
        get() {
          return this.value.suggested_duration;
        },
        set(value) {
          if (this.value.model === 'pages') {
            this.handleInput({
              suggested_duration: value,
            });
          } else {
            this.handleInput({
              suggested_duration: value,
              completion_criteria: {
                model: this.value.model,
                threshold: value,
              },
            });
          }
        },
      },
      showCorrectCompletionOptions() {
        const CompletionOptionsDropdownMap = {
          document: [CompletionOptionsMap.allContent, CompletionOptionsMap.completeDuration],
          exercise: [CompletionOptionsMap.goal, CompletionOptionsMap.practiceQuiz],
          html5: [CompletionOptionsMap.completeDuration, CompletionOptionsMap.determinedByResource],
          h5p: [CompletionOptionsMap.determinedByResource, CompletionOptionsMap.completeDuration],
          audio: [CompletionOptionsMap.completeDuration, CompletionOptionsMap.reference],
          video: [CompletionOptionsMap.completeDuration, CompletionOptionsMap.reference],
        };

        return CompletionOptionsDropdownMap[this.kind].map(model => ({
          text: this.$tr(model),
          value: CompletionOptionsMap[model],
        }));
      },
      allPossibleDurationOptions() {
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
        if (
          (this.kind === 'document' &&
            this.currentCompletionDropdown === CompletionOptionsMap.completeDuration) ||
          this.audioVideoResource
        ) {
          return this.allPossibleDurationOptions.map(model => ({
            value: model.id,
            text: model.text,
            disabled: this.disabledReference.includes(model.value),
          }));
        } else {
          return this.allPossibleDurationOptions.map(model => ({
            value: model.id,
            text: model.text,
          }));
        }
      },
      completionRules() {
        return this.required ? getCompletionValidators().map(translateValidator) : [];
      },
      // TODO: reinstate this
      // durationRules() {
      //   return getDurationValidators().map(translateValidator);
      // },
      oneSelected() {
        return 1;
      },
    },
    methods: {
      trackClick(label) {
        this.$analytics.trackClick('channel_editor_modal_details', label);
      },
      handleInput({
        completion_criteria,
        suggested_duration,
        suggested_duration_type,
        ...mastery
      } = {}) {
        const data = {
          completion_criteria,
          suggested_duration,
          suggested_duration_type,
          ...mastery,
        };

        console.log('data', data);
        if (!completion_criteria) {
          data['completion_criteria'] = this.value['completion_criteria'];
        }
        if (suggested_duration === undefined) {
          data['suggested_duration'] = this.value['suggested_duration'];
        }
        if (suggested_duration_type === undefined) {
          data['suggested_duration_type'] = this.value['suggested_duration_type'];
        }
        if (!mastery) {
          data['mastery_model'] = this.value['mastery'];
        }

        this.$emit('input', data);
      },
      isUnique(value) {
        return value !== nonUniqueValue;
      },
      getPlaceholder(field) {
        // Should only show if multiple nodes are selected with different
        // values for the field (e.g. if author field is different on the selected nodes)
        return this.oneSelected || this.isUnique(this[field]) ? '' : '---';
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
