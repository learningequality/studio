<template>

  <div>
    <p
      v-if="parseError"
      :style="{ color: $themePalette.red.v_700, margin: 0 }"
    >
      {{ parseError }}
    </p>
    <div v-else>
      <QuestionTypeSelector
        v-if="mode === 'edit'"
        :questionType="questionType"
        :settingsTargetId="settingsTargetId"
        @update:questionType="onUpdateQuestionType"
      />

      <component
        :is="descriptor.editorComponent"
        :key="descriptor.type"
        :questionType="questionType"
        :interaction="interaction"
        :mode="mode"
        :showAnswers="showAnswers"
        :teleportTargetId="settingsTargetId"
        @update:interaction="onUpdateInteraction"
      />
    </div>
  </div>

</template>


<script>

  import { computed, watch } from 'vue';
  import useInteractionDescriptor from '../../composables/useInteractionDescriptor';
  import QuestionTypeSelector from '../QuestionTypeSelector/index.vue';
  import { generateRandomSlug } from '../../utils/generateRandomSlug';
  import { descriptors } from '../../interactions';

  export default {
    name: 'InteractionSection',

    components: {
      QuestionTypeSelector,
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

      const onUpdateQuestionType = newType => {
        const newDescriptor = descriptors.find(d => d.questionTypes.includes(newType));
        if (newDescriptor && newDescriptor !== descriptor.value) {
          const oldState = descriptor.value.parse(
            props.interaction.bodyXml,
            props.interaction.responseDeclarations,
          );
          const freshState = newDescriptor.parse('', []);
          const withPrompt = { ...freshState, prompt: oldState.prompt ?? '' };
          const newInteraction = newDescriptor.buildXML(withPrompt, newType);
          emit('update:interaction', newInteraction);
        }

        questionType.value = newType;
        emit('update:questionType', newType);
      };

      const onUpdateInteraction = updatedInteraction => {
        emit('update:interaction', updatedInteraction);
      };

      const settingsTargetId = generateRandomSlug('answer-settings');

      return {
        descriptor,
        questionType,
        parseError,
        onUpdateQuestionType,
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
    },

    emits: ['update:questionType', 'update:interaction'],
  };

</script>
