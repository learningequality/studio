<template>

  <div :style="{ 'position': 'relative' }">
    <div
      ref="editor"
      class="editor"
    ></div>

    <FormulasMenu
      v-if="formulasMenu.isOpen"
      v-click-outside="resetFormulasMenu"
      :initialFormula="formulasMenu.mathFieldFormula"
      :mathQuill="mathQuill"
      :style="formulasMenu.style"
      @insert="insertFormula"
    />

  </div>

</template>

<script>

  import 'tui-editor/dist/tui-editor.css';
  import 'tui-editor/dist/tui-editor-contents.css';
  import 'codemirror/lib/codemirror.css';
  import Editor from 'tui-editor';

  import 'utils/mathquill.js';
  import '../../../../../../css/mathquill.css';

  import ClickOutside from '../../../directives/click-outside';
  import FormulasMenu from '../../FormulasMenu/FormulasMenu';

  import { CLASS_MATH_FIELD } from '../constants';
  import undoRedo from '../extensions/undo-redo';
  import imageUpload from '../extensions/image-upload';
  import formulas from '../extensions/formulas';
  import formulasHtmlToMd from '../extensions/formulas/formula-html-to-md';

  export default {
    name: 'MarkdownEditor',
    components: {
      FormulasMenu,
    },
    directives: {
      'click-outside': ClickOutside,
    },
    model: {
      prop: 'markdown',
      event: 'update',
    },
    props: {
      markdown: {
        type: String,
      },
    },
    data() {
      return {
        editor: null,
        formulasMenu: {
          isOpen: false,
          mathFieldEl: null, // a math field being edited in formulas menu
          mathFieldFormula: '', // latex formula of a math field being edited in formulas menu
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
          },
        },
        mathQuill: null,
        clickEventListener: null,
      };
    },
    watch: {
      markdown(newMd, previousMd) {
        if (newMd !== previousMd && newMd !== this.editor.getMarkdown()) {
          this.editor.setMarkdown(newMd);
          this.initStaticMathFields();
        }
      },
    },
    mounted() {
      this.mathQuill = MathQuill.getInterface(2);

      // This is currently the only way of inheriting and adjusting
      // default TUI's convertor methods
      // see https://github.com/nhn/tui.editor/issues/615
      const tmpEditor = new Editor({
        el: this.$refs.editor,
      });
      const Convertor = tmpEditor.convertor.constructor;
      class CustomConvertor extends Convertor {
        toMarkdown(html, toMarkOptions) {
          const markdown = super.toMarkdown(html, toMarkOptions);
          return formulasHtmlToMd(markdown);
        }
      }
      tmpEditor.remove();

      const options = {
        el: this.$refs.editor,
        height: '170px',
        initialValue: this.markdown,
        initialEditType: 'wysiwyg',
        usageStatistics: false,
        toolbarItems: ['bold', 'italic'],
        hideModeSwitch: true,
        exts: [undoRedo, imageUpload, formulas],
        extOptions: {
          formulas: {
            onFormulasToolbarBtnClick: this.onFormulasToolbarBtnClick,
          },
        },
        customConvertor: CustomConvertor,
      };

      this.editor = new Editor(options);
      this.editor.on('change', () => {
        // TUI editor emits 'change' event not only on content updates
        // but also on cursor clicks - there is no need to emit update
        // for such cases
        if (this.markdown === this.editor.getMarkdown()) {
          return;
        }

        // eslint-disable-next-line
        console.log(this.editor.getMarkdown());
        this.$emit('update', this.editor.getMarkdown());
      });

      this.initStaticMathFields();

      this.clickEventListener = this.$el.addEventListener('click', this.onClick);
    },
    beforeDestroy() {
      this.$el.removeEventListener(this.clickEventListener, this.onClick);
    },
    methods: {
      onFormulasToolbarBtnClick({ editorCursorPosition }) {
        this.formulasMenu.style.top = `${editorCursorPosition.top -
          this.getEditorPosition().top}px`;
        this.formulasMenu.style.left = `${editorCursorPosition.left -
          this.getEditorPosition().left}px`;

        this.formulasMenu.mathFieldEl = null;
        this.formulasMenu.mathFieldFormula = null;

        this.formulasMenu.isOpen = true;
      },
      insertFormula(formula) {
        const CLASS_MATH_FIELD_NEW = `${CLASS_MATH_FIELD}-new`;

        const formulaEl = document.createElement('span');
        formulaEl.innerHTML = formula;
        formulaEl.classList.add(CLASS_MATH_FIELD, CLASS_MATH_FIELD_NEW);

        if (this.formulasMenu.mathFieldEl) {
          this.editor.getSquire().saveUndoState();

          this.formulasMenu.mathFieldEl.parentNode.replaceChild(
            formulaEl,
            this.formulasMenu.mathFieldEl
          );
        } else {
          // if creating a new element, insert a non-breaking space to allow users
          // continue writing a text (otherwise cursor would stay stuck in a formula
          // field)
          this.editor.getSquire().insertHTML(formulaEl.outerHTML + '&nbsp;');
        }

        const newMathFieldEls = this.$el.getElementsByClassName(CLASS_MATH_FIELD_NEW);
        // It should be actually always one element but more of them might
        // get there - maybe in case of some unexpected runtime error? Let's make
        // sure every field is rendered beautifully.
        for (let newMathFieldEl of newMathFieldEls) {
          this.mathQuill.StaticMath(newMathFieldEl);
          newMathFieldEl.classList.remove(CLASS_MATH_FIELD_NEW);
        }

        this.resetFormulasMenu();
        this.editor.focus();
      },
      onClick(event) {
        let mathFieldEl = null;
        if (event.target.classList.contains(CLASS_MATH_FIELD)) {
          mathFieldEl = event.target;
        } else {
          mathFieldEl = event.target.closest(`.${CLASS_MATH_FIELD}`);
        }

        if (mathFieldEl === null) {
          return;
        }

        this.formulasMenu.style.top = `${mathFieldEl.getBoundingClientRect().bottom -
          this.getEditorPosition().top -
          10}px`;
        this.formulasMenu.style.left = `${mathFieldEl.getBoundingClientRect().left -
          this.getEditorPosition().left +
          10}px`;

        this.formulasMenu.mathFieldEl = mathFieldEl;
        this.formulasMenu.mathFieldFormula = this.mathQuill(mathFieldEl).latex();

        this.formulasMenu.isOpen = true;
      },
      getEditorPosition() {
        return {
          top: this.$el.getBoundingClientRect().top,
          left: this.$el.getBoundingClientRect().left,
        };
      },
      initStaticMathFields() {
        const mathFieldEls = this.$el.getElementsByClassName(CLASS_MATH_FIELD);
        for (let mathFieldEl of mathFieldEls) {
          this.mathQuill.StaticMath(mathFieldEl);
        }
      },
      resetFormulasMenu() {
        this.formulasMenu = {
          isOpen: false,
          mathFieldEl: null,
          mathFieldFormula: '',
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
          },
        };
      },
    },
  };

</script>

<style lang="less" scoped>

  /deep/ .editor .mq-math-mode {
    padding: 4px 4px 2px 0;
    margin: 4px;
    font-family: Symbola;
    color: #333333;
    background-color: #f9f2f4;
    border-radius: 4px;
    box-shadow: 0 2px 1px -1px rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14),
      0 1px 3px 0 rgba(0, 0, 0, 0.12);
  }

  // TODO: find better location for following styles that
  // are supposed to be common to all editable fields
  /deep/ .mq-editable-field {
    border: 0;

    .mq-to,
    .mq-from,
    .mq-sup,
    .mq-sup-inner,
    .mq-sub,
    .mq-numerator,
    .mq-denominator {
      padding-right: 1px;
      padding-left: 1px;
      border: 1px solid gray;
    }

    .mq-int .mq-sup {
      border: 0;
    }
  }

</style>
