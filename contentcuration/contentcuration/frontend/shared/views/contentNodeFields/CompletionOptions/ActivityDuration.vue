<template>

  <VFlex>
    <VLayout
      row
      wrap
    >
      <VFlex
        v-if="audioVideoUpload && isExactTime"
        class="defaultUpload md2 sm3"
      >
        {{ convertToHHMMSS(duration || `00:00`) }}
      </VFlex>
      <VFlex
        v-else-if="isShortActivity || isLongActivity"
        md3
        sm3
      >
        <KMultiSelect
          v-model="minutes"
          :multiple="false"
          :label="$tr('minutesRequired')"
          :options="availableNumbers"
          :invalid="validated && Boolean(minutesInvalidText)"
          :invalidText="minutesInvalidText"
          :noResultsText="$tr('noResultsText')"
          :messages="messages"
          :appearanceOverrides="{ width: '100%' }"
          @input="validate"
        />
      </VFlex>
      <VFlex
        v-else
        md3
        sm3
      >
        <VTextField
          v-model="minutes"
          type="number"
          box
          :min="minRange"
          :max="maxRange"
          :label="$tr('minutesRequired')"
          :rules="minutesRules"
        />
      </VFlex>
      <div
        v-if="showSlider"
        class="slider-wrapper"
      >
        <input
          v-if="isShortActivity || isLongActivity"
          v-model="minutes"
          :class="$computedClass(sliderStyle)"
          type="range"
          :min="minRange"
          :max="maxRange"
          :step="increments"
        >
      </div>
    </VLayout>
    <VLayout
      row
      wrap
    >
      <VFlex v-if="showRequiredLabel">
        {{ $tr('notOptionalLabel') }}
      </VFlex>
      <VFlex v-else-if="showOptionalLabel">
        {{ $tr('optionalLabel') }}
      </VFlex>
    </VLayout>
  </VFlex>

</template>


<script>

  import { ref, watch } from 'vue';
  import KMultiSelect from 'kolibri-design-system/lib/candidate/multiselect/KMultiSelect';
  import { CompletionDropdownMap, DurationDropdownMap } from 'shared/constants';
  import {
    translateValidator,
    getInvalidText,
    getActivityDurationValidators,
    getLongActivityDurationValidators,
    getShortActivityDurationValidators,
  } from 'shared/utils/validation';
  import { commonStrings } from 'shared/strings/commonStrings';
  import { createMultiSelectMessages } from 'shared/utils/multiSelectMessages';

  const EXACT_MIN = 1;
  const EXACT_MAX = 1200;
  const SHORT_ACTIVITY_RANGE = [5, 10, 15, 20, 25, 30];
  const LONG_ACTIVITY_RANGE = [40, 50, 60, 70, 80, 90, 100, 110, 120];

  export default {
    name: 'ActivityDuration',
    components: { KMultiSelect },
    setup(props) {
      const validated = ref(false);
      watch(
        () => props.selectedDuration,
        () => {
          validated.value = false;
        },
      );
      return { validated };
    },
    props: {
      selectedDuration: {
        type: String,
        default: '',
      },
      selectedCompletion: {
        type: String,
        default: '',
      },
      value: {
        type: Number,
        default: 0,
      },
      audioVideoUpload: {
        type: Boolean,
        default: false,
      },
      duration: {
        type: Number,
        default: null,
      },
      showSlider: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      isShortActivity() {
        return this.selectedDuration === DurationDropdownMap.SHORT_ACTIVITY;
      },
      isLongActivity() {
        return this.selectedDuration === DurationDropdownMap.LONG_ACTIVITY;
      },
      isExactTime() {
        return this.selectedDuration === DurationDropdownMap.EXACT_TIME;
      },
      showRequiredLabel() {
        if (this.audioVideoUpload) {
          return false;
        }
        return this.selectedCompletion === CompletionDropdownMap.completeDuration;
      },
      showOptionalLabel() {
        return !this.isExactTime;
      },
      increments() {
        return this.isShortActivity ? 5 : 10;
      },
      availableNumbers() {
        return this.isShortActivity ? SHORT_ACTIVITY_RANGE : LONG_ACTIVITY_RANGE;
      },
      minutes: {
        get() {
          if (!this.value) {
            return '';
          }
          return this.convertToMinutes(this.value);
        },
        set(value) {
          this.handleInput(value);
        },
      },
      maxRange() {
        if (this.isShortActivity) {
          return SHORT_ACTIVITY_RANGE[SHORT_ACTIVITY_RANGE.length - 1];
        } else if (this.isLongActivity) {
          return LONG_ACTIVITY_RANGE[LONG_ACTIVITY_RANGE.length - 1];
        } else {
          return EXACT_MAX;
        }
      },
      minRange() {
        if (this.isShortActivity) {
          return SHORT_ACTIVITY_RANGE[0];
        } else if (this.isLongActivity) {
          return LONG_ACTIVITY_RANGE[0];
        } else {
          return EXACT_MIN;
        }
      },
      minutesValidators() {
        if (this.isShortActivity) {
          return getShortActivityDurationValidators();
        } else if (this.isLongActivity) {
          return getLongActivityDurationValidators();
        } else if (
          this.isExactTime &&
          this.selectedCompletion === CompletionDropdownMap.completeDuration
        ) {
          return getActivityDurationValidators();
        }
        return [];
      },
      minutesRules() {
        return this.minutesValidators.map(translateValidator);
      },
      minutesInvalidText() {
        return getInvalidText(this.minutesValidators, this.minutes);
      },
      messages() {
        const { clearAction$, optionRemovedLabel$ } = commonStrings;
        return createMultiSelectMessages({
          clearText: clearAction$,
          cleared: optionRemovedLabel$,
        });
      },
      sliderStyle() {
        const percent = ((this.minutes - this.minRange) / (this.maxRange - this.minRange)) * 100;
        return {
          background: `linear-gradient(to right, ${this.$themeTokens.primary} 0%, ${this.$themeTokens.primary} ${percent}%, ${this.$themeTokens.fineLine} ${percent}%, ${this.$themeTokens.fineLine} 100%)`,
          '::-webkit-slider-thumb': {
            background: this.$themeTokens.primary,
          },
        };
      },
    },
    methods: {
      /**
       * @public
       */
      validate() {
        if (this.isShortActivity || this.isLongActivity) {
          this.validated = true;
          return this.minutesInvalidText;
        }
      },
      convertToMinutes(seconds) {
        return Math.floor(seconds / 60);
      },
      convertToSeconds(minutes) {
        return minutes * 60;
      },
      handleInput(value) {
        this.$emit('input', this.convertToSeconds(value));
      },
      convertToHHMMSS(totalSeconds) {
        if (totalSeconds !== null && Number.isInteger(totalSeconds)) {
          const hours = Math.floor(totalSeconds / 3600)
            .toString()
            .padStart(2, 0);
          const minutes = Math.floor((totalSeconds % 3600) / 60)
            .toString()
            .padStart(2, 0);
          const seconds = ((totalSeconds % 3600) % 60).toString().padStart(2, 0);
          return `${hours}:${minutes}:${seconds}`;
        } else {
          return totalSeconds;
        }
      },
    },
    $trs: {
      minutesRequired: 'Minutes',
      noResultsText: {
        message: 'No matching minutes',
        context:
          'Message shown when a search in the activity duration dropdown has no matching options',
      },
      optionalLabel:
        '(Optional) Time required for the resource to be marked as completed. This value will not be displayed to learners.',
      notOptionalLabel:
        'Time required for the resource to be marked as completed. This value will not be displayed to learners.',
    },
  };

</script>


<style lang="scss" scoped>

  .defaultUpload {
    margin: 0.8em;
    font-size: 1.2em;
  }

  .slider-wrapper {
    flex: 1;
    width: 100%;
    margin: 20px 16px 0;
  }

  input[type='range'] {
    width: 100%;
    max-width: 300px;
    height: 2px;
    appearance: none;
    outline: none;
  }

  input[type='range']::-webkit-slider-thumb {
    width: 12px;
    height: 12px;
    appearance: none;
    cursor: pointer;
    border-radius: 50%;
  }

</style>
