<template>

  <VDialog
    v-model="open"
    :disabled="disabled"
    attach="body"
    maxWidth="400"
    v-bind="$attrs"
  >
    <VCard>
      <VContainer>
        <VCardTitle v-if="title">
          <p class="mb-0 title">
            <b>{{ title }}</b>
          </p>
          <p v-if="text" class="mb-0 mt-2 subheading">
            {{ text }}
          </p>
        </VCardTitle>
        <VCardText>
          <slot></slot>
        </VCardText>
        <VCardActions>
          <slot name="actions"></slot>
        </VCardActions>
      </VContainer>
    </VCard>
  </VDialog>

</template>

<script>

  import Vue from 'vue';

  const modalTracker = Vue.observable({
    open: false,
    name: '',
    uid: null,
  });

  export default {
    name: 'PrimaryDialog',
    props: {
      // Indicates whether the instantiator of this
      // modal thinks that the modal should be open, but
      // makes no guarantees.
      value: {
        type: Boolean,
        required: true,
      },
      title: {
        type: String,
        default: '',
      },
      text: {
        type: String,
        required: false,
      },
    },
    computed: {
      disabled() {
        return modalTracker.open && modalTracker.uid !== this._uid;
      },
      open: {
        get() {
          return this.value;
        },
        set(open) {
          this.$emit('input', open);
        },
      },
    },
    watch: {
      open(newVal) {
        this.registerOpen(newVal);
      },
    },
    created() {
      this.registerOpen(this.open);
    },
    beforeDestroy() {
      // Before we tear down this component
      // run the check should open logic to reset modalTracker state
      // in case this was already open.
      this.registerOpen(false);
    },
    methods: {
      registerOpen(openProp) {
        const name = this.$parent.$options.name;
        if (!openProp && modalTracker.uid === this._uid && modalTracker.open) {
          modalTracker.open = false;
          modalTracker.name = '';
          modalTracker.uid = null;
        } else if (openProp && modalTracker.open) {
          // eslint-disable-next-line no-console
          console.error(
            `${name} tried to open the primary modal, but it is in use by: ${modalTracker.name} component.`
          );
          this.open = false;
        } else if (openProp && !modalTracker.open) {
          modalTracker.open = true;
          modalTracker.name = name;
          modalTracker.uid = this._uid;
        }
      },
    },
  };

</script>


<style lang="less" scoped></style>
