
# Markdown Editor/Viewer

We use TOAST UI (TUI) Editor v2 as a basis for our markdown [editor](../contentcuration/contentcuration/frontend/shared/views/MarkdownEditor/MarkdownEditor/MarkdownEditor.vue) and [viewer](../contentcuration/contentcuration/frontend/shared/views/MarkdownEditor/MarkdownViewer/MarkdownViewer.vue).

- [Documentation](https://ui.toast.com/tui-editor/)
- [GitHub](https://github.com/nhn/tui.editor)
- [API documentation](https://nhn.github.io/tui.editor/latest/)


## WYSIWYG/Markdown

TUI Editor provides both WYSIWYG and markdown mode. Currently, we use WYSIWYG mode only. Implementation-wise that means that although we need to define conversions both ways (we store markdown on our servers), there is currently no emphasis on making markdown editor work completely because it's not visible to users at all. Some additional steps might be needed (e.g. initialization of MathQuill fields).

However, one of the reasons to choose this library was its potential to scale (maybe to allow users familiar with markdown syntax to use it in the future).

**Development tip**: As mentioned, our custom logic might not work entirely in markdown mode. However, when developing conversions, it might be helpful to set `hideModeSwitch` option to `false` when initializing the editor so you can see whether your basic conversion logic is working both ways properly.


## Viewer

Besides the editor, TUI also provides the [viewer](https://github.com/nhn/tui.editor/blob/master/apps/editor/docs/viewer.md) that is a leaner version of the editor. Currently, we use it for assessment item's questions, answers, and hints preview.


## Under the hood

TUI editor uses the following 3rd party libraries and exposes their API for public use. We use some of them for our custom plugins:

**WYSIWYG mode** is built around [Squire](https://github.com/neilj/Squire). Sometimes TUI's editor API is sufficient though there are some cases when we need to access [Squire's API](https://github.com/neilj/Squire#api) directly. That can be done via [`getSquire()`](https://nhn.github.io/tui.editor/latest/ToastUIEditor#getSquire) method:

```javascript
    import Editor from '@toast-ui/editor';

    const editor = new Editor()
    const squire = editor.getSquire()
```

**Markdown mode** is built on top of [CodeMirror](https://codemirror.net/). We currently don't need to do that though it's API can be similarly accessed via [`getCodeMirror()`](https://nhn.github.io/tui.editor/latest/ToastUIEditor#getCodeMirror)  if needed in the future.

**Conversions from markdown to HTML** are processed by TUI editor's own markdown parser [ToastMark](https://github.com/nhn/tui.editor/tree/master/libs/toastmark). It can be extended by using [Custom HTML Renderer](https://github.com/nhn/tui.editor/blob/master/apps/editor/docs/custom-html-renderer.md).

**Conversions from HTML to markdown** are processed by [to-mark](https://github.com/nhn/tui.editor/tree/master/libs/to-mark), another TUI editor's own library. Default conversion can be overwritten by defining a custom convertor and passing it into `customConvertor` parameter of [initialization`options`](https://nhn.github.io/tui.editor/latest/ToastUIEditor) . Unfortunately, it seems that there is no way to extend the default convertor using TUI Editor's public API at this point. That would be ideal for our use-case when we don't need to define the whole conversion logic but rather process some additional conversions (e.g. formulas). However, it can be extended using [this hackish solution](https://github.com/nhn/tui.editor/issues/615#issuecomment-527802641) which is how we currently extend conversions in this direction until there will be public API available.


## Custom plugins

Our custom plugins are located in [plugins directory](../contentcuration/contentcuration/frontend/shared/views/MarkdownEditor/plugins).

### [Formulas editor plugin](../contentcuration/contentcuration/frontend/shared/views/MarkdownEditor/plugins/formulas)

#### Adding new formulas

1. A new formula's LaTeX representation is inserted as a new HTML element using `getSquire().insertHTML()`. It is also assigned a special class to denote that it is a new math field so that later we know which fields should be initialized as MathQuill static math fields.

2. HTML is converted to markdown (conversions logic will be described later)

3. All new math fields are initialized as MathQuill static math fields

#### Editing existing formulas

The steps are the same as when adding a new formula, except that instead of inserting a new formula element with `getSquire().insertHTML()`, an active element being edited is replaced by a new HTML using `parentNode.replaceChild()`.

#### MathQuill

We use [MathQuill's static math fields](http://docs.mathquill.com/en/latest/Getting_Started/#static-math-rendering) to render formulas in a list of all formulas in the formulas menu and in the editor. [Editable math fields](http://docs.mathquill.com/en/latest/Getting_Started/#editable-math-fields) are used in the edit part of the formulas menu.

##### Customizations

There is one customization in MathQuill code related to formulas logic: When initializing MathQuill fields (MathQuill replaces an element with its own HTML during that process), we add `data-formula` attribute to the root math element. Its value is the original formula's LaTeX representation. This attribute is used as a basis for conversion from HTML to markdown.

**Important**
All MathQuill customizations are saved in [this commit](https://github.com/learningequality/studio/commit/9c85577761a75d1c3c216496f4e3373e57623699). There's a need to be careful to reflect them if we upgrade MathQuill one day (or create MathQuill fork for the sake of clarity if there's a need to upgrade more often or add more customizations).

#### [HTML to Markdown conversion](../contentcuration/contentcuration/frontend/shared/views/MarkdownEditor/plugins/formulas/formula-html-to-md.js)

All elements in the input HTML containing `data-formula` attribute are replaced by a value saved in that attribute and wrapped in double `$`.

#### [Markdown to HTML conversion](../contentcuration/contentcuration/frontend/shared/views/MarkdownEditor/plugins/formulas/formula-md-to-html.js)

All markdown substrings wrapped in double `$` are converted to `span` element and assigned `math-field` class. We use this class to know which elements should be initialized with MathQuill.

This conversion is needed for rendering content in WYSIWYG after the first load (and eventually in the future if we allow users to switch to markdown mode on the fly) because we store markdown on our servers.


### [Image upload plugin](../contentcuration/contentcuration/frontend/shared/views/MarkdownEditor/plugins/image-upload)

#### Adding/editing images

New images can be added in two ways: An image can be dropped into the editor's
content area, or it can be uploaded via the images menu.

If a new image is dropped into the content area, then the images menu opens
with the image and takes over the file upload process.

After an image has been successfully uploaded using the images menu, a dummy
image element is inserted into the editor's content area, and a Vue image
field component is mounted on it. This component is responsible for resizing,
editing, and removing an image.
