<template>

  <div
    role="group"
    :aria-labelledby="labelId"
    class="answer-settings"
  >
    <div
      :id="labelId"
      class="answer-settings-label"
      :style="{ color: $themePalette.grey.v_700 }"
    >
      {{ answerSettingsLabel$() }}
    </div>

    <div class="setting-row">
      <KCheckbox
        :checked="shuffle"
        :label="shuffleAnswersLabel$()"
        :color="$themeTokens.primary"
        @change="$emit('update:shuffle', $event)"
      />
      <KIconButton
        icon="infoOutline"
        :tooltip="shuffleAnswersInfoTitle$()"
        :ariaLabel="shuffleAnswersInfoTitle$()"
        size="mini"
        :color="$themePalette.grey.v_700"
        @click="showShuffleModal = true"
      />
    </div>

    <div
      v-if="questionType === QuestionType.MULTI_SELECT"
      class="setting-row"
    >
      <KCheckbox
        :checked="showAnswerCount"
        :label="showAnswerCountLabel$()"
        :color="$themeTokens.primary"
        @change="$emit('update:showAnswerCount', $event)"
      />
      <KIconButton
        icon="infoOutline"
        :tooltip="showAnswerCountInfoTitle$()"
        :ariaLabel="showAnswerCountInfoTitle$()"
        size="mini"
        :color="$themePalette.grey.v_700"
        @click="showAnswerCountModal = true"
      />
    </div>

    <KModal
      v-if="showShuffleModal"
      :title="shuffleAnswersInfoTitle$()"
      :cancelText="closeBtnLabel$()"
      @cancel="showShuffleModal = false"
    >
      <p>
        {{ shuffleAnswersInfoBody$() }}
      </p>
    </KModal>

    <KModal
      v-if="showAnswerCountModal"
      :title="showAnswerCountInfoTitle$()"
      :cancelText="closeBtnLabel$()"
      @cancel="showAnswerCountModal = false"
    >
      <p>
        {{ showAnswerCountInfoBody$() }}
      </p>
    </KModal>
  </div>

</template>


<script>

  import { ref } from 'vue';
  import { qtiEditorStrings } from '../../../../qtiEditorStrings';
  import { QuestionType } from '../../../../constants';
  import { generateRandomSlug } from '../../../../utils/generateRandomSlug';

  export default {
    name: 'AnswerSettings',

    setup() {
      const {
        answerSettingsLabel$,
        shuffleAnswersLabel$,
        shuffleAnswersInfoTitle$,
        shuffleAnswersInfoBody$,
        showAnswerCountLabel$,
        showAnswerCountInfoTitle$,
        showAnswerCountInfoBody$,
        closeBtnLabel$,
      } = qtiEditorStrings;

      const showShuffleModal = ref(false);
      const showAnswerCountModal = ref(false);

      const labelId = generateRandomSlug('answer-settings');

      return {
        answerSettingsLabel$,
        shuffleAnswersLabel$,
        shuffleAnswersInfoTitle$,
        shuffleAnswersInfoBody$,
        showAnswerCountLabel$,
        showAnswerCountInfoTitle$,
        showAnswerCountInfoBody$,
        closeBtnLabel$,
        showShuffleModal,
        showAnswerCountModal,
        labelId,
        QuestionType,
      };
    },

    props: {
      questionType: {
        type: String,
        required: true,
      },
      shuffle: {
        type: Boolean,
        default: false,
      },
      showAnswerCount: {
        type: Boolean,
        default: true,
      },
    },

    emits: ['update:shuffle', 'update:showAnswerCount'],
  };

</script>


<style lang="scss" scoped>

  .answer-settings {
    display: flex;
    flex-direction: column;
  }

  .answer-settings-label {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
    white-space: nowrap;
  }

  .setting-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

</style>
