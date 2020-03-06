<template>

  <div class="wrapper">
    <div class="inner-box">
      <h2>Main page</h2>
      <p>...</p>
      <br>
      <p>
        <VBtn primary @click="submit">
          Sign in
        </VBtn>
      </p>
      <p>
        <router-link :to="{name: 'ForgotPassword' }">
          Forgot your password?
        </router-link>
      </p>
      <p>
        <router-link :to="{name: 'Create'}">
          Create an account
        </router-link>
      </p>
      <br>
      <hr>
      <br>
      <p>
        <a href="/channels">
          Explore without account
        </a>
      </p>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'Main',
    methods: {
      submit() {
        // sign in
      },
    },
  };

</script>


<style lang="less" scoped>

  .wrapper {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    // TODO: replace with design system color;
    background-color: #5f3b5c;
  }

  .inner-box {
    width: 300px;
    max-width: 300px;
    padding: 32px;
    background-color: white;
    border-radius: 4px;

    // TODO: replace elevtion 16 drop shadow with design system definition
    box-shadow: 0 8px 10px -5px rgba(0, 0, 0, 0.2), 0 16px 24px 2px rgba(0, 0, 0, 0.14),
      0 6px 30px 5px rgba(0, 0, 0, 0.12);
  }

</style>
