<template>

  <KModal
    :title="aboutCommunityLibraryTitle$()"
    :cancelText="gotItLabel$()"
    @cancel="$emit('close')"
  >
    <p>{{ aboutCommunityLibraryDescription$() }}</p>
    <strong>{{ whatCanYouDoHere$() }}</strong>
    <ul>
      <li>{{ whatCanYouDoHereItem1$() }}</li>
      <li>{{ whatCanYouDoHereItem2$() }}</li>
      <li>{{ whatCanYouDoHereItem3$() }}</li>
    </ul>
    <p
      :style="{
        color: $themeTokens.error,
        marginTop: '16px',
      }"
    >
      {{ needKolibriVersionToImport$() }}
    </p>
  </KModal>

</template>


<script setup>

  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  const {
    aboutCommunityLibraryTitle$,
    aboutCommunityLibraryDescription$,
    whatCanYouDoHere$,
    whatCanYouDoHereItem1$,
    whatCanYouDoHereItem2$,
    whatCanYouDoHereItem3$,
    gotItLabel$,
    needKolibriVersionToImport$,
  } = communityChannelsStrings;

</script>
