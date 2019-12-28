<template>

  <div
    :style="{ 'position': 'relative' }"
  >
    <div
      ref="editor"
      class="editor"
    ></div>

    <FormulasMenu
      v-if="formulasMenu.isOpen"
      v-model="formulasMenu.formula"
      v-click-outside="onClick"
      class="formulas-menu"
      :anchorArrowSide="formulasMenu.anchorArrowSide"
      :mathQuill="mathQuill"
      style="position:absolute"
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

  import { CLASS_MATH_FIELD, CLASS_MATH_FIELD_ACTIVE, CLASS_MATH_FIELD_NEW } from '../constants';
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
      ClickOutside,
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
          formula: '',
          anchorArrowSide: null,
          style: {
            top: 'initial',
            left: 'initial',
            right: 'initial',
          },
        },
        mathQuill: null,
        keyDownEventListener: null,
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

        this.$emit('update', this.editor.getMarkdown());
      });

      this.initStaticMathFields();

      this.editor.getSquire().addEventListener('willPaste', this.onPaste);

      // TUI's `addKeyEventHandler` is not sufficient because they internally
      // override some of actions that need to be customized from here
      // => needs to be set on Squire level
      // Modifying default Squire key events is not documented but there's
      // a recommended solution here https://github.com/neilj/Squire/issues/107
      this.keyDownEventListener = this.$el.addEventListener('keydown', this.onKeyDown, true);

      this.clickEventListener = this.$el.addEventListener('click', this.onClick);
    },
    activated() {
      this.editor.focus();
    },
    beforeDestroy() {
      this.editor.getSquire().removeEventListener('willPaste', this.onPaste);

      this.$el.removeEventListener(this.keyDownEventListener, this.onKeyDown);
      this.$el.removeEventListener(this.clickEventListener, this.onClick);
    },
    methods: {
      /**
       * Allow default keyboard shortcut handlers
       * only for supported actions:
       * bold (ctrl+b), italics (ctrl+i), select all (ctrl+a)
       * copy (ctrl+c), cut (ctrl+x), paste (ctrl+v)
       *
       * Disable all remaining keyboard shortcuts.
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
      /**
       * Remove all formatting on paste.
       */
      onPaste(event) {
        event.preventDefault();

        let fragmentHTML = '';
        event.fragment.childNodes.forEach(childNode => {
          if (childNode.nodeType === childNode.TEXT_NODE) {
            fragmentHTML += childNode.textContent;
          } else {
            fragmentHTML += childNode.outerHTML;
          }
        });

        const doc = new DOMParser().parseFromString(fragmentHTML, 'text/html');
        const text = doc.body.textContent || '';

        this.editor.getSquire().insertHTML(text);
      },
      onMinimizeToolbarBtnClick() {
        this.$emit('minimize');
      },
      onFormulasToolbarBtnClick({ editorCursorPosition }) {
        if (this.formulasMenu.isOpen === true) {
          return;
        }

        const formulasMenuPosition = this.getFormulasMenuPosition({
          targetX: editorCursorPosition.left,
          targetY: editorCursorPosition.bottom,
        });

        this.resetFormulasMenu();
        this.openFormulasMenu({ position: formulasMenuPosition });
      },
      onClick(event) {
        const target = event.target;

        let mathFieldEl = null;
        if (target.classList.contains(CLASS_MATH_FIELD)) {
          mathFieldEl = target;
        } else {
          mathFieldEl = target.closest(`.${CLASS_MATH_FIELD}`);
        }

        const clickedOnMathField = mathFieldEl !== null;
        const clickedOnActiveMathField =
          clickedOnMathField && mathFieldEl.classList.contains(CLASS_MATH_FIELD_ACTIVE);
        const clickedOnFormulasMenu =
          target.classList.contains('formulas-menu') || target.closest('.formulas-menu');
        const clickedOnEditorToolbarBtn = target.classList.contains('tui-toolbar-icons');

        // skip markdown editor toolbar buttons clicks
        // they have their own handlers defined
        if (clickedOnEditorToolbarBtn) {
          return;
        }

        // no need to do anything when the formulas menu clicked
        if (clickedOnFormulasMenu) {
          return;
        }

        // no need to do anything when an active math field clicked
        if (clickedOnActiveMathField) {
          return;
        }

        // if clicked outside of open formulas menu
        // and active math field then close the formulas
        // menu and clear data related to its previous state
        if (this.formulasMenu.isOpen) {
          this.insertFormulaToEditor();
          this.removeMathFieldActiveClass();
          this.resetFormulasMenu();
        }

        // no need to continue if regular text clicked
        if (!clickedOnMathField) {
          return;
        }

        // open formulas menu if a math field clicked
        const formulasMenuFormula = this.mathQuill(mathFieldEl).latex();
        const formulasMenuPosition = this.getFormulasMenuPosition({
          targetX: mathFieldEl.getBoundingClientRect().left,
          targetY: mathFieldEl.getBoundingClientRect().bottom,
        });
        // just a little visual enhancement to make clear
        // that the formula menu is linked to a math field
        // element being edited
        if (formulasMenuPosition.left !== null) {
          formulasMenuPosition.left += 10;
        }
        if (formulasMenuPosition.right !== null) {
          formulasMenuPosition.right -= 10;
        }

        mathFieldEl.classList.add(CLASS_MATH_FIELD_ACTIVE);

        // `nextTick` - to be sure that the formula
        // was reset before a new formula set
        // important when a math field is being edited in open
        // formulas menu and another math field is clicked
        this.$nextTick(() => {
          this.openFormulasMenu({
            position: formulasMenuPosition,
            formula: formulasMenuFormula,
          });
        });
      },
      onFormulasMenuInsert() {
        this.insertFormulaToEditor();

        this.resetFormulasMenu();
        this.removeMathFieldActiveClass();
        this.editor.focus();
      },
      onFormulasMenuCancel() {
        this.removeMathFieldActiveClass();
        this.resetFormulasMenu();
        this.editor.focus();
      },
      /**
       * Initialize elements with math field class
       * as MathQuill static math fields.
       * If `newOnly` true, initialize only elemenets
       * marked as new math fields and remove new class
       * after the initialization.
       */
      initStaticMathFields({ newOnly = false } = {}) {
        const className = newOnly === true ? CLASS_MATH_FIELD_NEW : CLASS_MATH_FIELD;

        const mathFieldEls = this.$el.getElementsByClassName(className);
        for (let mathFieldEl of mathFieldEls) {
          this.mathQuill.StaticMath(mathFieldEl);

          if (newOnly) {
            mathFieldEl.classList.remove(CLASS_MATH_FIELD_NEW);
          }
        }
      },
      findActiveMathField() {
        return this.$el.getElementsByClassName(CLASS_MATH_FIELD_ACTIVE)[0] || null;
      },
      removeMathFieldActiveClass() {
        const activeMathField = this.findActiveMathField();

        if (activeMathField !== null) {
          activeMathField.classList.remove(CLASS_MATH_FIELD_ACTIVE);
        }
      },
      openFormulasMenu({ position, formula = null }) {
        const top = `${position.top}px`;

        let left, right, anchorArrowSide;

        if (position.left !== null) {
          right = 'initial';
          left = `${position.left}px`;
          anchorArrowSide = 'left';
        } else {
          left = 'initial';
          right = `${position.right}px`;
          anchorArrowSide = 'right';
        }

        this.formulasMenu = {
          isOpen: true,
          formula: formula !== null ? formula : '',
          anchorArrowSide,
          style: {
            top,
            left,
            right,
          },
        };
      },
      /**
       * Insert formula from formulas menu to markdown editor.
       * If there is an active math field, replace it by a new
       * element with the updated formula. Otherwise insert a new
       * element with the formula on a current cursor position.
       */
      insertFormulaToEditor() {
        const formula = this.formulasMenu.formula;

        if (!formula) {
          return;
        }

        const formulaEl = document.createElement('span');
        formulaEl.innerHTML = formula;
        formulaEl.classList.add(CLASS_MATH_FIELD, CLASS_MATH_FIELD_NEW);

        const activeMathFieldEl = this.findActiveMathField();

        if (activeMathFieldEl !== null) {
          activeMathFieldEl.parentNode.replaceChild(formulaEl, activeMathFieldEl);
        } else {
          // if creating a new element, insert a non-breaking space to allow users
          // continue writing a text (otherwise cursor would stay stuck in a formula
          // field)
          this.editor.getSquire().insertHTML(formulaEl.outerHTML + '&nbsp;');
        }

        this.initStaticMathFields({ newOnly: true });
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
      getFormulasMenuPosition({ targetX, targetY }) {
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
      resetFormulasMenu() {
        this.formulasMenu = {
          isOpen: false,
          formula: '',
          anchorArrowSide: null,
          style: {
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
