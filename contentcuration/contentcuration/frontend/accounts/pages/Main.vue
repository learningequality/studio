<template>

  <div class="wrapper">
    <div class="inner-box">
      <h2>Main page</h2>
      <p>Login form</p>
      <button style="border: 1px solid black; padding: 8px">
        Log in
      </button>
      <br>
      <br>
      <hr>
      <br>
      <p>
        <router-link to="create">
          Create account
        </router-link>
      </p>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'Main',
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
    background-color: gray;
  }

  .inner-box {
    max-width: 300px;
    padding: 32px;
    background-color: white;
    border-radius: 4px;
  }

</style>
