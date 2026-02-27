<template>

  <li class="notification-item">
    <div class="notification-header">
      <slot name="title">
        <strong>{{ title }}</strong>
      </slot>
      <span>
        {{ $formatDate(date) }}
      </span>
    </div>
    <div
      v-if="$slots.default"
      class="notification-content"
    >
      <slot name="default"></slot>
    </div>
    <div
      v-if="$slots.footer || $slots.action"
      class="notification-footer"
    >
      <slot name="footer"><div></div></slot>
      <slot name="action"></slot>
    </div>
  </li>

</template>


<script setup>

  defineProps({
    title: {
      type: String,
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
  });

</script>


<style scoped lang="scss">

  .notification-item {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    border-bottom: 1px solid v-bind('$themeTokens.fineLine');
  }

  .notification-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .notification-footer {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }

  .notification-content {
    color: v-bind('$themeTokens.annotation');
  }

</style>
