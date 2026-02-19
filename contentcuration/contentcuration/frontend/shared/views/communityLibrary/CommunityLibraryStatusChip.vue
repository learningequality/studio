<template>

  <Chip
    :icon="icon"
    :text="text"
    :backgroundColor="backgroundColor"
    :labelColor="labelColor"
    :borderColor="borderColor"
    :style="{ paddingLeft: '3px' }"
  />

</template>


<script setup>

  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { computed } from 'vue';
  import Chip from './Chip.vue';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { CommunityLibraryStatus } from 'shared/constants';

  const props = defineProps({
    status: {
      type: String,
      required: true,
      validator: value =>
        [
          CommunityLibraryStatus.APPROVED,
          CommunityLibraryStatus.PENDING,
          CommunityLibraryStatus.REJECTED,
        ].includes(value),
    },
  });

  const theme = themePalette();

  const { pendingStatus$, approvedStatus$, flaggedStatus$ } = communityChannelsStrings;

  const configChoices = {
    [CommunityLibraryStatus.PENDING]: {
      text: pendingStatus$(),
      backgroundColor: theme.yellow.v_100,
      labelColor: theme.orange.v_600,
      borderColor: theme.orange.v_400,
      icon: 'timer',
    },
    [CommunityLibraryStatus.APPROVED]: {
      text: approvedStatus$(),
      backgroundColor: theme.green.v_100,
      labelColor: theme.green.v_600,
      borderColor: theme.green.v_400,
      icon: 'circleCheckmark',
    },
    [CommunityLibraryStatus.REJECTED]: {
      text: flaggedStatus$(),
      backgroundColor: theme.red.v_100,
      labelColor: theme.red.v_600,
      borderColor: theme.red.v_400,
      icon: 'error',
    },
  };

  const icon = computed(() => configChoices[props.status].icon);
  const text = computed(() => configChoices[props.status].text);
  const backgroundColor = computed(() => configChoices[props.status].backgroundColor);
  const labelColor = computed(() => configChoices[props.status].labelColor);
  const borderColor = computed(() => configChoices[props.status].borderColor);

</script>
