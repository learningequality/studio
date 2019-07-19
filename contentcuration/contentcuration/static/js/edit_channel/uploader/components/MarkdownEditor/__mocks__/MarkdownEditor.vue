<template>
  <div>
    <div ref="editor">
      {{ markdown }}
    </div>
  </div>
</template>

<script>

  export default {
    name: 'MarkdownEditor',
    model: {
      prop: 'markdown',
      event: 'update',
    },
    props: {
      markdown: {
        type: String,
      },
    },
  };

</script>
