<template>

  <VTooltip maxWidth="150px" bottom color="darkGrey" v-bind="$attrs">
    <template #activator="{ on }">
      <VBtn flat icon v-on="on">
        <Icon>
          {{ icon }}
        </Icon>
      </VBtn>
    </template>
    <span class="text-xs-center">{{ text }}</span>
  </VTooltip>

</template>

<script>

  export default {
    name: 'IconButton',
    props: {
      text: {
        type: String,
        required: true,
      },
      icon: {
        type: String,
        required: true,
      },
    },
  };

</script>
