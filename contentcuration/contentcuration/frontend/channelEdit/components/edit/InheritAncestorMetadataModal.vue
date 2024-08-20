<template>

  <KModal
    data-test="inheritable-metadata-dialog"
    :title="$tr('applyResourceDetailsTitle')"
    :submitText="$tr('continueAction')"
    :cancelText="$tr('cancelAction')"
    @submit="handleContinue"
    @cancel="close"
  >
    <div class="inherit-metadata-dialog">
      <p class="inherit-metadata-dialog__description">
        {{ $tr('inheritMetadataDescription') }}
      </p>
      <div class="inherit-metadata-dialog-checkboxes">
        <KCheckbox
          v-for="item in inheritableMetadataItems"
          :key="item.value"
          :label="generateLabel(item)"
        />
      </div>
      <div class="divider"></div>
      <KCheckbox
        :label="$tr('doNotShowThisAgain')"
      />
      <p>{{ $tr('doNotShowAgainDescription') }}</p>
    </div>
  </KModal>

</template>

<script>

  export default {
    name: 'InheritAncestorMetadataModal',
    props: {
      inheritableMetadataItems: {
        type: Object,
        required: true,
      },
    },
    methods: {
      handleContinue() {
        // TO DO apply metadata to the selected resources, or alternatively, just emit with event
        this.$emit('handleContinue');
      },
      generateLabel(item) {
        // TO DO generate label with all of the metadata le-consts, etc.
        return `${item}`;
      },
      close() {
        this.$emit('close');
      },
    },
    $trs: {
      applyResourceDetailsTitle: 'Apply resource details',
      /* eslint-disable kolibri/vue-no-unused-translations */
      applyResourceDetailsDescriptionUpload:
        'The folder `{folder}` has the following details. Select the details you want to apply to your upload.',
      applyResourceDetailsDescriptionImport:
        'The folder `{folder}` has the following details. Select the details you want to apply to the {resource, plural, one {resource}, other {resources}} you are importing.',
      applyResourceDetailsDescriptionMoving:
        'The folder `{folder}` has the following details. Select the details you want to apply to the {resource, plural, one {resource}, other {resources}} you are moving.',
      /* eslint-enable kolibri/vue-no-unused-translations */
      continueAction: 'Continue',
      cancelAction: 'Cancel',
      inheritMetadataDescription: 'Inherit metadata from the folder above',
      doNotShowThisAgain: "Don't ask me about this folder again",
      doNotShowAgainDescription:
        'All future additions to this folder will have the selected information by default',
    },
  };

</script>
