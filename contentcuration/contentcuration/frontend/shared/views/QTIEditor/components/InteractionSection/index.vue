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
      :block="block"
      :mode="mode"
    />
  </div>

</template>


<script>

  import { computed } from 'vue';
  import useInteractionDescriptor from '../../composables/useInteractionDescriptor';

  export default {
    name: 'InteractionSection',

    setup(props) {
      const bodyXmlRef = computed(() => props.block.bodyXml);
      const { descriptor, questionType, parseError } = useInteractionDescriptor(bodyXmlRef);

      return { descriptor, questionType, parseError };
    },

    props: {
      /** The raw XML block representing an interaction and its response declarations */
      block: {
        type: Object,
        required: true,
      },
      /** View or edit mode */
      mode: {
        type: String,
        default: 'view',
      },
    },
  };

</script>
