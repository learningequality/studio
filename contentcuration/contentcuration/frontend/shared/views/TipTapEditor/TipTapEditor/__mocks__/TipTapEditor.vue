<template>

  <div>
    <p v-if="value">{{ value }}</p>
    <template v-if="mode === 'edit'">
      <textarea
        ref="input"
        :value="value"
        :data-autofocus="autofocus"
        @input="$emit('update', $event.target.value)"
      ></textarea>
      <button
        v-for="action in resolvedInsertActions"
        :key="action.name"
        :aria-disabled="String(action.isAvailable === false)"
        @click="action.isAvailable !== false && action.handler()"
      >
        {{ action.title }}
      </button>
    </template>
  </div>

</template>


<script>

  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import { useEditor } from '../composables/useEditor';
  import { resolveInsertAction } from '../composables/useToolbarActions';

  export default {
    name: 'RichTextEditor',
    setup(props, { emit }) {
      const input = ref(null);
      const { editor, isReady, insertContext, initializeEditor } = useEditor();

      // A real editor, so `ready` carries an instance whose schema holds the
      // consumer's extensions and whose commands run.
      initializeEditor(props.value, props.mode, { extensions: props.extensions });

      watch(isReady, ready => {
        if (ready) emit('ready', editor.value);
      });

      watch(
        () => props.value,
        value => editor.value.commands.setContent(value || '<p></p>'),
      );

      const resolvedInsertActions = computed(() =>
        props.insertActions.map(action => resolveInsertAction(action, insertContext)),
      );

      const focusIfAutofocused = () => {
        if (props.autofocus && props.mode === 'edit') {
          input.value.focus();
        }
      };

      // Like the real editor, this takes focus as it mounts and when it switches
      // into edit mode — never on a re-render in place.
      onMounted(focusIfAutofocused);
      watch(
        () => props.mode,
        mode => {
          editor.value.setEditable(mode === 'edit');
          nextTick(focusIfAutofocused);
        },
      );

      return { input, resolvedInsertActions };
    },
    props: {
      value: {
        type: String,
        default: '',
      },
      mode: {
        type: String,
        default: 'view',
      },
      autofocus: {
        type: Boolean,
        default: false,
      },
      extensions: {
        type: Array,
        default: () => [],
      },
      insertActions: {
        type: Array,
        default: () => [],
      },
    },
    emits: ['update', 'ready'],
  };

</script>
