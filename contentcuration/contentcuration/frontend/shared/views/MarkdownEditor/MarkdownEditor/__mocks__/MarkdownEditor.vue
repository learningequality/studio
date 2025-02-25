<template>

  <div>
    <div ref="editor">
      {{ value }}
    </div>
  </div>

</template>


<script>

  export default {
    name: 'MarkdownEditor',
    model: {
      prop: 'value',
      event: 'update',
    },
    props: {
      value: {
        type: String,
        default: '',
      },
    },
  };

</script>
