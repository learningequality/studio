<template>

  <div>
    <p
      v-if="parseError"
      :style="{ color: $themePalette.red.v_700, margin: 0 }"
    >
      {{ parseError }}
    </p>
    <component
      :is="descriptor.editorComponent"
      v-else
      :key="descriptor.type"
      :questionType="questionType"
      :interaction="interaction"
      :mode="mode"
      :showAnswers="showAnswers"
    />
  </div>

</template>


<script>

  import { computed, watch } from 'vue';
  import useInteractionDescriptor from '../../composables/useInteractionDescriptor';

  export default {
    name: 'InteractionSection',

    setup(props, { emit }) {
      const bodyXmlRef = computed(() => props.interaction?.bodyXml);
      const { descriptor, questionType, parseError } = useInteractionDescriptor(bodyXmlRef);

      watch(
        questionType,
        newType => {
          if (newType) emit('update:questionType', newType);
        },
        { immediate: true },
      );

      return { descriptor, questionType, parseError };
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

    emits: ['update:questionType'],
  };

</script>
