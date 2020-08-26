
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

### Formulas editor

TBD

#### HTML → Markdown
#### Markdown → HTML
#### MathQuill

### Images upload

TBD
