<template>

  <VTooltip maxWidth="150px" bottom color="darkGrey" v-bind="$attrs">
    <template #activator="{ on }">
      <VBtn flat icon :small="small" v-on="on">
        <Icon :small="small">
          <slot>
            {{ icon }}
          </slot>
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
      small: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>
