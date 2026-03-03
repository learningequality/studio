<template>

  <Chip
    icon="allUsers"
    :text="communityLibraryLabel$()"
    :backgroundColor="$themePalette.grey.v_100"
    :labelColor="$themePalette.grey.v_800"
    :borderColor="$themePalette.grey.v_300"
  />

</template>


<script setup>

  import Chip from './Chip.vue';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  const { communityLibraryLabel$ } = communityChannelsStrings;

</script>
