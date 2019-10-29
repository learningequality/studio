<template>

  <VDialog
    :value="value"
    width="500"
    persistent
    @input="$emit('input')"
  >
    <VCard>
      <VCardTitle
        class="headline"
        primary-title
      >
        {{ title }}
      </VCardTitle>

      <VCardText>
        <slot></slot>
      </VCardText>

      <VDivider />

      <VCardActions>
        <VSpacer />
        <slot name="controls"></slot>
      </VCardActions>
    </VCard>
  </VDialog>

</template>

<script>

  export default {
    name: 'DialogBox',
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
      },
    },
  };

</script>
