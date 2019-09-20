<template>

  <div>
    <div>
      {{ value }}
    </div>
  </div>

</template>

<script>

  export default {
    name: 'MarkdownViewer',
    props: {
      value: {
        type: String,
      },
    },
  };

</script>
