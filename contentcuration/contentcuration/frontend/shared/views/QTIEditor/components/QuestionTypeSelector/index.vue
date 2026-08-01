<template>

  <div
    class="question-type-selector"
    :class="{ 'small-screen': windowIsSmall }"
    :style="{ borderBottom: `1px solid ${$themeTokens.fineLine}` }"
  >
    <div
      class="type-selector-group"
      role="group"
      :aria-labelledby="labelId"
    >
      <div
        :id="labelId"
        class="group-label"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        {{ typeLabel$() }}
      </div>

      <div class="type-selector-control-row">
        <KSelect
          :value="selectedOption"
          :options="questionTypeOptions"
          :disabled="questionTypeOptions.length <= 1"
          :label="responseTypeLabel$()"
          class="type-select"
          @change="$emit('update:questionType', $event.value)"
        >
          <template #display>
            <div class="select-display-row">
              <KIcon
                icon="language"
                class="select-globe-icon"
                :style="{ color: $themePalette.grey.v_700 }"
              />
              <span class="select-value-text">{{ selectedOption.label }}</span>
            </div>
          </template>
        </KSelect>

        <KIconButton
          icon="helpOutline"
          :tooltip="responseTypeInfoTitle$()"
          :ariaLabel="responseTypeInfoTitle$()"
          size="mini"
          :color="$themePalette.grey.v_700"
          @click="showTypeInfoModal = true"
        />
      </div>
    </div>

    <div
      :id="settingsTargetId"
      class="answer-settings-group"
    ></div>

    <KModal
      v-if="showTypeInfoModal"
      :title="responseTypeInfoTitle$()"
      :cancelText="closeBtnLabel$()"
      @cancel="showTypeInfoModal = false"
    >
      <div class="type-info-list">
        <div
          v-for="option in questionTypeOptions"
          :key="option.value"
          class="type-info-item"
        >
          <div
            class="type-info-title"
            :style="{ color: $themeTokens.text }"
          >
            {{ option.label }}
          </div>
          <div
            class="type-info-description"
            :style="{ color: $themeTokens.annotation }"
          >
            {{ option.description }}
          </div>
        </div>
      </div>
    </KModal>
  </div>

</template>


<script>

  import { ref, computed } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { qtiEditorStrings } from '../../qtiEditorStrings';
  import { descriptors } from '../../interactions';
  import { generateRandomSlug } from '../../utils/generateRandomSlug';

  export default {
    name: 'QuestionTypeSelector',

    setup(props) {
      const { windowIsSmall } = useKResponsiveWindow();
      const { typeLabel$, responseTypeLabel$, responseTypeInfoTitle$, closeBtnLabel$ } =
        qtiEditorStrings;

      const showTypeInfoModal = ref(false);

      const labelId = generateRandomSlug('type-selector');

      const questionTypeOptions = computed(() => {
        return descriptors.flatMap(d => d.getTypeOptions?.(qtiEditorStrings) ?? []);
      });

      const selectedOption = computed(
        () =>
          questionTypeOptions.value.find(o => o.value === props.questionType) ||
          questionTypeOptions.value[0],
      );

      return {
        windowIsSmall,
        typeLabel$,
        responseTypeLabel$,
        responseTypeInfoTitle$,
        closeBtnLabel$,
        showTypeInfoModal,
        labelId,
        questionTypeOptions,
        selectedOption,
      };
    },

    props: {
      questionType: {
        type: String,
        required: true,
      },

      settingsTargetId: {
        type: String,
        required: true,
      },
    },

    emits: ['update:questionType'],
  };

</script>


<style lang="scss" scoped>

  .question-type-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    align-items: flex-start;
    padding: 10px 20px;

    &.small-screen {
      flex-direction: column;
      gap: 12px;

      .type-selector-group,
      .answer-settings-group {
        flex: none;
        width: 100%;
      }

      .type-select {
        width: 100%;
      }
    }
  }

  .type-selector-group {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 8px;
  }

  .group-label {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
    white-space: nowrap;
  }

  .type-selector-control-row {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .type-select {
    width: 314px;
  }

  .select-display-row {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
  }

  .select-value-text {
    font-size: 14px;
    line-height: 1.4;
    white-space: nowrap;
  }

  .answer-settings-group {
    display: flex;
    flex: 1;
    align-items: flex-start;
  }

  .type-info-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .type-info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .type-info-title {
    font-size: 14px;
    font-weight: 600;
  }

  .type-info-description {
    font-size: 14px;
    line-height: 1.5;
  }

</style>
