<template>

  <div>
    <p
      v-if="parseError"
      :style="{ color: $themePalette.red.v_700, margin: 0 }"
    >
      {{ parseError }}
    </p>
    <div v-else-if="descriptor">
      <QuestionTypeSelector
        v-if="mode === 'edit'"
        ref="typeSelector"
        :questionType="shownQuestionType"
        :settingsTargetId="settingsTargetId"
        :allowFreeResponse="allowFreeResponse"
        @update:questionType="onUpdateQuestionType"
      />

      <!--
        Keyed on the question type, not the interaction: every type change converts the
        question, and the editor has to start again from what the conversion wrote.
      -->
      <component
        :is="editorComponent"
        ref="editor"
        :key="questionType"
        :questionType="questionType"
        :interaction="interaction"
        :mode="mode"
        :showAnswers="showAnswers"
        :teleportTargetId="settingsTargetId"
        :language="language"
        @update:interaction="onUpdateInteraction"
        @update:errors="errors => $emit('update:errors', errors)"
      />

      <ChangeQuestionTypeModal
        v-if="pendingType"
        :questionTypeLabel="pendingTypeLabel"
        :losses="pendingLosses"
        @submit="confirmTypeChange"
        @cancel="cancelTypeChange"
      />
    </div>
  </div>

</template>


<script>

  import { computed, nextTick, ref, watch } from 'vue';
  import useInteractionDescriptor from '../../composables/useInteractionDescriptor';
  import QuestionTypeSelector from '../QuestionTypeSelector/index.vue';
  import ChangeQuestionTypeModal from '../ChangeQuestionTypeModal/index.vue';
  import { generateRandomSlug } from '../../utils/generateRandomSlug';
  import { descriptors, editors } from '../../interactions';
  import { convertInteraction } from '../../conversion';
  import { qtiEditorStrings } from '../../qtiEditorStrings';

  export default {
    name: 'InteractionSection',

    components: {
      QuestionTypeSelector,
      ChangeQuestionTypeModal,
    },

    setup(props, { emit }) {
      const interactionRef = computed(() => props.interaction);
      const { descriptor, questionType, parseError } = useInteractionDescriptor(interactionRef);

      watch(
        questionType,
        newType => {
          if (newType) emit('update:questionType', newType);
        },
        { immediate: true },
      );

      /**
       * The type the author picked, while they confirm a change that would remove or change
       * part of the question. The selector shows it meanwhile, so that when the author
       * cancels, the selector goes back to the question's type and lets them pick this one
       * again.
       */
      const pendingType = ref(null);
      const pendingLosses = ref([]);
      const shownQuestionType = computed(() => pendingType.value ?? questionType.value);

      const pendingTypeLabel = computed(
        () =>
          descriptors
            .flatMap(d => d.getTypeOptions(qtiEditorStrings))
            .find(option => option.value === pendingType.value)?.label ?? '',
      );

      // Converts what the question holds now, so it runs again once the author confirms.
      const convertTo = toType =>
        convertInteraction({
          interaction: props.interaction,
          fromType: questionType.value,
          toType,
          language: props.language,
        });

      function changeType(newType) {
        emit('update:interaction', convertTo(newType).interaction);
        questionType.value = newType;
        emit('update:questionType', newType);
      }

      const typeSelector = ref(null);

      const onUpdateQuestionType = newType => {
        // The selector also reports the type it shows when that changes back, as on cancel.
        if (newType === shownQuestionType.value) return;
        const { losses } = convertTo(newType);
        if (!losses.length) {
          changeType(newType);
          return;
        }
        // The modal returns focus to what had it when it opened, so that must be the select
        // the author picked the type with, not the option they picked, gone with the dropdown.
        typeSelector.value?.focus();
        pendingLosses.value = losses;
        pendingType.value = newType;
      };

      function confirmTypeChange() {
        const newType = pendingType.value;
        pendingType.value = null;
        changeType(newType);
      }

      function cancelTypeChange() {
        pendingType.value = null;
      }

      const onUpdateInteraction = updatedInteraction => {
        emit('update:interaction', updatedInteraction);
      };

      const settingsTargetId = generateRandomSlug('answer-settings');

      const editorComponent = computed(() => editors[descriptor.value.type]);

      const editor = ref(null);

      /**
       * Opens the question for editing, which focuses it. After this section's next render, so
       * the editor has heard of a mode change the card made just before asking.
       */
      async function focus() {
        await nextTick();
        editor.value?.focus();
      }

      return {
        editor,
        // Public: lets the card focus the question when it opens.
        // eslint-disable-next-line vue/no-unused-properties
        focus,
        descriptor,
        editorComponent,
        questionType,
        shownQuestionType,
        pendingType,
        pendingTypeLabel,
        pendingLosses,
        parseError,
        onUpdateQuestionType,
        confirmTypeChange,
        cancelTypeChange,
        typeSelector,
        onUpdateInteraction,
        settingsTargetId,
      };
    },

    props: {
      /**
       * The raw interaction block.
       * Expected shape: { bodyXml: string, responseDeclarations: string[] }
       */
      interaction: {
        type: Object,
        required: true,
        validator: val => typeof val.bodyXml === 'string',
      },
      /** View or edit mode */
      mode: {
        type: String,
        default: 'view',
        validator: val => ['view', 'edit'].includes(val),
      },
      /** Whether to display correct answers (used in view mode previews) */
      showAnswers: {
        type: Boolean,
        default: false,
      },
      /**
       * Whether a question with no correct answer is acceptable here. Passed straight to the
       * type selector, which is the only part of an interaction this concerns.
       */
      allowFreeResponse: {
        type: Boolean,
        default: true,
      },
      /**
       * The exercise's language, which numeric answers are read and shown in. Empty means
       * they are read and shown as stored.
       */
      language: {
        type: String,
        default: '',
      },
    },

    emits: ['update:questionType', 'update:interaction', 'update:errors'],
  };

</script>
