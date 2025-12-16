<template>

  <div class="indicator-wrapper">
    <slot></slot>
    <div
      v-if="hasNewNotifications"
      class="notification-indicator"
    ></div>
  </div>

</template>


<script setup>

  import { computed } from 'vue';
  import useStore from 'shared/composables/useStore';

  const store = useStore();
  const hasNewNotifications = computed(() => store.getters['hasNewNotifications']);

</script>


<style scoped lang="scss">

  .indicator-wrapper {
    position: relative;
    display: inline-block;
  }

  .notification-indicator {
    position: absolute;
    top: 6px;
    right: 9px;
    width: 11px;
    height: 11px;
    background-color: v-bind('$themePalette.red.v_500');
    border-radius: 50%;
    box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.2);
  }

</style>
