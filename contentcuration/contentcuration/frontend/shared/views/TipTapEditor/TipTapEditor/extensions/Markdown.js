import { Markdown as TiptapMarkdown } from 'tiptap-markdown';

// Minimal configuration - we handle preprocessing manually via preprocessMarkdown()
export const Markdown = TiptapMarkdown.configure({
  html: true,
  bulletList: {
    tight: true,
  },
  orderedList: {
    tight: true,
  },
});
