<template>
  <div class="studio-large-loader">
    <KCircularLoader :size="70" />
    <div class="loader-text">
      <slot />
    </div>
  </div>
</template>

<script>
import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader.vue';

export default {
  name: 'StudioLargeLoader',
  components: { KCircularLoader },
};
</script>

<style scoped>
.studio-large-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
}
.loader-text {
  margin-top: 16px;
  font-size: 1.2em;
  color: #555;
}
</style>