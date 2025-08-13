<template>

  <div
    style="border: 4px solid transparent"
    class="uploader"
    :style="{
      backgroundColor: highlightDropzone ? $vuetify.theme.primaryBackground : 'transparent',
      borderColor: highlightDropzone ? $vuetify.theme.primary : borderColor,
      width: fill ? '100%' : 'unset',
      height: fill ? '100%' : 'unset',
    }"
    data-test="dropzone"
    @dragenter.prevent="enter"
    @dragover.prevent="over"
    @dragleave.prevent="leave"
    @drop.prevent="drop"
    @click="$emit('click')"
  >
    <slot></slot>
  </div>

</template>


<script>

  export default {
    name: 'FileDropzone',
    props: {
      disabled: {
        type: Boolean,
        default: false,
      },
      borderColor: {
        type: String,
        default: 'transparent',
      },
      fill: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        highlight: false,
      };
    },
    computed: {
      highlightDropzone() {
        return this.highlight && !this.disabled;
      },
    },
    methods: {
      enter() {
        this.highlight = true;
      },
      over() {
        this.highlight = true;
      },
      leave() {
        this.highlight = false;
      },
      drop(e) {
        this.highlight = false;
        if (!this.disabled) {
          this.$emit('dropped', e.dataTransfer.files);
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
