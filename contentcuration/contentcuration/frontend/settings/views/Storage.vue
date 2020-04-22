<template>

  <div>
    <p>
      <h2>10% storage used</h2>
      <KLinearLoader :progress="10" type="determinate" />
    </p>

    <p v-for="i in [1,2,3,4,5]" :key="i">
      <span style="background-color:blue; padding: 8px">
        <KIcon icon="video" :color="$themeTokens.textInverted" />
      </span>
      <span>Videos</span>
      <span>54.55 GB</span>
    </p>

    <p>
      <h2>Request more space</h2>
      <p>
        <span>Kindly use this form to request additional uploading storage for your Kolibri Studio account. If you import content from our public library in your channels, this content does not count towards your storage limit. <KButton appearance="basic-link" style="display: inline;" text="Learn more how to import content from other channels Hide form" @click="() => console.log('toimplement')" /></span>
      </p>
      <KButton appearance="basic-link" text="Hide form" @click="() => console.log('toimplement')" />
    </p>
  </div>

</template>


<script>

export default {
  name: 'Storage',
}

</script>


<style>

</style>
