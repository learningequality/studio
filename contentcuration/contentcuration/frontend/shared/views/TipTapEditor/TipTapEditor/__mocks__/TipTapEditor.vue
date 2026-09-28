<template>

  <div>
    <p v-if="value">{{ value }}</p>
    <textarea
      v-if="mode === 'edit'"
      ref="input"
      :value="value"
      :data-autofocus="autofocus"
      @input="$emit('update', $event.target.value)"
    ></textarea>
  </div>

</template>


<script>

  export default {
    name: 'RichTextEditor',
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
    },
    watch: {
      mode() {
        this.$nextTick(this.focusIfAutofocused);
      },
    },
    // Like the real editor, this takes focus as it mounts and when it switches
    // into edit mode — never on a re-render in place.
    mounted() {
      this.focusIfAutofocused();
    },
    methods: {
      focusIfAutofocused() {
        if (this.autofocus && this.mode === 'edit') {
          this.$refs.input.focus();
        }
      },
    },
  };

</script>
