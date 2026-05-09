<template>

  <div>
    <p v-if="value">{{ value }}</p>
    <button
      v-if="mode === 'edit'"
      type="button"
      aria-label="Update hint text"
      @click="$emit('update', 'Updated hint')"
    >
      Update hint text
    </button>
  </div>

</template>


<script>

  export default {
    name: 'TipTapEditor',
    props: {
      value: {
        type: String,
        default: '',
      },
      mode: {
        type: String,
        default: 'view',
      },
    },
  };

</script>
