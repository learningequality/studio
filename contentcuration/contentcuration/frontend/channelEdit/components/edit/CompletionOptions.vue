<template>

  <div>
    <!-- Checkbox for "Allow learners to mark complete" -->
    <Checkbox
      v-model="learnerManaged"
      color="primary"
      :label="$tr('learnersCanMarkComplete')"
      style="padding-bottom: 16px;"
    />
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
          v-model="masteryModel"
          :placeholder="getPlaceholder('mastery_model')"
          :required="isUnique(masteryModel)"
          @focus="trackClick('Mastery model')"
        />
      </VFlex>
    </VLayout>

    <VLayout>
      <MasteryCriteriaMofNFields
        v-if="kind === 'exercise'"
        ref="mastery_model_m_of_n"
        v-model="mOfN"
        :showMofN="showMofN"
        :mPlaceholder="getPlaceholder('mOfN.m')"
        :mRequired="isUnique(mOfN.m)"
        :nPlaceholder="getPlaceholder('mOfN.n')"
        :nRequired="isUnique(mOfN.n)"
        @mFocus="trackClick('Mastery m value')"
        @nFocus="trackClick('Mastery n value')"
      />
    </VLayout>

    <VLayout row wrap>
      <DropdownWrapper v-if="showDuration" component="VFlex" xs6 md6 class="pr-2">
        <template #default="{ attach, menuProps }">
          <VSelect
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
      <VFlex v-if="showDuration" xs6 md6>
        <ActivityDuration
          ref="activity_duration"
          v-model="durationValue"
          :selectedDuration="durationDropdown"
          :duration="fileDuration"
          :selectedCompletion="completionDropdown"
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
    nonUniqueValue,
  } from 'shared/constants';
  import Checkbox from 'shared/views/form/Checkbox';
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

  const defaultCompletionCriteriaModels = {
    [ContentKindsNames.VIDEO]: CompletionCriteriaModels.TIME,
    [ContentKindsNames.AUDIO]: CompletionCriteriaModels.TIME,
    [ContentKindsNames.DOCUMENT]: CompletionCriteriaModels.PAGES,
    [ContentKindsNames.H5P]: CompletionCriteriaModels.DETERMINED_BY_RESOURCE,
    [ContentKindsNames.HTML5]: CompletionCriteriaModels.APPROX_TIME,
    [ContentKindsNames.EXERCISE]: CompletionCriteriaModels.MASTERY,
  };

  const defaultCompletionCriteriaThresholds = {
    // Audio and Video threshold defaults are dynamic based
    // on the duration of the file itself.
    [ContentKindsNames.DOCUMENT]: '100%',
    [ContentKindsNames.HTML5]: 300,
    // We cannot set an automatic default threshold for exercises.
  };

  const completionCriteriaToDropdownMap = {
    [CompletionCriteriaModels.TIME]: CompletionDropdownMap.completeDuration,
    [CompletionCriteriaModels.APPROX_TIME]: CompletionDropdownMap.completeDuration,
    [CompletionCriteriaModels.PAGES]: CompletionDropdownMap.allContent,
    [CompletionCriteriaModels.DETERMINED_BY_RESOURCE]: CompletionDropdownMap.determinedByResource,
    [CompletionCriteriaModels.MASTERY]: CompletionDropdownMap.goal,
    [CompletionCriteriaModels.REFERENCE]: CompletionDropdownMap.reference,
  };

  const CompletionOptionsDropdownMap = {
    [ContentKindsNames.DOCUMENT]: [
      CompletionDropdownMap.allContent,
      CompletionDropdownMap.completeDuration,
      CompletionDropdownMap.reference,
    ],
    [ContentKindsNames.EXERCISE]: [CompletionDropdownMap.goal, CompletionDropdownMap.practiceQuiz],
    [ContentKindsNames.HTML5]: [
      CompletionDropdownMap.completeDuration,
      CompletionDropdownMap.determinedByResource,
      CompletionDropdownMap.reference,
    ],
    [ContentKindsNames.H5P]: [
      CompletionDropdownMap.determinedByResource,
      CompletionDropdownMap.completeDuration,
      CompletionDropdownMap.reference,
    ],
    [ContentKindsNames.VIDEO]: [
      CompletionDropdownMap.completeDuration,
      CompletionDropdownMap.reference,
    ],
    [ContentKindsNames.AUDIO]: [
      CompletionDropdownMap.completeDuration,
      CompletionDropdownMap.reference,
    ],
  };

  export default {
    name: 'CompletionOptions',
    components: {
      Checkbox,
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
    computed: {
      model() {
        return this.value.model || defaultCompletionCriteriaModels[this.kind];
      },
      threshold() {
        if (!this.value.model) {
          return this.generateDefaultThreshold();
        }
        return this.value.threshold;
      },
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
      showDuration() {
        return (
          this.model === CompletionCriteriaModels.TIME ||
          this.model === CompletionCriteriaModels.APPROX_TIME
        );
      },
      showReferenceHint() {
        /*
          The reference hint should be shown only when "Reference" is selected
        */
        return this.model === CompletionCriteriaModels.REFERENCE;
      },
      completionDropdown: {
        get() {
          if (
            this.value.modality === ContentModalities.QUIZ &&
            this.model === CompletionCriteriaModels.MASTERY
          ) {
            return CompletionDropdownMap.practiceQuiz;
          }
          return completionCriteriaToDropdownMap[this.model];
        },
        set(value) {
          const update = {};

          if (value === CompletionDropdownMap.reference) {
            update.model = CompletionCriteriaModels.REFERENCE;
            update.durationType = null;
            update.duration = null;
            update.threshold = null;
          } else if (value === CompletionDropdownMap.completeDuration) {
            update.model = this.audioVideoResource
              ? CompletionCriteriaModels.TIME
              : CompletionCriteriaModels.APPROX_TIME;
            if (!this.audioVideoResource) {
              update.threshold = DEFAULT_SHORT_ACTIVITY;
              update.duration = update.threshold;
            } else {
              update.threshold = this.generateDefaultThreshold();
              update.duration = update.threshold;
            }
            update.durationType = update.model;
          } else if (value === CompletionDropdownMap.allContent) {
            update.model = CompletionCriteriaModels.PAGES;
            update.threshold = '100%';
          } else if (value === CompletionDropdownMap.determinedByResource) {
            update.model = CompletionCriteriaModels.DETERMINED_BY_RESOURCE;
            update.durationType = null;
            update.duration = null;
            update.threshold = null;
          } else if (value === CompletionDropdownMap.practiceQuiz) {
            update.modality = ContentModalities.QUIZ;
            update.threshold = { mastery_model: MasteryModelsNames.DO_ALL };
          } else if (value === CompletionDropdownMap.goal) {
            update.modality = null;
            update.model = CompletionCriteriaModels.MASTERY;
          }
          this.handleInput(update);
        },
      },
      masteryModel: {
        get() {
          return get(this, 'threshold.mastery_model');
        },
        set(mastery_model) {
          const update = { threshold: { mastery_model } };
          if (mastery_model === MasteryModelsNames.M_OF_N) {
            update.threshold.m = get(this, 'threshold.m');
            update.threshold.n = get(this, 'threshold.n');
          }
          this.handleInput(update);
        },
      },
      showMofN() {
        if (this.kind !== ContentKindsNames.EXERCISE) {
          return false;
        }
        if (this.value.modality === ContentModalities.QUIZ) {
          return false;
        }
        return get(this, 'threshold.mastery_model') === MasteryModelsNames.M_OF_N;
      },
      mOfN: {
        get() {
          return {
            m: get(this.value, 'threshold.m'),
            n: get(this.value, 'threshold.n'),
          };
        },
        set(threshold) {
          const mastery_model = get(this, 'threshold.mastery_model');
          if (mastery_model === MasteryModelsNames.M_OF_N) {
            threshold.mastery_model = mastery_model;
            this.handleInput({ threshold });
          }
        },
      },
      timeBasedModel() {
        return (
          this.model === CompletionCriteriaModels.TIME ||
          this.model === CompletionCriteriaModels.APPROX_TIME
        );
      },
      durationValue: {
        get() {
          return this.timeBasedModel ? this.threshold : this.value.suggested_duration;
        },
        set(duration) {
          const update = {
            duration,
          };
          if (this.timeBasedModel) {
            update.threshold = duration;
          }
          this.handleInput(update);
        },
      },
      durationType() {
        return this.timeBasedModel ? this.model : this.value.suggested_duration_type;
      },
      durationDropdown: {
        get() {
          if (this.durationType === CompletionCriteriaModels.TIME) {
            return DurationDropdownMap.EXACT_TIME;
          }
          if (
            this.durationValue > SHORT_LONG_ACTIVITY_MIDPOINT &&
            this.durationType === CompletionCriteriaModels.APPROX_TIME
          ) {
            return DurationDropdownMap.LONG_ACTIVITY;
          }
          return DurationDropdownMap.SHORT_ACTIVITY;
        },
        set(dropdownValue) {
          const update = {};
          if (dropdownValue === DurationDropdownMap.EXACT_TIME) {
            update.durationType = CompletionCriteriaModels.TIME;
          } else if (
            dropdownValue === DurationDropdownMap.LONG_ACTIVITY ||
            dropdownValue === DurationDropdownMap.SHORT_ACTIVITY
          ) {
            update.durationType = CompletionCriteriaModels.APPROX_TIME;
            update.duration = this.handleMinutesInputFromActivityDuration(
              this.durationValue,
              dropdownValue
            );
          } else {
            update.durationType = null;
          }
          if (this.timeBasedModel) {
            update.model = update.durationType;
            update.threshold = update.duration || this.durationValue;
          }
          this.handleInput(update);
        },
      },
      showCorrectCompletionOptions() {
        if (this.kind) {
          return CompletionOptionsDropdownMap[this.kind].map(model => ({
            text: this.$tr(model),
            value: CompletionDropdownMap[model],
          }));
        }
        return [];
      },
      selectableDurationOptions() {
        return [
          {
            text: this.$tr(DurationDropdownMap.EXACT_TIME),
            value: 'exactTime',
          },
          {
            text: this.translateMetadataString(DurationDropdownMap.SHORT_ACTIVITY),
            value: 'shortActivity',
          },
          {
            text: this.translateMetadataString(DurationDropdownMap.LONG_ACTIVITY),
            value: 'longActivity',
          },
        ];
      },
      completionRules() {
        if (this.kind && this.required) {
          return getCompletionValidators().map(translateValidator);
        }
        return [];
      },
      durationRules() {
        if (this.completionDropdown === CompletionDropdownMap.completeDuration) {
          return getDurationValidators().map(translateValidator);
        }
        return [];
      },
      learnerManaged: {
        get() {
          return get(this.value, 'learner_managed', false);
        },
        set(learner_managed) {
          this.handleInput({ learner_managed });
        },
      },
    },
    methods: {
      generateDefaultThreshold() {
        if (this.audioVideoResource) {
          return this.fileDuration || this.value.suggested_duration;
        }
        return defaultCompletionCriteriaThresholds[this.kind];
      },
      trackClick(label) {
        this.$analytics.trackClick('channel_editor_modal_details', label);
      },
      handleMinutesInputFromActivityDuration(minutes, durationDropdown) {
        if (durationDropdown === DurationDropdownMap.SHORT_ACTIVITY) {
          const roundedValue = Math.round(minutes / 300) * 300;
          if (roundedValue > SHORT_LONG_ACTIVITY_MIDPOINT || roundedValue <= 0) {
            return DEFAULT_SHORT_ACTIVITY;
          }
          return roundedValue;
        }
        if (durationDropdown === DurationDropdownMap.LONG_ACTIVITY) {
          const roundedValue = Math.round(minutes / 600) * 600;
          if (roundedValue < SHORT_LONG_ACTIVITY_MIDPOINT || roundedValue > 7200) {
            return DEFAULT_LONG_ACTIVITY;
          }
          return roundedValue;
        }
        return Math.round(minutes / 60) * 60;
      },
      handleInput({ model, threshold, duration, durationType, modality, learner_managed } = {}) {
        const data = {
          completion_criteria: {
            model: this.model,
            threshold: this.threshold,
            learner_managed: this.learnerManaged,
          },
          suggested_duration: this.durationValue,
          suggested_duration_type: this.durationType,
          modality: this.value.modality,
        };

        if (typeof model !== 'undefined') {
          data.completion_criteria.model = model;
        }
        if (typeof modality !== 'undefined') {
          data.modality = modality;
        }
        if (durationType) {
          data.suggested_duration_type = durationType;
        } else if (typeof durationType !== 'undefined') {
          delete data.suggested_duration_type;
        }
        if (duration) {
          data.suggested_duration = this.handleMinutesInputFromActivityDuration(
            duration,
            this.durationType
          );
        } else if (typeof duration !== 'undefined') {
          delete data.suggested_duration;
        }
        if (threshold) {
          data.completion_criteria.threshold = threshold;
        } else if (typeof threshold !== 'undefined') {
          delete data.completion_criteria.threshold;
        }
        if (learner_managed) {
          data.completion_criteria.learner_managed = true;
        } else if (typeof learner_managed !== 'undefined') {
          delete data.completion_criteria.learner_managed;
        }
        this.$emit('input', data);
      },
      isUnique(value) {
        return value !== nonUniqueValue;
      },
      getPlaceholder(field) {
        return this.isUnique(get(this, field)) ? '' : '---';
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
      learnersCanMarkComplete: 'Allow learners to mark as complete',
    },
  };

</script>
