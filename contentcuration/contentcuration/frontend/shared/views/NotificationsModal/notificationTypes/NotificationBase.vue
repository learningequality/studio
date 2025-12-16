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
    border-bottom: 1px solid v-bind('$themeTokens.fineLine');
  }

  .notification-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
  }

  .notification-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    margin-top: 16px;
  }

  .notification-content {
    color: v-bind('$themeTokens.annotation');
  }

</style>
