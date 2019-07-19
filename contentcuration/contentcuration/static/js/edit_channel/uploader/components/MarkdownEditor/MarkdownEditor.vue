<template>
  <div>
    <div ref="editor"></div>
  </div>
</template>

<script>

  import $ from 'jquery';

  import { ImageUploadBtn, FormulaBtn, UndoBtn, RedoBtn } from './buttons';

  export default {
    name: 'MarkdownEditor',
    model: {
      prop: 'markdown',
      event: 'update',
    },
    props: {
      markdown: {
        type: String,
      },
    },
    activated() {
      $(this.$refs.editor).summernote('code', this.markdown);
      $(this.$refs.editor).summernote('restoreRange');
    },
    mounted() {
      const config = {
        callbacks: {
          onInit: this.onInit,
          onChange: this.onChange,
          onImageUpload: this.onImageUpload,
          onFormula: this.onFormula,
          onUndo: this.onUndo,
          onRedo: this.onRedo,
        },
        toolbar: [
          ['style', ['bold', 'italic']],
          ['insert', ['customimageupload', 'customformula']],
          ['controls', ['customundo', 'customredo']],
        ],
        buttons: {
          customimageupload: ImageUploadBtn,
          customformula: FormulaBtn,
          customundo: UndoBtn,
          customredo: RedoBtn,
        },
        disableResizeEditor: true,
        shortcuts: false,
        disableDragAndDrop: true,
      };

      // TODO: remove jQuery as soon as Summernote removes it from dependencies
      // https://github.com/summernote/summernote/issues/2654
      // https://github.com/summernote/summernote/milestone/35
      $(this.$refs.editor).summernote(config);
    },
    beforeDestroy() {
      $(this.$refs.editor).summernote('destroy');
    },
    methods: {
      onInit() {
        $(this.$refs.editor).summernote('saveRange');
        $(this.$refs.editor).summernote('code', this.markdown);
      },
      onChange(contents) {
        $(this.$refs.editor).summernote('saveRange');
        this.$emit('update', contents);
      },
      onImageUpload() {
        alert('image upload TBD');
      },
      onFormula() {
        alert('formula TBD');
      },
      onUndo() {
        alert('undo TBD');
      },
      onRedo() {
        alert('redo TBD');
      },
    },
  };

</script>

<style lang="less" scoped>

  // decrease from default 500 which is unnecessarily high
  // let's use 2 because of VToolbar that should
  // be on top and uses 3
  /deep/ .note-toolbar {
    z-index: 2;
  }

</style>
