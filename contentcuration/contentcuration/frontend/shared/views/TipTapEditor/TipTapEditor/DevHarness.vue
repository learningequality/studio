<template>

  <div class="dev-harness">
    <header class="harness-header">
      <h1>TipTap Editor - Development Harness</h1>
      <p>This page simulates a parent component to test the editor in isolation.</p>
    </header>
    <hr >
    <TipTapEditor v-model="markdownContent" />
    <hr >
    <div class="raw-output-wrapper">
      <h2>Live Markdown Output (v-model state)</h2>
      <pre>{{ markdownContent }}</pre>
    </div>
  </div>

</template>


<script>

  import { defineComponent, ref } from 'vue';
  import TipTapEditor from './TipTapEditor.vue';

  const SAMPLE_MARKDOWN = `# Testing basic & special nodes

**bold** *italic* <u>underline</u> ~~strikethrough~~

try inline formulas $$x^2$$ test

- list a
- list b

<small class="small-text">
small text
</small>

1. list one
2. list two

There is a [link here](https://github.com/learningequality/studio/pull/5155/checks)!

\`\`\`javascript
export default html => {
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(html, 'text/html');
  const mdImages = doc.querySelectorAll('span[is="markdown-image-field"]');

  for (const mdImageEl of mdImages) {
    mdImageEl.replaceWith(mdImageEl.innerHTML.trim());
  }

  const editOptionButtons = doc.querySelectorAll('.ignore-md');
  for (const editOptionsEl of editOptionButtons) {
    editOptionsEl.remove();
  }
  return doc.body.innerHTML;
};
\`\`\`
`;

  export default defineComponent({
    name: 'DevHarness',
    components: {
      TipTapEditor,
    },
    setup() {
      // simulates the state of the parent component
      const markdownContent = ref(SAMPLE_MARKDOWN);
      return { markdownContent };
    },
  });

</script>


<style scoped>

  .dev-harness {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
  }

  .harness-header {
    margin: 20px;
    text-align: center;
  }

  .raw-output-wrapper {
    width: 1000px;
    padding: 1rem;
    margin-top: 20px;
    color: #f8f8f2;
    background-color: #2d2d2d;
    border-radius: 8px;
  }

  .raw-output-wrapper h2 {
    margin-top: 0;
    color: #ffffff;
  }

  pre {
    word-wrap: break-word;
    white-space: pre-wrap;
  }

</style>
