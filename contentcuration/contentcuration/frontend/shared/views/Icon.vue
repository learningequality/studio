<template>

  <KIcon
    v-bind="$attrs"
    :icon="icon"
    :color="color"
    v-on="$listeners"
  />

</template>


<script>

  export default {
    name: 'Icon',
    props: {
      icon: {
        type: String,
        required: true,
      },
      color: {
        type: String,
        required: false,
        default: null,
      },
    },
  };

</script>
