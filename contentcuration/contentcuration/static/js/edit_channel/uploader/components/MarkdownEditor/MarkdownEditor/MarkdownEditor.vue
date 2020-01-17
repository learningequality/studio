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

  import keyHandlers from './keyHandlers';
  import { clearNodeFormat, getFormulasMenuPosition } from './utils';

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

      // customize default editor buttons labels
      // https://github.com/nhn/tui.editor/issues/524
      const labels = Editor.i18n._langs.get('en_US');
      labels['Bold'] = `${labels['Bold']} (Ctrl+B)`;
      labels['Italic'] = `${labels['Italic']} (Ctrl+I)`;

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
          imageUpload: {
            onImageDrop: this.onImageDrop,
            onImageUploadToolbarBtnClick: this.onImageUploadToolbarBtnClick,
            toolbarBtnTooltip: 'Insert image (Ctrl+P)',
          },
          formulas: {
            onFormulasToolbarBtnClick: this.onFormulasToolbarBtnClick,
            toolbarBtnTooltip: 'Insert formula (Ctrl+F)',
          },
          minimize: {
            onMinimizeToolbarBtnClick: this.onMinimizeToolbarBtnClick,
            toolbarBtnTooltip: 'Minimize (Ctrl+M)',
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
      this.keyDownEventListener = this.$el.addEventListener('keydown', this.onKeyDown, true);
      this.clickEventListener = this.$el.addEventListener('click', this.onClick);
    },
    activated() {
      this.editor.focus();
    },
    beforeDestroy() {
      this.editor.getSquire().removeEventListener('willPaste', this.onPaste);
      this.$el.removeEventListener(this.keyDownEventListener, this.onKeyDown, true);
      this.$el.removeEventListener(this.clickEventListener, this.onClick);
    },
    methods: {
      /**
       * Handle Squire keydown events - TUI WYSIWYG editor is built
       * on top of Squire (https://github.com/neilj/Squire)
       * and provides its instance including API methods
       *
       * TUI's `addKeyEventHandler` is not sufficient because they
       * internally override some of the actions that need to be
       * customized from here => needs to be set on Squire level
       * Modifying default Squire key events is not documented but there's
       * a recommended solution here https://github.com/neilj/Squire/issues/107
       */
      onKeyDown(event) {
        const squire = this.editor.getSquire();

        if (event.key in keyHandlers) {
          keyHandlers[event.key](squire);
        }

        // Add keyboard shortcuts handlers for custom markdown
        // editor toolbar buttons: image upload (ctrl+p),
        // formulas (ctrl+f), minimize (ctrl+m)
        // Needs to be done here because TUI editor currently
        // doesn't support customizing shortcuts
        // https://github.com/nhn/tui.editor/issues/281
        if (event.ctrlKey === true && event.key === 'p') {
          this.onImageUploadToolbarBtnClick();
        }

        if (event.ctrlKey === true && event.key === 'f') {
          this.onFormulasToolbarBtnClick();
        }

        if (event.ctrlKey === true && event.key === 'm') {
          this.onMinimizeToolbarBtnClick();
        }

        // Allow default keyboard shortcut handlers
        // for supported actions: bold (ctrl+b), italics (ctrl+i),
        // select all (ctrl+a), copy (ctrl+c),
        // cut (ctrl+x), paste (ctrl+v)
        // Disable all remaining default keyboard shortcuts.
        if (event.ctrlKey === true && ['b', 'i', 'a', 'c', 'x', 'v'].includes(event.key)) {
          return;
        }

        // Disable all remaining Ctrl key shortcuts
        if (event.ctrlKey === true) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      onPaste(event) {
        const fragment = clearNodeFormat({
          node: event.fragment,
          ignore: ['b', 'i'],
        });
        event.fragment = fragment;
      },
      onImageDrop() {
        alert('TBD - see onImageDrop');
      },
      onImageUploadToolbarBtnClick() {
        alert('TBD - see onImageUploadToolbarBtnClick');
      },
      onFormulasToolbarBtnClick() {
        if (this.formulasMenu.isOpen === true) {
          return;
        }

        const cursor = this.editor.getSquire().getCursorPosition();
        const formulasMenuPosition = getFormulasMenuPosition({
          editorEl: this.$el,
          targetX: cursor.x,
          targetY: cursor.y + cursor.height,
        });

        this.resetFormulasMenu();
        this.openFormulasMenu({ position: formulasMenuPosition });
      },
      onMinimizeToolbarBtnClick() {
        this.$emit('minimize');
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
        const formulasMenuPosition = getFormulasMenuPosition({
          editorEl: this.$el,
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
    cursor: pointer;
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
