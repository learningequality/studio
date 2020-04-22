<template>

  <div>
    <h2>Basic Information</h2>
    <p>
      <span><b>Username</b></span>
      <span>LeKhang54</span>
    </p>
    <p>
      <span><b>Full name</b></span>
      <span>LeKhang54</span>
    </p>
    <p>
      <span><b>Password</b></span>
      <span>
        <KButton appearance="basic-link" text="Change password" @click="() => console.log('hi')" />
      </span>
    </p>

    <h2>API Token</h2>
    <p>You can use this code to LOREM IPSUM... do things..</p>
    <CopyToken token="urtoken-123" successText="YAY!" />

    <h2>Export account data</h2>
    <p>You will be sent an email with all information linked to your account</p>
    <KButton text="Export data" primary @click="() => console.log('to be implemented')" />

    <h2>Delete account</h2>
    <p>Completely remove your account from Kolibri Studio</p>
    <KButton text="Delete account" :appearanceOverrides="{ backgroundColor: this.$themeTokens.error, color: this.$themeTokens.textInverted }" @click="() => console.log('to be implemented')" />
  </div>

</template>


<script>

import CopyToken from '../../shared/views/CopyToken';

export default {
  name: "Account",
  components: { CopyToken },
}

</script>

<style scoped>

h1 {
  color: blue;
}

</style>
