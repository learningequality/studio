<template>

  <div>
    <div>
      {{ markdown }}
    </div>
  </div>

</template>


<script>

  export default {
    name: 'MarkdownViewer',
    props: {
      markdown: {
        type: String,
        default: '',
      },
    },
  };

</script>
