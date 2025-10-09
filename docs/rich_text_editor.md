## Rich Text Editor Documentation

Studio has a Rich text Editor that is currently being used in the exercise editor: (questions / answers / hints)

We use [TipTap](https://tiptap.dev/) that is a headless framework based on ProseMirror. It was built to replace a long lived past TOAST UI (TUI) based editor; that affected some implementation decisions to maintain backward compatibility.

Currently editor code lives in: https://github.com/learningequality/studio/tree/unstable/contentcuration/contentcuration/frontend/shared/views/TipTapEditor

Another point that had an impact on our architectural decisions is that there are future plans to extract the editor to be part of Kolibri-Design-System to be used in Kolibri too. That meant keeping the editor as decoupled from the rest of the codebase as possible was very important.

## Useful Links
- Original figma design [link](https://www.figma.com/design/uw8lx88ZKZU8X7kN9SdLeo/Rich-text-editor---GSOC-2025?node-id=377-422&p=f&t=HIkJ8pF9xudcOnLd-0)
- Original Tracking issue for creating the editor [link](https://github.com/learningequality/studio/issues/5049)
- Tiptap basic editor [docs](https://tiptap.dev/docs/editor/getting-started/overview)
---
## Custom extensions
For non-text elements, we create [custom extensions optionally with their node views](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/vue).
We currently have custom extensions for:
- images
- formulas
- syntax highlighted code blocks
- links
- `<small />` text nodes

### How to add a custom plugin?
This is a very high level guide, you'll still need to check the docs but make sure you check all the boxes in this list:
1. Create a new file in
    `contentcuration/frontend/shared/views/TipTapEditor/extensions/`
2. Define your node or mark using TipTap’s `Node.create()` or `Mark.create()`.
3. Add the new extension to the editor’s extension list in `Editor.vue` or `editorExtensions.js`.
4. If your node needs Markdown support, update the custom serializer and add tests in
    `__tests__/markdownSerializer.spec.js`.
---
## Content Conversion Flow
As mentioned above, the old content API saved markdown in the database, the following data conversion flow maintains backward compatibility by implementing dual conversion between the strcutured JSON format TipTap uses and markdown.

We support the conversion for:
- Standard Markdown elements previously handled by the ToastUI editor and its Showdown converter.
- A specific, legacy format for custom nodes, particularly for Images `(![alt](placeholder/checksum.ext =WxH))` and Math Formulas `$$latex$$`

The formats for the custom nodes are adapted from the old editor's standard syntax conversion.
We have our own custom markdown serializer for that too! The following graph illustrates the whole flow.
<img width="900" height="900" alt="image" src="https://github.com/user-attachments/assets/c994951d-1ca0-47fd-b342-e8bbf76caf1a" />

---
