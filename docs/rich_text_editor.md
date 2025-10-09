## Rich Text Editor Documentation

Studio has a Rich text Editor that is currently being used in the exercise editor: (questions / answers / hints)

We use [TipTap](https://tiptap.dev/) that is a headless framework based on ProseMirror. It was built to replace a long lived past TOAST UI (TUI) based editor; that affected some implementation decisions to maintain backward compatibility.

Currently editor code lives in: https://github.com/learningequality/studio/tree/unstable/contentcuration/contentcuration/frontend/shared/views/TipTapEditor

Another point that had an impact on our architectural decisions is that there are future plans to extract the editor to be part of Kolibri-Design-System to be used in Kolibri too. That meant keeping the editor as decoupled from the rest of the codebase as possible was very important.

## Useful Links
- Original figma design [link](https://www.figma.com/design/uw8lx88ZKZU8X7kN9SdLeo/Rich-text-editor---GSOC-2025?node-id=377-422&p=f&t=HIkJ8pF9xudcOnLd-0)
- Original Tracking issue for creating the editor [link](https://github.com/learningequality/studio/issues/5049)
- Tiptap basic editor [docs](https://tiptap.dev/docs/editor/getting-started/overview)
