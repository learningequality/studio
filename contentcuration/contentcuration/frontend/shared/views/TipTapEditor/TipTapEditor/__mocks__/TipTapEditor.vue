<template>

  <div>
    <p v-if="value">{{ value }}</p>
    <template v-if="mode === 'edit'">
      <textarea
        ref="input"
        :value="value"
        :data-autofocus="autofocus"
        @input="$emit('update', $event.target.value)"
        @focus="onFocus"
      ></textarea>
      <button
        v-for="action in resolvedInsertActions"
        :key="action.name"
        :aria-disabled="String(!action.isAvailable)"
        @click="action.handler()"
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
  import { toInlineHTML } from '../utils/inlineContent';

  export default {
    name: 'RichTextEditor',
    setup(props, { emit, listeners }) {
      const input = ref(null);
      const { editor, isReady, insertContext, initializeEditor } = useEditor();
      const content = value => (props.inlineOnly ? toInlineHTML(value) : value);

      // A real editor, so `ready` carries an instance whose schema holds the
      // consumer's extensions and whose commands run. Built only for a test that
      // uses a seam: building one per render slows every consumer suite.
      watch(
        () => Boolean(props.extensions.length || props.insertActions.length || listeners.ready),
        needed => {
          if (needed && !editor.value) {
            initializeEditor(content(props.value), props.mode, {
              extensions: props.extensions,
              inlineOnly: props.inlineOnly,
            });
          }
        },
        { immediate: true },
      );

      watch(isReady, ready => {
        if (ready) emit('ready', editor.value);
      });

      watch(
        () => props.value,
        value => editor.value?.commands.setContent(content(value) || '<p></p>'),
      );

      // The textarea stands in for the editor's view, so focusing it places the
      // cursor that `selection.hasCursor` reports.
      const onFocus = event => editor.value?.emit('focus', { editor: editor.value, event });

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
          editor.value?.setEditable(mode === 'edit');
          nextTick(focusIfAutofocused);
        },
      );

      return { input, resolvedInsertActions, onFocus };
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
      inlineOnly: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['update', 'ready'],
  };

</script>
