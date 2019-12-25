<template>

  <div :style="{ 'position': 'relative' }">

    <div
      ref="editor"
      class="editor"
    ></div>

    <FormulasMenu
      v-if="formulasMenu.isOpen"
      v-model="formulasMenu.formula"
      v-click-outside="onFormulasMenuClickOutside"
      class="formulas-menu"
      :anchorArrowSide="formulasMenu.anchorArrowSide"
      :mathQuill="mathQuill"
      :style="formulasMenu.style"
      @insert="onFormulasMenuInsert"
      @cancel="onFormulasMenuCancel"
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
  import imageUpload from '../extensions/image-upload';
  import formulas from '../extensions/formulas';
  import minimize from '../extensions/minimize';
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
          anchorArrowSide: null,
          mathFieldEl: null, // a math field being edited in formulas menu
          formula: '', // latex formula of a math field being edited in formulas menu
          style: {
            position: 'absolute',
            top: 'initial',
            left: 'initial',
            right: 'initial',
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
        minHeight: '240px',
        height: 'auto',
        initialValue: this.markdown,
        initialEditType: 'wysiwyg',
        usageStatistics: false,
        toolbarItems: ['bold', 'italic'],
        hideModeSwitch: true,
        exts: [imageUpload, formulas, minimize],
        extOptions: {
          formulas: {
            onFormulasToolbarBtnClick: this.onFormulasToolbarBtnClick,
          },
          minimize: {
            onMinimizeToolbarBtnClick: this.onMinimizeToolbarBtnClick,
          },
        },
        customConvertor: CustomConvertor,
      };

      this.editor = new Editor(options);
      this.editor.focus();

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

      // TUI's `addKeyEventHandler` is not sufficient because they internally
      // override some of actions that need to be customized from here
      // needs to be set on Squire level
      // modifying default Squire key events is not documented but there's
      // a recommended solution here https://github.com/neilj/Squire/issues/107
      this.keyDownEventListener = this.$el.addEventListener('keydown', this.onKeyDown, true);

      this.clickEventListener = this.$el.addEventListener('click', this.onClick);
    },
    activated() {
      this.editor.focus();
    },
    beforeDestroy() {
      this.$el.removeEventListener(this.keyDownEventListener, this.onKeyDown);
      this.$el.removeEventListener(this.clickEventListener, this.onClick);
    },
    methods: {
      onMinimizeToolbarBtnClick() {
        this.$emit('minimize');
      },
      onFormulasToolbarBtnClick({ editorCursorPosition }) {
        const formulasMenuPos = this.getFormulasMenuPos({
          targetX: editorCursorPosition.left,
          targetY: editorCursorPosition.bottom,
        });

        this.formulasMenu.style.top = `${formulasMenuPos.top}px`;
        if (formulasMenuPos.left !== null) {
          this.formulasMenu.style.right = 'initial';
          this.formulasMenu.style.left = `${formulasMenuPos.left}px`;
          this.formulasMenu.anchorArrowSide = 'left';
        } else {
          this.formulasMenu.style.left = 'initial';
          this.formulasMenu.style.right = `${formulasMenuPos.right}px`;
          this.formulasMenu.anchorArrowSide = 'right';
        }

        this.formulasMenu.mathFieldEl = null;
        this.formulasMenu.formula = '';

        this.formulasMenu.isOpen = true;
      },
      onFormulasMenuClickOutside() {
        this.insertFormula();
      },
      onFormulasMenuInsert() {
        this.insertFormula();
      },
      onFormulasMenuCancel() {
        this.resetFormulasMenu();
      },
      /**
       * Allow default keyboard shortcut handlers
       * only for supported actions:
       * bold (ctrl+b), italics (ctrl+i), select all (ctrl+a)
       * copy (ctrl+c), cut (ctrl+x), paste (ctrl+v)
       *
       * Disable all remaining shortcuts.
       */
      onKeyDown(event) {
        if (event.ctrlKey === true && ['b', 'i', 'a', 'c', 'x', 'v'].includes(event.key)) {
          return;
        }

        if (event.ctrlKey === true) {
          event.preventDefault();
          event.stopPropagation();
        }
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

        const formulasMenuPos = this.getFormulasMenuPos({
          targetX: mathFieldEl.getBoundingClientRect().left,
          targetY: mathFieldEl.getBoundingClientRect().bottom,
        });

        this.formulasMenu.style.top = `${formulasMenuPos.top}px`;
        if (formulasMenuPos.left !== null) {
          this.formulasMenu.style.right = 'initial';
          this.formulasMenu.style.left = `${formulasMenuPos.left + 10}px`;
          this.formulasMenu.anchorArrowSide = 'left';
        } else {
          this.formulasMenu.style.left = 'initial';
          this.formulasMenu.style.right = `${formulasMenuPos.right - 10}px`;
          this.formulasMenu.anchorArrowSide = 'right';
        }

        this.formulasMenu.mathFieldEl = mathFieldEl;
        this.formulasMenu.formula = this.mathQuill(mathFieldEl).latex();

        this.formulasMenu.isOpen = true;
      },
      insertFormula() {
        const formula = this.formulasMenu.formula;
        const CLASS_MATH_FIELD_NEW = `${CLASS_MATH_FIELD}-new`;

        const formulaEl = document.createElement('span');
        formulaEl.innerHTML = formula;
        formulaEl.classList.add(CLASS_MATH_FIELD, CLASS_MATH_FIELD_NEW);

        if (this.formulasMenu.mathFieldEl) {
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
      /**
       * Calculate the formulas menu position.
       * If the formulas menu is to be shown in the second half (horizontally)
       * of the editor, it's right corner should be clipped to the target
       * => this position of the right corner is returned as `right`.
       * Otherwise left corner is used to clip the menu and position
       * of the left corner is return as `left`.
       * Position returned is relative to editor element.
       * @param {Number} targetX Viewport X position of a point in editor
       *                         to which formulas menu should be clipped to
       *
       * @param {Number} targetY Viewport Y position of a point in editor
       *                         to which formulas menu should be clipped to
       */
      getFormulasMenuPos({ targetX, targetY }) {
        const editorWidth = this.$el.getBoundingClientRect().width;
        const editorTop = this.$el.getBoundingClientRect().top;
        const editorLeft = this.$el.getBoundingClientRect().left;
        const editorRight = this.$el.getBoundingClientRect().right;
        const editorMiddle = editorLeft + editorWidth / 2;

        const menuTop = targetY - editorTop;

        let menuLeft = null;
        let menuRight = null;

        if (targetX < editorMiddle) {
          menuLeft = targetX - editorLeft;
        } else {
          menuRight = editorRight - targetX;
        }

        return {
          top: menuTop,
          left: menuLeft,
          right: menuRight,
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
          anchorArrowSide: null,
          mathFieldEl: null,
          formula: '',
          style: {
            position: 'absolute',
            top: 'initial',
            left: 'initial',
            right: 'initial',
          },
        };
      },
    },
  };

</script>

<style lang="less" scoped>

  .editor,
  .formulas-menu {
    position: relative;
    z-index: 2;
  }

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

  // TODO (when updating to new frontend files structure)
  // find better location for following styles that
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
