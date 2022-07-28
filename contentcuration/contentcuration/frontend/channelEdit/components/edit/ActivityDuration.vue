<template>

  <VFlex>
    <VLayout row wrap justify-space-between>
      <VFlex
        v-if="audioVideoUpload && selectedDuration === 'exactTime'"
        class="defaultUpload md2 sm3"
      >
        {{ defaultUploadTime }}
      </VFlex>
      <VFlex
        v-else-if="selectedDuration === 'shortActivity' || selectedDuration === 'longActivity'"
        md3
        sm3
      >
        <VAutocomplete
          v-model.number="minutes"
          :step="increments"
          box
          :label="$tr('minutesRequired')"
          :items="availableNumbers"
        />
      </VFlex>
      <VFlex v-else md3 sm3>
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
    </VLayout>
    <VLayout row wrap>
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

  import debounce from 'lodash/debounce';
  import { CompletionDropdownMap, DurationDropdownMap } from 'shared/constants';
  import {
    getShortActivityDurationValidators,
    getLongActivityDurationValidators,
    getActivityDurationValidators,
    translateValidator,
  } from 'shared/utils/validation';

  const SHORT_MIN = 1;
  const SHORT_MAX = 30;
  const LONG_MIN = 31;
  const LONG_MAX = 120;
  const EXACT_MIN = 1;
  const EXACT_MAX = 1200;
  const SHORT_ACTIVITY_RANGE = [5, 10, 15, 20, 25, 30];
  const LONG_ACTIVITY_RANGE = [40, 50, 60, 70, 80, 90, 100, 110, 120];

  export default {
    name: 'ActivityDuration',
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
    },
    data() {
      return {
        defaultUploadTime: this.duration || `17:12`,
      };
    },
    computed: {
      showRequiredLabel() {
        if (this.audioVideoUpload) {
          return false;
        }
        return (
          this.selectedDuration !== DurationDropdownMap.EXACT_TIME &&
          this.selectedCompletion === CompletionDropdownMap.completeDuration
        );
      },
      showOptionalLabel() {
        return this.selectedDuration !== DurationDropdownMap.EXACT_TIME;
      },
      increments() {
        return this.selectedDuration === DurationDropdownMap.SHORT_ACTIVITY ? 5 : 10;
      },
      availableNumbers() {
        return this.selectedDuration === DurationDropdownMap.SHORT_ACTIVITY
          ? SHORT_ACTIVITY_RANGE
          : LONG_ACTIVITY_RANGE;
      },

      minutes: {
        get() {
          if (!this.value) {
            return '';
          }
          return this.convertToMinutes(this.value);
        },
        set(value) {
          this.handleUpdatedInput(value);
        },
      },
      maxRange() {
        if (this.selectedDuration === DurationDropdownMap.SHORT_ACTIVITY) {
          return SHORT_MAX;
        } else if (this.selectedDuration === 'longActivity') {
          return LONG_MAX;
        } else {
          return EXACT_MAX;
        }
      },
      minRange() {
        if (this.selectedDuration === 'shortActvity') {
          return SHORT_MIN;
        } else if (this.selectedDuration === DurationDropdownMap.LONG_ACTIVITY) {
          return LONG_MIN;
        } else {
          return EXACT_MIN;
        }
      },
      minutesRules() {
        if (this.selectedDuration === DurationDropdownMap.SHORT_ACTIVITY) {
          return getShortActivityDurationValidators().map(translateValidator);
        } else if (this.selectedDuration === DurationDropdownMap.LONG_ACTIVITY) {
          return getLongActivityDurationValidators().map(translateValidator);
        }
        return getActivityDurationValidators().map(translateValidator);
      },
    },
    created() {
      this.handleUpdatedInput = debounce(this.handleInput, 500);
    },
    methods: {
      convertToMinutes(seconds) {
        return Math.floor(seconds / 60);
      },
      convertToSeconds(minutes) {
        return minutes * 60;
      },
      handleInput(value) {
        this.$emit('input', this.convertToSeconds(value));
      },
    },
    $trs: {
      minutesRequired: 'Minutes',
      optionalLabel:
        '(Optional) Duration until resource is marked as complete. This value will not be shown to learners.',
      notOptionalLabel:
        'Duration until resource is marked as complete. This value will not be shown to learners.',
    },
  };

</script>
<style lang="scss" scoped>

  .defaultUpload {
    margin: 0.8em;
    font-size: 1.2em;
  }

</style>
