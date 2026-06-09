<template>

  <div>
    <p v-if="value">{{ value }}</p>
    <textarea
      v-if="mode === 'edit'"
      :value="value"
      :data-autofocus="autofocus"
      @input="$emit('update', $event.target.value)"
    ></textarea>
  </div>

</template>


<script>

  export default {
    name: 'RichTextEditor',
    props: {
      value: {
        type: String,
        default: '',
      },
      mode: {
        type: String,
        default: 'view',
      },
      autofocus: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>
