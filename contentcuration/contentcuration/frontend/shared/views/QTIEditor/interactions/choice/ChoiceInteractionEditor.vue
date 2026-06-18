<template>

  <div class="choice-interaction-editor">
    <!-- Prompt -->
    <p
      v-if="prompt"
      class="choice-prompt"
      :style="{ color: $themePalette.grey.v_900 }"
    >
      {{ prompt }}
    </p>

    <!-- Choices (shown in edit mode, or when showAnswers is true in view mode) -->
    <template v-if="mode === 'edit' || showAnswers">
      <!-- Single-select choices — KRadioButton -->
      <template v-if="questionType === QuestionType.SINGLE_SELECT">
        <KRadioButton
          v-for="choice in choices"
          :key="choice.identifier"
          v-model="selectedValue"
          :buttonValue="choice.identifier"
          :label="choice.text"
        />
      </template>

      <!-- Multi-select choices — KCheckbox -->
      <template v-else>
        <KCheckbox
          v-for="choice in choices"
          :key="choice.identifier"
          :checked="selectedValues.includes(choice.identifier)"
          :label="choice.text"
          @change="checked => toggleValue(choice.identifier, checked)"
        />
      </template>
    </template>
  </div>

</template>


<script>

  import { computed, ref } from 'vue';
  import { QuestionType } from '../../constants';
  import { parseXML } from '../../serialization/parseItem';

  export default {
    name: 'ChoiceInteractionEditor',

    setup(props) {
      /** Dummy model value so KRadioButton renders without warnings. */
      const selectedValue = ref(null);
      /** Tracked identifiers for multi-select mode. */
      const selectedValues = ref([]);

      function toggleValue(identifier, checked) {
        if (checked) {
          selectedValues.value = [...selectedValues.value, identifier];
        } else {
          selectedValues.value = selectedValues.value.filter(v => v !== identifier);
        }
      }

      const parsed = computed(() => {
        if (!props.interaction || !props.interaction.bodyXml) {
          return { prompt: '', choices: [] };
        }
        try {
          const doc = parseXML(props.interaction.bodyXml);
          const root = doc.documentElement;

          const promptEl = root.querySelector('qti-prompt');
          const prompt = promptEl ? promptEl.textContent.trim() : '';

          const choiceEls = [...root.querySelectorAll('qti-simple-choice')];
          const choices = choiceEls.map(el => ({
            identifier: el.getAttribute('identifier') ?? el.textContent.trim(),
            text: el.textContent.trim(),
          }));

          return { prompt, choices };
        } catch {
          return { prompt: '', choices: [] };
        }
      });

      const prompt = computed(() => parsed.value.prompt);
      const choices = computed(() => parsed.value.choices);

      return { prompt, choices, selectedValue, selectedValues, toggleValue, QuestionType };
    },

    props: {
      /**
       * The raw interaction block — shape: { bodyXml: string, responseDeclarations: string[] }.
       * Parsed here to extract the prompt and simple-choice elements.
       */
      interaction: {
        type: Object,
        default: null,
      },
      /** One of QuestionType derived from max-choices by the registry. */
      questionType: {
        type: String,
        default: null,
      },
      /** View or edit mode */
      mode: {
        type: String,
        default: 'view',
      },
      /** Whether to display correct answers (used in view mode previews) */
      showAnswers: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .choice-interaction-editor {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 0 8px;
  }

  .choice-prompt {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.5;
  }

</style>
