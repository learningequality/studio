<template>

  <div>
    <!-- Layout when practice quizzes are enabled -->
    <VLayout xs6 md6>
      <!-- "Completion" dropdown menu  -->
      <DropdownWrapper component="VFlex" xs6 md6 class="pr-2">
        <template #default="{ attach, menuProps }">
          <VSelect
            ref="completion"
            v-model="completionDropdown"
            box
            :items="showCorrectCompletionOptions"
            :label="translateMetadataString('completion')"
            :required="required"
            :rules="completionRules"
            :menu-props="menuProps"
            :attach="attach"
            @focus="trackClick('Completion')"
          />
        </template>
      </DropdownWrapper>
      <VFlex>
        <MasteryCriteriaGoal
          v-if="showMasteryCriteriaGoalDropdown"
          ref="mastery_model"
          v-model="goal"
          :placeholder="getPlaceholder('mastery_model')"
          :required="isUnique(mastery_model)"
          @focus="trackClick('Mastery model')"
        />
      </VFlex>
    </VLayout>

    <VLayout>
      <MasteryCriteriaMofNFields
        v-if="kind === 'exercise'"
        ref="mastery_model_m_of_n"
        v-model="masteryModelItem"
        :showMofN="showMofN"
        :mPlaceholder="getPlaceholder('m')"
        :mRequired="isUnique(m)"
        :nPlaceholder="getPlaceholder('n')"
        :nRequired="isUnique(n)"
        @mFocus="trackClick('Mastery m value')"
        @nFocus="trackClick('Mastery n value')"
      />
    </VLayout>

    <VLayout row wrap>
      <DropdownWrapper component="VFlex" xs6 md6 class="pr-2">
        <template #default="{ attach, menuProps }">
          <VSelect
            v-if="!hideDurationDropdown"
            ref="duration"
            v-model="durationDropdown"
            box
            :items="selectableDurationOptions"
            :label="translateMetadataString('duration')"
            :required="required"
            :rules="durationRules"
            :menu-props="{ ...menuProps, zIndex: 4 }"
            :attach="attach"
            @focus="trackClick('Duration')"
          />
        </template>
      </DropdownWrapper>

      <!-- "Activity duration" minutes input -->
      <VFlex xs6 md6>
        <ActivityDuration
          v-if="showActivityDurationInput"
          ref="activity_duration"
          v-model="minutes"
          :selectedDuration="currentDurationDropdown || durationDropdown"
          :duration="fileDuration"
          :selectedCompletion="currentCompletionDropdown || completionDropdown"
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

  import get from 'lodash/get';
  import MasteryCriteriaGoal from './MasteryCriteriaGoal';
  import ActivityDuration from './ActivityDuration.vue';
  import MasteryCriteriaMofNFields from './MasteryCriteriaMofNFields';
  import {
    CompletionCriteriaModels,
    ContentModalities,
    CompletionDropdownMap,
    DurationDropdownMap,
  } from 'shared/constants';
  import { MasteryModelsNames } from 'shared/leUtils/MasteryModels';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import {
    getCompletionValidators,
    getDurationValidators,
    translateValidator,
  } from 'shared/utils/validation';
  import { metadataStrings, metadataTranslationMixin } from 'shared/mixins';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  const DEFAULT_SHORT_ACTIVITY = 600;
  const DEFAULT_LONG_ACTIVITY = 3000;
  const SHORT_LONG_ACTIVITY_MIDPOINT = 1860;
  const nonUniqueValue = {};
  nonUniqueValue.toString = () => '';

  const SuggestedDurationTypesMap = {
    APPROX_TIME: 'approx_time',
    TIME: 'time',
  };

  export default {
    name: 'CompletionOptions',
    components: {
      DropdownWrapper,
      ActivityDuration,
      MasteryCriteriaMofNFields,
      MasteryCriteriaGoal,
    },
    mixins: [metadataStrings, metadataTranslationMixin],
    props: {
      kind: {
        type: String,
        required: false,
        default: null,
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
        required: false,
        default: () => ({}),
      },
    },
    data() {
      return {
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
      showMasteryCriteriaGoalDropdown() {
        if (this.kind === ContentKindsNames.EXERCISE) {
          //this ensures that anytime the completion dropdown is practice quiz
          return this.value.modality !== ContentModalities.QUIZ;
        }
        return false;
      },
      audioVideoResource() {
        return this.kind === ContentKindsNames.AUDIO || this.kind === ContentKindsNames.VIDEO;
      },
      hideDurationDropdown() {
        // named "hide" instead of "show" because "show" is the default behavior
        if (this.value) {
          if (this.kind === ContentKindsNames.H5P) {
            return true;
          }
          return (
            this.currentCompletionDropdown === CompletionDropdownMap.reference ||
            (this.value.model === CompletionCriteriaModels.REFERENCE &&
              !this.currentCompletionDropdown) ||
            //should be hidden if model is reference and we're getting this from the BE
            this.currentCompletionDropdown === CompletionDropdownMap.determinedByResource
          );
        }
        return false;
      },
      showReferenceHint() {
        /*
          The reference hint should be shown only when "Reference" is selected
        */
        if (this.value) {
          if (this.kind === ContentKindsNames.H5P || this.kind === ContentKindsNames.HTML5) {
            if (this.currentCompletionDropdown === CompletionDropdownMap.determinedByResource) {
              return false;
            }
            if (
              this.value.model === CompletionCriteriaModels.REFERENCE &&
              this.currentCompletionDropdown === CompletionDropdownMap.completeDuration
            ) {
              return true;
            }
          }
          if (this.audioVideoResource) {
            return this.value.model === CompletionCriteriaModels.REFERENCE;
          }
          return (
            this.value.model === CompletionCriteriaModels.REFERENCE &&
            this.currentCompletionDropdown !== CompletionDropdownMap.completeDuration
          );
        }
        return false;
      },
      showActivityDurationInput() {
        /* The `ActivityDuration` component should visible when:
          - Long activity, short activity, or exact time are chosen if it is not an AV resource
          - Long activity or short activity are chosen if it is an AV resource
          - Long activity, short activity, or exact time are chosen in HTML5
        */
        if (this.value) {
          const switchingFromReferenceBetweenAllContentViewedAndCompleteDuration =
            this.value.suggested_duration === null || this.value.suggested_duration_type === null;

          if (!this.audioVideoResource) {
            if (this.kind === ContentKindsNames.HTML5 || this.kind === ContentKindsNames.H5P) {
              if (this.value.model !== CompletionCriteriaModels.REFERENCE) {
                if (!this.currentCompletionDropdown) {
                  return true;
                }
                return this.currentCompletionDropdown === CompletionDropdownMap.completeDuration;
              }
            }
            return !(
              this.value.model === CompletionCriteriaModels.REFERENCE ||
              switchingFromReferenceBetweenAllContentViewedAndCompleteDuration
            );
          }
        }
        return this.audioVideoResource && this.value.model !== CompletionCriteriaModels.REFERENCE;
      },
      completionDropdown: {
        get() {
          if (this.audioVideoResource) {
            if (this.value.model === CompletionCriteriaModels.REFERENCE) {
              return CompletionDropdownMap.reference;
            }
            return CompletionDropdownMap.completeDuration;
          }

          if (this.kind === ContentKindsNames.DOCUMENT) {
            if (!this.value['model']) {
              return CompletionDropdownMap.allContent;
            } else {
              if (
                this.value.model === CompletionCriteriaModels.PAGES ||
                this.value.model === CompletionCriteriaModels.REFERENCE
              ) {
                return CompletionDropdownMap.allContent;
              }
              return CompletionDropdownMap.completeDuration;
            }
          }

          if (this.kind === ContentKindsNames.HTML5) {
            if (
              !this.value['model'] ||
              this.value.model === CompletionCriteriaModels.APPROX_TIME ||
              this.value.model === CompletionCriteriaModels.TIME ||
              this.value.model === CompletionCriteriaModels.REFERENCE
            ) {
              return CompletionDropdownMap.completeDuration;
            }
            return CompletionDropdownMap.determinedByResource;
          }

          if (this.kind === ContentKindsNames.H5P) {
            if (
              !this.value['model'] ||
              this.value.model === CompletionCriteriaModels.DETERMINED_BY_RESOURCE
            ) {
              return CompletionDropdownMap.determinedByResource;
            }
            return CompletionDropdownMap.completeDuration;
          }

          if (this.kind === ContentKindsNames.EXERCISE) {
            // if the practice quiz flag is set, return "practice quiz"
            if (this.practiceQuizzesAllowed && this.value.modality === ContentModalities.QUIZ) {
              return CompletionDropdownMap.practiceQuiz;
            }
            return CompletionDropdownMap.goal;
          }

          return '';
        },
        set(value) {
          const update = {};
          this.currentCompletionDropdown = value;

          // FOR AUDIO/VIDEO
          if (value === CompletionDropdownMap.reference) {
            update.suggested_duration_type = this.value.suggested_duration_type;
            update.completion_criteria = {
              model: CompletionCriteriaModels.REFERENCE,
              threshold: null,
            };
          }

          // FOR DOCUMENTS
          if (this.kind === ContentKindsNames.DOCUMENT) {
            if (value === CompletionDropdownMap.allContent) {
              update.suggested_duration_type = this.value.suggested_duration_type;
              update.suggested_duration = this.value.suggested_duration;
              update.completion_criteria = {
                model: CompletionCriteriaModels.PAGES,
                threshold: '100%',
              };
            } else if (value === CompletionDropdownMap.reference) {
              update.suggested_duration_type = null;
              update.completion_criteria = {
                model: CompletionCriteriaModels.REFERENCE,
                threshold: null,
              };
            } else {
              update.suggested_duration_type = this.value.suggested_duration_type;
              update.suggested_duration = this.value.suggested_duration;
              if (
                this.durationDropdown === DurationDropdownMap.LONG_ACTIVITY ||
                this.durationDropdown === DurationDropdownMap.SHORT_ACTIVITY
              ) {
                update.completion_criteria = {
                  model: CompletionCriteriaModels.APPROX_TIME,
                  threshold: this.value.suggested_duration || 0,
                };
              } else if (this.durationDropdown === DurationDropdownMap.EXACT_TIME) {
                update.completion_criteria = {
                  model: CompletionCriteriaModels.TIME,
                  threshold: this.value.suggested_duration || 0,
                };
              } else {
                // default state
                update.completion_criteria = {
                  model: this.value.model,
                  threshold: this.value.threshold,
                };
              }
            }
          }

          // FOR H5P/HTML5
          if (this.kind === ContentKindsNames.HTML5 || this.kind === ContentKindsNames.H5P) {
            if (value === CompletionDropdownMap.determinedByResource) {
              update.completion_criteria = {
                model: CompletionCriteriaModels.DETERMINED_BY_RESOURCE,
                threshold: null,
              };
            }
          }

          // FOR EXERCISES
          if (this.kind === ContentKindsNames.EXERCISE) {
            if (value === CompletionDropdownMap.practiceQuiz) {
              update.modality = ContentModalities.QUIZ;
              update.completion_criteria = {
                model: this.value.model,
                threshold: this.value.threshold,
              };
            } else {
              update.modality = null;
              update.completion_criteria = {
                model: this.value.model,
                threshold: this.value.threshold,
              };
            }
          }
          this.handleInput(update);
        },
      },
      goal: {
        get() {
          if (this.value.threshold) {
            return { mastery_model: this.value.threshold.mastery_model };
          }
          return { mastery_model: this.mastery_model };
        },
        set(threshold) {
          const update = {};
          if (threshold.mastery_model === MasteryModelsNames.M_OF_N) {
            update.completion_criteria = {
              model: CompletionCriteriaModels.MASTERY,
              threshold: {
                mastery_model: threshold.mastery_model,
                m: get(this.value, 'threshold.m') || this.m,
                n: get(this.value, 'threshold.n') || this.n,
              },
            };
          } else {
            update.completion_criteria = {
              model: CompletionCriteriaModels.MASTERY,
              threshold: {
                mastery_model: threshold.mastery_model,
                m: null,
                n: null,
              },
            };
          }
          this.handleInput(update);
        },
      },
      showMofN() {
        if (this.kind === ContentKindsNames.EXERCISE) {
          if (this.value.modality === ContentModalities.QUIZ) {
            return false;
          }
          if (this.value.threshold) {
            const defaultStateWhenSwitchingFromGoalToPracticeQuiz =
              this.value.threshold.mastery_model === MasteryModelsNames.M_OF_N &&
              this.currentCompletionDropdown === null;
            if (
              this.currentCompletionDropdown === CompletionDropdownMap.goal &&
              this.value.threshold.mastery_model === MasteryModelsNames.M_OF_N
            ) {
              return true;
            }
            if (defaultStateWhenSwitchingFromGoalToPracticeQuiz) {
              return true;
            }
          }
        }
        return false;
      },
      masteryModelItem: {
        get() {
          if (get(this.value, 'threshold.mastery_model') !== MasteryModelsNames.M_OF_N) {
            return {
              m: null,
              n: null,
            };
          }
          return {
            m: get(this.value, 'threshold.m') || this.m,
            n: get(this.value, 'threshold.n') || this.n,
          };
        },
        set(threshold) {
          this.m = get(threshold, 'm') || this.m;
          this.n = get(threshold, 'n') || this.n;

          const mastery_model = get(this.value, 'threshold.mastery_model');
          const completion_criteria = {
            model: CompletionCriteriaModels.MASTERY,
            threshold: {
              mastery_model,
            },
          };
          if (mastery_model === MasteryModelsNames.M_OF_N) {
            completion_criteria.threshold.m = this.m;
            completion_criteria.threshold.n = this.n;
          }
          this.handleInput({ completion_criteria });
        },
      },
      isLongActivity() {
        return (
          this.value.suggested_duration > SHORT_LONG_ACTIVITY_MIDPOINT &&
          this.value.suggested_duration_type === SuggestedDurationTypesMap.APPROX_TIME
        );
      },
      isShortActivity() {
        return (
          this.value.suggested_duration <= SHORT_LONG_ACTIVITY_MIDPOINT &&
          this.value.suggested_duration_type === SuggestedDurationTypesMap.APPROX_TIME
        );
      },
      isExactTime() {
        return this.value.suggested_duration_type === SuggestedDurationTypesMap.TIME;
      },
      isSwitchingFromCompleteDurationToAllContent() {
        return (
          this.completionDropdown === CompletionDropdownMap.completeDuration &&
          this.currentCompletionDropdown === CompletionDropdownMap.allContent
        );
      },
      isSwitchingFromAllContentToCompleteDuration() {
        return (
          this.completionDropdown === CompletionDropdownMap.allContent &&
          this.currentCompletionDropdown === CompletionDropdownMap.completeDuration
        );
      },
      requiresAudioVideoDefault() {
        return this.audioVideoResource && !this.value.model;
      },
      completionDropdownIsCompleteDuration() {
        return (
          (this.completionDropdown === null &&
            this.currentCompletionDropdown === CompletionDropdownMap.completeDuration) ||
          (this.completionDropdown === CompletionDropdownMap.completeDuration &&
            this.currentCompletionDropdown === null) ||
          (this.completionDropdown === CompletionDropdownMap.completeDuration &&
            this.currentCompletionDropdown === CompletionDropdownMap.completeDuration) ||
          this.currentCompletionDropdown === CompletionDropdownMap.completeDuration
        );
      },
      completionDropdownIsAllContentViewed() {
        return (
          (this.completionDropdown === null &&
            this.currentCompletionDropdown === CompletionDropdownMap.allContent) ||
          (this.completionDropdown === CompletionDropdownMap.allContent &&
            this.currentCompletionDropdown === null) ||
          (this.completionDropdown === CompletionDropdownMap.allContent &&
            this.currentCompletionDropdown === CompletionDropdownMap.allContent)
        );
      },
      durationDropdown: {
        get() {
          if (this.value) {
            const defaultStateForAudioVideo =
              this.value.suggested_duration === null &&
              !this.value.suggested_duration_type &&
              this.audioVideoResource;
            if (
              this.value.model === CompletionCriteriaModels.REFERENCE ||
              (this.currentCompletionDropdown === CompletionDropdownMap.completeDuration &&
                this.currentDurationDropdown === DurationDropdownMap.REFERENCE)
            ) {
              return DurationDropdownMap.REFERENCE;
            } else if (this.value.model === CompletionCriteriaModels.PAGES) {
              if (this.isLongActivity) {
                return DurationDropdownMap.LONG_ACTIVITY;
              }
              if (this.isShortActivity) {
                return DurationDropdownMap.SHORT_ACTIVITY;
              }
              if (this.isExactTime) {
                return DurationDropdownMap.EXACT_TIME;
              }
            } else if (
              this.value.model === CompletionCriteriaModels.TIME ||
              defaultStateForAudioVideo
            ) {
              return DurationDropdownMap.EXACT_TIME;
            } else {
              if (this.isLongActivity) {
                return DurationDropdownMap.LONG_ACTIVITY;
              }
              if (this.isShortActivity) {
                return DurationDropdownMap.SHORT_ACTIVITY;
              }
              if (this.isExactTime) {
                return DurationDropdownMap.EXACT_TIME;
              }
            }
          }
          return '';
        },
        set(duration) {
          const update = {};
          this.currentDurationDropdown = duration;

          if (duration === DurationDropdownMap.REFERENCE) {
            update.suggested_duration_type = null;
            update.completion_criteria = {
              model: CompletionCriteriaModels.REFERENCE,
              threshold: null,
            };
          } else if (
            this.isSwitchingFromCompleteDurationToAllContent ||
            this.completionDropdownIsAllContentViewed
          ) {
            if (duration === DurationDropdownMap.EXACT_TIME) {
              update.suggested_duration_type = SuggestedDurationTypesMap.TIME;
              update.suggested_duration = this.value.suggested_duration || 60;
            }
            if (duration === DurationDropdownMap.SHORT_ACTIVITY) {
              update.suggested_duration_type = SuggestedDurationTypesMap.APPROX_TIME;
              update.suggested_duration = this.handleMinutesInputFromActivityDuration(
                this.value.suggested_duration,
                duration
              );
            }
            if (duration === DurationDropdownMap.LONG_ACTIVITY) {
              update.suggested_duration_type = SuggestedDurationTypesMap.APPROX_TIME;
              update.suggested_duration = this.handleMinutesInputFromActivityDuration(
                this.value.suggested_duration,
                duration
              );
            }
            update.completion_criteria = {
              model: CompletionCriteriaModels.PAGES,
              threshold: '100%',
            };
          } else if (
            this.isSwitchingFromAllContentToCompleteDuration ||
            this.requiresAudioVideoDefault ||
            this.completionDropdownIsCompleteDuration ||
            this.kind === ContentKindsNames.HTML5 ||
            this.kind === ContentKindsNames.H5P
          ) {
            if (duration === DurationDropdownMap.SHORT_ACTIVITY) {
              update.suggested_duration_type = SuggestedDurationTypesMap.APPROX_TIME;
              update.suggested_duration = this.handleMinutesInputFromActivityDuration(
                this.value.suggested_duration,
                duration
              );
              update.completion_criteria = {
                model: CompletionCriteriaModels.APPROX_TIME,
                threshold: update.suggested_duration,
              };
            }
            if (duration === DurationDropdownMap.LONG_ACTIVITY) {
              update.suggested_duration_type = SuggestedDurationTypesMap.APPROX_TIME;
              update.suggested_duration = this.handleMinutesInputFromActivityDuration(
                this.value.suggested_duration,
                duration
              );
              update.completion_criteria = {
                model: CompletionCriteriaModels.APPROX_TIME,
                threshold: update.suggested_duration,
              };
            }
            if (duration === DurationDropdownMap.EXACT_TIME) {
              update.suggested_duration_type = SuggestedDurationTypesMap.TIME;
              update.suggested_duration = this.value.suggested_duration || 60;
              update.completion_criteria = {
                model: CompletionCriteriaModels.TIME,
                threshold: update.suggested_duration,
              };
            }
          }

          if (this.value.model === CompletionCriteriaModels.MASTERY) {
            if (duration === DurationDropdownMap.SHORT_ACTIVITY) {
              update.suggested_duration = this.handleMinutesInputFromActivityDuration(
                this.value.suggested_duration,
                duration
              );
              update.completion_criteria = {
                model: this.value.model,
                threshold: this.value.threshold,
              };
            }
            if (duration === DurationDropdownMap.LONG_ACTIVITY) {
              update.suggested_duration_type = SuggestedDurationTypesMap.APPROX_TIME;
              const roundedValue = Math.round(this.value.suggested_duration / 600) * 600;
              if (roundedValue < SHORT_LONG_ACTIVITY_MIDPOINT || roundedValue > 7200) {
                update.suggested_duration = DEFAULT_LONG_ACTIVITY;
              } else {
                update.suggested_duration = roundedValue;
              }
              update.completion_criteria = {
                model: this.value.model,
                threshold: this.value.threshold,
              };
            }
            if (duration === DurationDropdownMap.EXACT_TIME) {
              update.suggested_duration_type = SuggestedDurationTypesMap.TIME;
              update.suggested_duration = this.value.suggested_duration || 60;
              update.completion_criteria = {
                model: this.value.model,
                threshold: this.value.threshold,
              };
            }
          }

          this.handleInput(update);
        },
      },
      minutes: {
        get() {
          return this.value.suggested_duration;
        },
        set(minutes) {
          if (
            this.value.model === CompletionCriteriaModels.PAGES ||
            this.value.model === CompletionCriteriaModels.MASTERY
          ) {
            this.handleInput({
              suggested_duration: minutes,
              completion_criteria: {
                model: this.value.model,
                threshold: this.value.threshold,
              },
            });
          } else {
            this.handleInput({
              suggested_duration: minutes,
              completion_criteria: {
                model: this.value.model,
                threshold: minutes,
              },
            });
          }
        },
      },
      showCorrectCompletionOptions() {
        const CompletionOptionsDropdownMap = {
          document: [
            CompletionDropdownMap.allContent,
            CompletionDropdownMap.completeDuration,
            CompletionDropdownMap.reference,
          ],
          exercise: [CompletionDropdownMap.goal, CompletionDropdownMap.practiceQuiz],
          html5: [
            CompletionDropdownMap.completeDuration,
            CompletionDropdownMap.determinedByResource,
            CompletionDropdownMap.reference,
          ],
          h5p: [
            CompletionDropdownMap.determinedByResource,
            CompletionDropdownMap.completeDuration,
            CompletionDropdownMap.reference,
          ],
          audio: [CompletionDropdownMap.completeDuration, CompletionDropdownMap.reference],
          video: [CompletionDropdownMap.completeDuration, CompletionDropdownMap.reference],
        };
        if (this.kind) {
          return CompletionOptionsDropdownMap[this.kind].map(model => ({
            text: this.$tr(model),
            value: CompletionDropdownMap[model],
          }));
        }
        return [];
      },
      allPossibleDurationOptions() {
        //this is used because of this Vuetify issue for dropdowns with multiple values: https://github.com/vuetifyjs/vuetify/issues/11529
        return [
          {
            text: this.$tr(DurationDropdownMap.EXACT_TIME),
            value: CompletionCriteriaModels.TIME,
            id: 'exactTime',
          },
          {
            text: this.translateMetadataString(DurationDropdownMap.SHORT_ACTIVITY),
            value: CompletionCriteriaModels.APPROX_TIME,
            id: 'shortActivity',
          },
          {
            text: this.translateMetadataString(DurationDropdownMap.LONG_ACTIVITY),
            value: CompletionCriteriaModels.APPROX_TIME,
            id: 'longActivity',
          },
        ];
      },
      /**
       * When the duration dropdown is for audio, video, or documents, if "Complete duration"
       * is chosen, then "Reference" cannot be selected
       */
      selectableDurationOptions() {
        if (
          this.kind === ContentKindsNames.DOCUMENT &&
          this.currentCompletionDropdown === CompletionDropdownMap.completeDuration
        ) {
          return this.allPossibleDurationOptions.map(model => ({
            value: model.id,
            text: model.text,
          }));
        } else if (this.kind === ContentKindsNames.EXERCISE) {
          return this.allPossibleDurationOptions.map(model => ({
            value: model.id,
            text: model.text,
          }));
        } else {
          return this.allPossibleDurationOptions.map(model => ({
            value: model.id,
            text: model.text,
          }));
        }
      },
      completionRules() {
        if (this.kind) {
          return this.required ? getCompletionValidators().map(translateValidator) : [];
        }
        return false;
      },
      durationRules() {
        const defaultStateForDocument = this.currentCompletionDropdown === null;
        if (this.value) {
          const allContentViewedIsChosenInCompletionDropdown =
            this.currentCompletionDropdown === CompletionDropdownMap.allContent ||
            (this.value.model === CompletionCriteriaModels.PAGES &&
              this.currentCompletionDropdown === CompletionDropdownMap.allContent);

          if (defaultStateForDocument || allContentViewedIsChosenInCompletionDropdown) {
            return [];
          }
        }
        return getDurationValidators().map(translateValidator);
      },
    },
    methods: {
      trackClick(label) {
        this.$analytics.trackClick('channel_editor_modal_details', label);
      },
      handleMinutesInputFromActivityDuration(minutes, duration) {
        let suggested_duration;
        let roundedValue;
        if (duration === DurationDropdownMap.SHORT_ACTIVITY) {
          roundedValue = Math.round(minutes / 300) * 300;
          if (roundedValue > SHORT_LONG_ACTIVITY_MIDPOINT || roundedValue <= 0) {
            suggested_duration = DEFAULT_SHORT_ACTIVITY;
          } else {
            suggested_duration = roundedValue;
          }
        }
        if (duration === DurationDropdownMap.LONG_ACTIVITY) {
          roundedValue = Math.round(minutes / 600) * 600;
          if (roundedValue < SHORT_LONG_ACTIVITY_MIDPOINT || roundedValue > 7200) {
            suggested_duration = DEFAULT_LONG_ACTIVITY;
          } else {
            suggested_duration = roundedValue;
          }
        }
        return suggested_duration;
      },
      handleInput({
        completion_criteria,
        suggested_duration,
        suggested_duration_type,
        modality,
      } = {}) {
        const data = {
          completion_criteria,
          suggested_duration,
          suggested_duration_type,
          modality,
        };

        if (!completion_criteria) {
          data['completion_criteria'] = this.value['completion_criteria'];
        }
        if (modality === undefined) {
          data['modality'] = this.value['modality'];
        }
        if (suggested_duration === undefined) {
          data['suggested_duration'] = this.value['suggested_duration'];
        }
        if (suggested_duration_type === undefined) {
          data['suggested_duration_type'] = this.value['suggested_duration_type'];
        }

        this.$emit('input', data);
      },
      isUnique(value) {
        return value !== nonUniqueValue;
      },
      getPlaceholder(field) {
        return this.isUnique(this[field]) ? '' : '---';
      },
    },
    $trs: {
      /* eslint-disable kolibri/vue-no-unused-translations */
      allContent: 'Viewed in its entirety',
      completeDuration: 'When time spent is equal to duration',
      determinedByResource: 'Determined by the resource',
      goal: 'When goal is met',
      practiceQuiz: 'Practice quiz',
      reference: 'Reference material',
      /* eslint-enable */
      exactTime: 'Time to complete',
      referenceHint:
        'Progress will not be tracked on reference material unless learners mark it as complete',
    },
  };

</script>
<style lang="less" scoped>

</style>
