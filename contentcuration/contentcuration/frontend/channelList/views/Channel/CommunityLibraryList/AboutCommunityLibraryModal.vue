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
  } = communityChannelsStrings;

</script>
>
