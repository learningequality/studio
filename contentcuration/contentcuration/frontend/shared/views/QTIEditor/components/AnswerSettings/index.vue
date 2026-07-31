<template>

  <div class="answer-settings">
    <div
      class="answer-settings-label"
      :style="{ color: $themePalette.grey.v_700 }"
    >
      {{ answerSettingsLabel$() }}
    </div>

    <div
      v-if="settings.includes('shuffle')"
      class="setting-row"
    >
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
      v-if="settings.includes('showAnswerCount')"
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
      @cancel="showShuffleModal = false"
    >
      <p :style="{ color: $themeTokens.annotation }">
        {{ shuffleAnswersInfoBody$() }}
      </p>
      <template #actions>
        <KButton
          :text="closeBtnLabel$()"
          @click="showShuffleModal = false"
        />
      </template>
    </KModal>

    <KModal
      v-if="showAnswerCountModal"
      :title="showAnswerCountInfoTitle$()"
      @cancel="showAnswerCountModal = false"
    >
      <p :style="{ color: $themeTokens.annotation }">
        {{ showAnswerCountInfoBody$() }}
      </p>
      <template #actions>
        <KButton
          :text="closeBtnLabel$()"
          @click="showAnswerCountModal = false"
        />
      </template>
    </KModal>
  </div>

</template>


<script>

  import { ref } from 'vue';
  import { qtiEditorStrings } from '../../qtiEditorStrings';

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
      };
    },

    props: {
      settings: {
        type: Array,
        required: true,
        validator: arr => arr.every(setting => ['shuffle', 'showAnswerCount'].includes(setting)),
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
