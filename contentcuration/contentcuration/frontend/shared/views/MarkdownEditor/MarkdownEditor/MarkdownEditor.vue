<template>

  <div
    style="position: relative;"
    class="wrapper"
    :class="{highlight, uploading: Boolean(uploadingChecksum)}"
    @dragenter="highlight = true"
    @dragover="highlight = true"
    @dragleave="highlight = false"
    @drop="highlight = false"
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
    <ImagesMenu
      v-if="imagesMenu.isOpen"
      v-click-outside="onClick"
      class="images-menu"
      :anchorArrowSide="imagesMenu.anchorArrowSide"
      style="position:absolute"
      :style="imagesMenu.style"
      :src="imagesMenu.src"
      :alt="imagesMenu.alt"
      :handleFileUpload="handleFileUpload"
      :imagePreset="imagePreset"
      @insert="insertImageToEditor"
      @cancel="onImagesMenuCancel"
    />
  </div>

</template>

<script>

  import '../mathquill/mathquill.js';
  import 'codemirror/lib/codemirror.css';
  import '@toast-ui/editor/dist/toastui-editor.css';

  import Vue from 'vue';
  import { mapGetters } from 'vuex';
  import Editor from '@toast-ui/editor';

  import imageUpload from '../plugins/image-upload';
  import formulas from '../plugins/formulas';
  import minimize from '../plugins/minimize';
  import formulaHtmlToMd from '../plugins/formulas/formula-html-to-md';
  import formulaMdToHtml from '../plugins/formulas/formula-md-to-html';
  import imagesHtmlToMd from '../plugins/image-upload/image-html-to-md';
  import imagesMdToHtml from '../plugins/image-upload/image-md-to-html';

  import {
    CLASS_MATH_FIELD,
    CLASS_MATH_FIELD_ACTIVE,
    CLASS_MATH_FIELD_NEW,
    CLASS_IMG_FIELD_NEW,
  } from '../constants';
  import ImageField from './ImageField/ImageField';
  import { clearNodeFormat, getExtensionMenuPosition } from './utils';
  import keyHandlers from './keyHandlers';
  import FormulasMenu from './FormulasMenu/FormulasMenu';
  import ImagesMenu from './ImagesMenu/ImagesMenu';
  import ClickOutside from 'shared/directives/click-outside';

  const ImageFieldClass = Vue.extend(ImageField);

  export default {
    name: 'MarkdownEditor',
    components: {
      FormulasMenu,
      ImagesMenu,
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
      // Inject function to handle file uploads
      handleFileUpload: {
        type: Function,
      },
      imagePreset: {
        type: String,
      },
    },
    data() {
      return {
        editor: null,
        highlight: false,
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
        imagesMenu: {
          isOpen: false,
          anchorArrowSide: null,
          src: '',
          alt: '',
          style: {
            top: 'initial',
            left: 'initial',
            right: 'initial',
          },
        },
        activeImageComponent: null,
        uploadingChecksum: '',
        mathQuill: null,
        keyDownEventListener: null,
        clickEventListener: null,
      };
    },
    computed: {
      ...mapGetters('file', ['getFileUpload']),
      // Disabling next line as it's used to watch dropped in images
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      file() {
        return this.getFileUpload(this.uploadingChecksum);
      },
    },
    watch: {
      markdown(newMd, previousMd) {
        if (newMd !== previousMd && newMd !== this.editor.getMarkdown()) {
          this.editor.setMarkdown(newMd);
          this.initStaticMathFields();
          this.initImageFields();
        }
      },
      'file.file_on_disk'(src) {
        if (src) {
          this.insertImageToEditor({ src, alt: '' });
          this.uploadingChecksum = '';
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
          // Delete the img rule to prevent images from getting
          // pre-parsed (need to factor in width and height)
          delete toMarkOptions.renderer.rules.IMG;
          let content = super.toMarkdown(html, toMarkOptions);
          content = formulaHtmlToMd(content);
          content = imagesHtmlToMd(content);
          content = content.replaceAll('&nbsp;', ' ');
          return content;
        }
      }
      tmpEditor.remove();

      const createBoldButton = () => {
        {
          const button = document.createElement('button');
          button.className = 'tui-bold tui-toolbar-icons';
          return button;
        }
      };
      const createItalicButton = () => {
        {
          const button = document.createElement('button');
          button.className = 'tui-italic tui-toolbar-icons';
          return button;
        }
      };
      const options = {
        el: this.$refs.editor,
        minHeight: '240px',
        height: 'auto',
        initialValue: this.markdown,
        initialEditType: 'wysiwyg',
        usageStatistics: false,
        toolbarItems: [
          {
            type: 'button',
            options: {
              el: createBoldButton(),
              command: 'Bold',
              tooltip: this.$tr('bold'),
            },
          },
          {
            type: 'button',
            options: {
              el: createItalicButton(),
              command: 'Italic',
              tooltip: this.$tr('italic'),
            },
          },
        ],
        hideModeSwitch: true,
        plugins: [
          [
            imageUpload,
            {
              onImageDrop: this.onImageDrop,
              onImageUploadToolbarBtnClick: this.onImageUploadToolbarBtnClick,
              toolbarBtnTooltip: this.$tr('image'),
            },
          ],
          [
            formulas,
            {
              onFormulasToolbarBtnClick: this.onFormulasToolbarBtnClick,
              toolbarBtnTooltip: this.$tr('formulas'),
            },
          ],
          [
            minimize,
            {
              onMinimizeToolbarBtnClick: this.onMinimizeToolbarBtnClick,
              toolbarBtnTooltip: this.$tr('minimize'),
            },
          ],
        ],
        customConvertor: CustomConvertor,
        // https://github.com/nhn/tui.editor/blob/master/apps/editor/docs/custom-html-renderer.md
        customHTMLRenderer: {
          text(node) {
            let content = formulaMdToHtml(node.literal);
            content = imagesMdToHtml(content);
            return {
              type: 'html',
              content,
            };
          },
        },
      };

      this.editor = new Editor(options);

      this.editor.focus();

      this.editor.on('change', () => {
        this.$emit('update', this.editor.getMarkdown());
      });

      this.initStaticMathFields();
      this.initImageFields();

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

        // ESC should close menus if any are open
        // or close the editor if none are open
        if (event.key === 'Escape') {
          event.stopImmediatePropagation();
          if (this.formulasMenu.isOpen) {
            this.resetFormulasMenu();
          } else if (this.imagesMenu.isOpen) {
            this.resetImagesMenu();
          } else {
            this.onMinimizeToolbarBtnClick();
          }
        }

        // Add keyboard shortcuts handlers for custom markdown
        // editor toolbar buttons: image upload (ctrl+p),
        // formulas (ctrl+f), minimize (ctrl+m)
        // Needs to be done here because TUI editor currently
        // doesn't support customizing shortcuts
        // https://github.com/nhn/tui.editor/issues/281
        if (event.ctrlKey === true && event.key === 'p') {
          event.stopImmediatePropagation();
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
      onImageDrop(fileUpload) {
        this.highlight = false;
        this.handleFileUpload([fileUpload])
          .then(files => {
            const fileUpload = files[0];
            if (fileUpload && fileUpload.checksum) {
              this.uploadingChecksum = fileUpload.checksum;
            } else {
              this.uploadingChecksum = '';
            }
          })
          .catch(() => {
            this.uploadingChecksum = '';
          });
      },
      onImageUploadToolbarBtnClick() {
        if (this.imagesMenu.isOpen === true) {
          return;
        }
        this.activeImageComponent = null;

        const cursor = this.editor.getSquire().getCursorPosition();
        const position = getExtensionMenuPosition({
          editorEl: this.$el,
          targetX: cursor.x,
          targetY: cursor.y + cursor.height,
        });
        this.resetImagesMenu();
        this.openImagesMenu({ position });
      },
      onFormulasToolbarBtnClick() {
        if (this.formulasMenu.isOpen === true) {
          return;
        }

        const cursor = this.editor.getSquire().getCursorPosition();
        const formulasMenuPosition = getExtensionMenuPosition({
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
        this.highlight = false;
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
        const clickedOnImagesMenu =
          target.classList.contains('images-menu') || target.closest('.images-menu');
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

        // no need to do anything when the images menu clicked
        if (clickedOnImagesMenu) {
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

        // if clicked outside of open images menu close images
        // menu and clear data related to its previous state
        if (this.imagesMenu.isOpen) {
          this.resetImagesMenu();
        }

        // no need to continue if regular text clicked
        if (!clickedOnMathField) {
          return;
        }

        // open formulas menu if a math field clicked
        const formulasMenuFormula = this.mathQuill(mathFieldEl).latex();
        const formulasMenuPosition = getExtensionMenuPosition({
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

        this.removeMathFieldActiveClass();
        this.resetFormulasMenu();
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
        this.resetMenus();
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

      /* IMAGE MENU */
      /**
       * Initialize elements with image field class with ImageField component
       */
      initImageFields({ newOnly = false } = {}) {
        const imageFieldEls = this.$el.getElementsByTagName('img');
        for (let imageEl of imageFieldEls) {
          if (!newOnly || imageEl.classList.contains(CLASS_IMG_FIELD_NEW)) {
            const ImageComponent = new ImageFieldClass({
              propsData: {
                src: imageEl.getAttribute('src'),
                alt: imageEl.getAttribute('alt'),
                width: imageEl.getAttribute('width'),
                height: imageEl.getAttribute('height'),
              },
            });
            ImageComponent.$mount();
            ImageComponent.$on('edit', ({ event, component, image }) => {
              this.activeImageComponent = component;
              const position = getExtensionMenuPosition({
                editorEl: this.$el,
                targetX: event.clientX,
                targetY: event.clientY,
              });
              this.openImagesMenu({
                position,
                alt: image.alt,
                src: image.src,
              });
            });
            imageEl.replaceWith(ImageComponent.$el);
            imageEl.classList.remove(CLASS_IMG_FIELD_NEW);
          }
        }
      },
      openImagesMenu({ position, src = '', alt = '' }) {
        this.resetMenus();
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
        this.imagesMenu = {
          isOpen: true,
          anchorArrowSide,
          src,
          alt,
          style: {
            top,
            left,
            right,
          },
        };
      },
      /**
       * Insert image from images menu to markdown editor.
       * Emit an uploaded event to let parent process files
       * properly
       */
      insertImageToEditor(imageData) {
        if (!imageData) {
          return;
        }
        if (this.activeImageComponent) {
          this.activeImageComponent.setImageData(imageData);
        } else {
          const imageEl = document.createElement('img');
          imageEl.classList.add(CLASS_IMG_FIELD_NEW);
          imageEl.src = imageData.src;
          imageEl.alt = imageData.alt;
          this.editor.getSquire().insertHTML('&nbsp;' + imageEl.outerHTML + '&nbsp;');
          this.initImageFields({ newOnly: true });
        }
        this.resetImagesMenu();
      },
      onImagesMenuCancel() {
        this.resetImagesMenu();
        this.editor.focus();
      },
      resetImagesMenu() {
        this.imagesMenu = {
          isOpen: false,
          anchorArrowSide: null,
          src: '',
          alt: '',
          style: {
            top: 'initial',
            left: 'initial',
            right: 'initial',
          },
        };
      },
      resetMenus() {
        this.resetImagesMenu();
        this.resetFormulasMenu();
      },
    },
    $trs: {
      bold: 'Bold (Ctrl+B)',
      italic: 'Italic (Ctrl+I)',
      image: 'Insert image (Ctrl+P)',
      formulas: 'Insert formula (Ctrl+F)',
      minimize: 'Minimize (Ctrl+M)',
    },
  };

</script>

<style lang="less" scoped>

  @import '../mathquill/mathquill.css';

  .uploading {
    cursor: progress;
  }

  .formulas-menu,
  .images-menu {
    z-index: 2;
  }

  .wrapper {
    border: 4px solid transparent;
    &.highlight {
      border-color: var(--v-primary-base);
    }
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
