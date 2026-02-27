<template>

  <div class="studio-chip">
    <KIcon
      :icon="icon"
      :color="labelColor"
      class="chip-icon"
    />
    {{ text }}
  </div>

</template>


<script setup>

  defineProps({
    labelColor: {
      type: String,
      required: true,
    },
    backgroundColor: {
      type: String,
      required: true,
    },
    borderColor: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  });

</script>


<style lang="css" scoped>

  .studio-chip {
    display: flex;
    gap: 3px;
    align-items: center;
    padding: 2px 8px;
    font-size: 12px;
    font-weight: 400;
    color: v-bind('labelColor');
    background-color: v-bind('backgroundColor');
    border: 1px solid v-bind('borderColor');
    border-radius: 16px;
  }

  .chip-icon {
    position: unset;
    width: 18px;
    height: 18px;
  }

</style>
