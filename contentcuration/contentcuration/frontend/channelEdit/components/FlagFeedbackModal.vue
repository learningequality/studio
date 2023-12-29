<template>

  <KModal
    :title="$tr('flagFeedBackModalTitle')"
    :submitText="$tr('flagSubmitButtonLabel')"
    :cancelText="$tr('flagCancelButtonLabel')"
    :submitDisabled="isSubmitDisabled"
    @cancel="modalShowing = false"
    @submit="handleSubmit"
    @dblclick.native.capture.stop
  >
    <VList>
      <VListTile @click.stop>
        <VListTileAction>
          <VCheckbox v-model="reportViolent" color="primary" />
        </VListTileAction>
        <VListTileContent @click="reportViolent = !reportViolent">
          <VListTileTitle>{{ $tr('reportViolentTitle') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>

      <VListTile @click.stop>
        <VListTileAction>
          <VCheckbox v-model="reportHateful" color="primary" />
        </VListTileAction>
        <VListTileContent @click="reportHateful = !reportHateful">
          <VListTileTitle>{{ $tr('reportHatefulTitle') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>

      <VListTile @click.stop>
        <VListTileAction>
          <VCheckbox v-model="reportHarmful" color="primary" />
        </VListTileAction>
        <VListTileContent @click="reportHarmful = !reportHarmful">
          <VListTileTitle>{{ $tr('reportHarmfulTitle') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>

      <VListTile @click.stop>
        <VListTileAction>
          <VCheckbox v-model="reportSpam" color="primary" />
        </VListTileAction>
        <VListTileContent @click="reportSpam = !reportSpam">
          <VListTileTitle>{{ $tr('reportSpamTitle') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>

      <VListTile @click.stop>
        <VListTileAction>
          <VCheckbox v-model="reportSexual" color="primary" />
        </VListTileAction>
        <VListTileContent @click="reportSexual = !reportSexual">
          <VListTileTitle>{{ $tr('reportSexualTitle') }}</VListTileTitle>
        </VListTileContent>
      </VListTile>
    </VList>
  </KModal>

</template>

<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'FlagFeedbackModal',
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        reportViolent: false,
        reportHateful: false,
        reportHarmful: false,
        reportSpam: false,
        reportSexual: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode']),
      targetContentNode() {
        return this.getContentNode(this.nodeId);
      },
      modalShowing: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      reportList() {
        return [
          this.reportViolent,
          this.reportHateful,
          this.reportHarmful,
          this.reportSpam,
          this.reportSexual,
        ];
      },
      isSubmitDisabled() {
        const anyOneCheckboxTick = this.reportList.some(report => report === true);
        return !anyOneCheckboxTick; // if any one checkbox is tick, enable submit.
      },
    },
    methods: {
      handleSubmit() {
        /* NOTE: This is just a placeholder method. It will be implemented after
        feedbackApiUtils PR is merged. */
        console.log(`Node with title "${this.targetContentNode.title}" is flagged!`);
      },
    },
    $trs: {
      flagFeedBackModalTitle: 'Flag content',
      reportViolentTitle: 'Violent or repulsive content',
      reportHatefulTitle: 'Hateful or abusive content',
      reportHarmfulTitle: 'Harmful or dangerous acts',
      reportSpamTitle: 'Spam or misleading',
      reportSexualTitle: 'Sexual Content',
      flagCancelButtonLabel: 'Cancel',
      flagSubmitButtonLabel: 'Flag',
    },
  };

</script>
