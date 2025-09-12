<template>

  <div class="box warning-box">
    <KLabeledIcon>
      <template #icon>
        <KIcon
          icon="warningIncomplete"
          class="warning-icon"
        />
      </template>
      <slot></slot>
    </KLabeledIcon>
  </div>

</template>


<script setup>

  import { computed } from 'vue';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';

  const paletteTheme = themePalette();

  const warningBoxBackgroundColor = computed(() => paletteTheme.yellow.v_100);
  const warningBoxTextColor = computed(() => paletteTheme.red.v_500);

</script>


<style lang="scss" scoped>

  .box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
  }

  .warning-box {
    color: v-bind('warningBoxTextColor');
    background-color: v-bind('warningBoxBackgroundColor');
  }

  .warning-icon {
    width: 20px;
    height: 20px;
  }

</style>
