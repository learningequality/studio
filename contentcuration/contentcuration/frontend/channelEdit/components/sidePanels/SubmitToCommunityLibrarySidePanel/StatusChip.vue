<template>

  <div class="status-chip">
    <KIcon
      :icon="icon"
      :color="labelColor"
      class="status-icon"
    />
    {{ text }}
  </div>

</template>


<script setup>

  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { computed } from 'vue';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  const theme = themePalette();

  const { pendingStatus$, approvedStatus$, flaggedStatus$ } = communityChannelsStrings;

  const configChoices = {
    submitted: {
      text: pendingStatus$(),
      color: theme.yellow.v_100,
      labelColor: theme.orange.v_600,
      icon: 'schedule',
    },
    approved: {
      text: approvedStatus$(),
      color: theme.green.v_100,
      labelColor: theme.green.v_600,
      icon: 'circleCheckmark',
    },
    flagged: {
      text: flaggedStatus$(),
      color: theme.red.v_100,
      labelColor: theme.red.v_600,
      icon: 'error',
    },
  };

  const props = defineProps({
    status: {
      type: String,
      required: true,
      validator: value => ['submitted', 'approved', 'flagged'].includes(value),
    },
  });

  const icon = computed(() => configChoices[props.status].icon);
  const text = computed(() => configChoices[props.status].text);
  const color = computed(() => configChoices[props.status].color);
  const labelColor = computed(() => configChoices[props.status].labelColor);

</script>


<style lang="css" scoped>

  .status-chip {
    display: flex;
    gap: 3px;
    align-items: center;
    height: 20px;
    padding-top: 2px;
    padding-right: 5px;
    padding-bottom: 2px;
    padding-left: 3px;
    font-size: 12px;
    font-weight: 400;
    color: v-bind('labelColor');
    background-color: v-bind('color');
    border-radius: 16px;
  }

  .status-icon {
    position: static;
    width: 18px;
    height: 18px;
  }

</style>
