<template>

  <VTooltip bottom>
    <template v-slot:activator="{ on }">
      <VBtn
        icon
        flat
        class="ma-0 mr-1"
        color="darkGrey"
        v-on="on"
        @click="$emit('click')"
        @keydown.enter="$emit('mousedown')"
        @keyup.enter="$emit('mouseup')"
        @mousedown="$emit('mousedown')"
        @mouseup="$emit('mouseup')"
      >
        <Icon>
          {{ icon }}
        </Icon>
      </VBtn>

    </template>
    <span>{{ tooltip }}</span>
  </VTooltip>

</template>

<script>

  export default {
    name: 'ThumbnailToolbarIcon',
    props: {
      icon: {
        type: String,
        required: true,
      },
      tooltip: {
        type: String,
        required: true,
      },
    },
  };

</script>
