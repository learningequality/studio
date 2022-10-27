<template>

  <VFlex>
    <VLayout row wrap justify-space-between>
      <VFlex
        v-if="audioVideoUpload && selectedDuration === 'exactTime'"
        class="defaultUpload md2 sm3"
      >
        {{ convertToHHMMSS(duration || `00:00`) }}
      </VFlex>
      <VFlex
        v-else-if="selectedDuration === 'shortActivity' || selectedDuration === 'longActivity'"
        md3
        sm3
      >
        <DropdownWrapper>
          <template #default="{ attach, menuProps }">
            <VAutocomplete
              v-model.number="minutes"
              :step="increments"
              box
              :label="$tr('minutesRequired')"
              :items="availableNumbers"
              :menu-props="menuProps"
              :attach="attach"
              :rules="minutesRules"
            />
          </template>
        </DropdownWrapper>
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
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

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
    components: { DropdownWrapper },
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
    computed: {
      showRequiredLabel() {
        if (this.audioVideoUpload) {
          return false;
        }
        return this.selectedCompletion === CompletionDropdownMap.completeDuration;
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
        } else if (
          this.selectedDuration === DurationDropdownMap.EXACT_TIME &&
          this.selectedCompletion === CompletionDropdownMap.completeDuration
        ) {
          return getActivityDurationValidators().map(translateValidator);
        } else {
          return [];
        }
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
      optionalLabel:
        '(Optional) Time required for the resource to be marked as completed. This value will not be displayed to learners.',
      notOptionalLabel:
        'Time required for the resource to be marked as completed. This value will not be displayed to learners.',
    },
  };

</script>
<style lang="less" scoped>

  .defaultUpload {
    margin: 0.8em;
    font-size: 1.2em;
  }

</style>
