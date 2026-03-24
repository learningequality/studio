<template>

  <!-- At the time of writing, the KLabeledIcon component does not set
  the color of the label properly (issue #1102). When this is fixed, setting
  color on the button component should no longer be needed. -->
  <button
    class="community-library-status-button"
    :title="tooltip"
    @click="$emit('click')"
  >
    <KLabeledIcon
      :icon="icon"
      iconAfter="dropdown"
      :color="labelColor"
      :label="text"
    />
  </button>

</template>


<script>

  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { computed, defineComponent } from 'vue';
  import { CommunityLibraryStatus } from 'shared/constants';

  export default defineComponent({
    name: 'ChannelCommunityLibraryStatusButton',
    setup(props) {
      const theme = themePalette();

      const configChoices = {
        [CommunityLibraryStatus.PENDING]: {
          text: 'Submitted',
          tooltip: 'Submission awaiting review',
          color: theme.yellow.v_100,
          darkColor: theme.yellow.v_200,
          labelColor: theme.orange.v_600,
          icon: 'schedule',
        },
        [CommunityLibraryStatus.APPROVED]: {
          text: 'Approved',
          tooltip: 'Live in Community Library',
          color: theme.green.v_100,
          darkColor: theme.green.v_200,
          labelColor: theme.green.v_600,
          icon: 'circleCheckmark',
        },
        [CommunityLibraryStatus.REJECTED]: {
          text: 'Flagged',
          tooltip: 'Review flagged submission',
          color: theme.red.v_100,
          darkColor: theme.red.v_200,
          labelColor: theme.red.v_600,
          icon: 'error',
        },
      };

      // NOTE: Having the whole config object as a computed property and
      // then accessing its elements breaks tests (possibly because of quirks
      // of how vue-jest and vue-template-compiler handle computed properties
      // defined using the composition API).
      // Therefore, we define the individual attributes as separate
      // computed properties as a workaround.
      const text = computed(() => configChoices[props.status].text);
      const tooltip = computed(() => configChoices[props.status].tooltip);
      const color = computed(() => configChoices[props.status].color);
      const darkColor = computed(() => configChoices[props.status].darkColor);
      const labelColor = computed(() => configChoices[props.status].labelColor);
      const icon = computed(() => configChoices[props.status].icon);

      return {
        text,
        tooltip,
        color,
        darkColor,
        labelColor,
        icon,
      };
    },
    // NOTE: Values of props declared in the setup method using `declareProps` cannot
    // be checked in tests, so we declare them using the options API for better testability.
    props: {
      status: {
        type: String,
        required: true,
        validator: value =>
          [
            CommunityLibraryStatus.PENDING,
            CommunityLibraryStatus.APPROVED,
            CommunityLibraryStatus.REJECTED,
          ].includes(value),
      },
    },
  });

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .community-library-status-button {
    @extend %md-standard-func;

    width: 9em;
    padding: 4px;
    color: v-bind('labelColor');
    background-color: v-bind('color');
    border-radius: 16px;
    transition: background-color $core-time;
  }

  .community-library-status-button:hover {
    background-color: v-bind('darkColor');
  }

</style>
