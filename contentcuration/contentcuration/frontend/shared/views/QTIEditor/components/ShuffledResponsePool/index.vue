<template>

  <div
    class="pool-box"
    :style="{ borderColor: $themeTokens.fineLine }"
  >
    <h4
      class="section-label"
      :style="{ color: $themePalette.grey.v_700 }"
    >
      {{ label }}
    </h4>
    <ul
      class="chip-list"
      :aria-label="label"
    >
      <!-- Keyed by position: a choice id may repeat across the pool. -->
      <li
        v-for="(choice, index) in shuffled"
        :key="index"
        class="chip"
        :style="chipStyles[index]"
      >
        <TipTapEditor
          :value="choice.content"
          mode="view"
          format="html"
          padding="none"
          :imageProcessor="EditorImageProcessor"
          :tabindex="-1"
          class="editor"
        />
      </li>
    </ul>
  </div>

</template>


<script>

  import { computed, ref, watch } from 'vue';
  import isEqual from 'lodash/isEqual';
  import shuffle from 'lodash/shuffle';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';
  import TipTapEditor from 'shared/views/TipTapEditor/TipTapEditor/TipTapEditor';
  import EditorImageProcessor from 'shared/views/TipTapEditor/TipTapEditor/services/imageService';

  export default {
    name: 'ShuffledResponsePool',

    components: {
      TipTapEditor,
    },

    setup(props) {
      const tokens = themeTokens();
      const palette = themePalette();

      // "Show answers" hands over a new array; only new content may reorder the pool.
      const order = ref([]);
      watch(
        () => props.choices.map(choice => choice.content),
        (contents, previous) => {
          if (!isEqual(contents, previous)) order.value = shuffle(contents.map((_, i) => i));
        },
        { immediate: true },
      );
      const shuffled = computed(() => order.value.map(i => props.choices[i]));

      const chipStyles = computed(() =>
        shuffled.value.map(({ isCorrect }) => ({
          borderColor: isCorrect ? palette.green.v_600 : tokens.fineLine,
          backgroundColor: isCorrect ? palette.green.v_50 : null,
        })),
      );

      return {
        EditorImageProcessor,
        shuffled,
        chipStyles,
      };
    },

    props: {
      /** @type {Array<{ content: String, isCorrect: Boolean }>} */
      choices: {
        type: Array,
        required: true,
      },
      /** Section label and list accessible name */
      label: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .pool-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background-color: v-bind('$themePalette.grey.v_50');
    border: 1px solid;
    border-radius: 4px;
  }

  .section-label {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
  }

  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-start;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  // A chip is a compact pill, so its editor has no padding of its own.
  .chip {
    display: flex;
    align-items: center;
    min-width: 0;
    max-width: 100%;
    padding: 4px 12px;
    background-color: v-bind('$themeTokens.surface');
    border: 1px solid;
    border-radius: 8px;
  }

  .editor {
    width: 100%;
  }

</style>
