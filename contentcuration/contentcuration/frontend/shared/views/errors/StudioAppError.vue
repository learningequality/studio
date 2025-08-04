<template>

  <div class="studio-app-error">
    <h1>
      <slot name="header"></slot>
    </h1>
    <p class="details">
      <slot name="details"></slot>
    </p>
    <div>
      <slot name="actions"></slot>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'StudioAppError',
  };

</script>


<style lang="scss" scoped>

.studio-app-error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 50vh;
  text-align: center;
  padding: 0 1rem;
}

.details {
  max-width: 675px;
  margin: 1rem 0;
}

</style>