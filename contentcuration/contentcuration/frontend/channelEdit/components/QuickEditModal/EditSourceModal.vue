<template>

  <div>
    <KModal
      v-if="!isAboutLicensesModalOpen"
      :title="$tr('editAttribution')"
      :submitText="$tr('saveAction')"
      :cancelText="$tr('cancelAction')"
      data-test="edit-title-description-modal"
      @submit="handleSave"
      @cancel="close"
    >
      <div class="input-container">
        <KTextbox
          v-model="author"
          autofocus
          data-test="author-input"
          :maxlength="200"
          :label="$tr('authorLabel')"
        />
        <HelpTooltip :text="$tr('authorToolTip')" top :small="false" />
      </div>
      <div class="input-container">
        <KTextbox
          v-model="provider"
          autofocus
          data-test="provider-input"
          :maxlength="200"
          :label="$tr('providerLabel')"
        />
        <HelpTooltip :text="$tr('providerToolTip')" top :small="false" />
      </div>
      <div class="input-container">
        <KTextbox
          v-model="aggregator"
          autofocus
          data-test="aggregator-input"
          :maxlength="200"
          :label="$tr('aggregatorLabel')"
        />
        <HelpTooltip :text="$tr('aggregatorToolTip')" top :small="false" />
      </div>
      <LicenseDropdown box/>
      <div class="input-container">
        <KTextbox
          v-model="copyrightHolder"
          autofocus
          data-test="copyright-holder-input"
          showInvalidText
          :maxlength="200"
          :label="$tr('copyrightHolderLabel')"
          :invalid="!!copyrightHolderError"
          :invalidText="copyrightHolderError"
          @input="copyrightHolderError = ''"
          @blur="() => {}"
        />
      </div>
    </KModal>
  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import LicenseDropdown from 'shared/views/LicenseDropdown';
  import { getTitleValidators, getInvalidText } from 'shared/utils/validation';

  export default {
    name: 'EditTitleDescriptionModal',
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    components: {
      HelpTooltip,
      LicenseDropdown,
    },
    data() {
      return {
        author: '',
        provider: '',
        aggregator: '',
        license: '',
        licenseDescription: '',
        copyrightHolder: '',
        licenseError: '',
        licenseDescriptionError: '',
        copyrightHolderError: '',
      };
    },
    computed: {
      ...mapGetters(['isAboutLicensesModalOpen']),
      ...mapGetters('contentNode', ['getContentNodes']),
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
    },
    created() {
      this.title = this.contentNode.title || '';
      this.description = this.contentNode.description || '';
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      validateTitle() {
        this.titleError = getInvalidText(getTitleValidators(), this.title);
      },
      close() {
        this.$emit('close');
      },
      async handleSave() {
        this.validateTitle();
        if (this.titleError) {
          return;
        }

        const { nodeId, title, description } = this;
        await this.updateContentNode({
          id: nodeId,
          title: title.trim(),
          description: description.trim(),
        });

        this.$store.dispatch('showSnackbarSimple', this.$tr('editedAttribution', { count: this.nodes.length }));
        this.close();
      },
    },
    $trs: {
      editAttribution: 'Edit Attribution',
      authorLabel: 'Author',
      authorToolTip: 'Person or organization who created this content',
      providerLabel: 'Provider',
      providerToolTip: 'Organization that commissioned or is distributing the content',
      aggregatorLabel: 'Aggregator',
      aggregatorToolTip:
        'Website or org hosting the content collection but not necessarily the creator or copyright holder',
      copyrightHolderLabel: 'Copyright holder',
      cannotEditPublic: 'Cannot edit for public channel resources',
      editOnlyLocal: 'Edits will be reflected only for local resources',
      mixedLabel: 'Mixed',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      editedAttribution: 'Edited attribution for {count, number, integer} {count, plural, one {resource} other {resources}}',
    },
  };

</script>

<style lang="scss" scoped>

  .input-container {
    display: flex;
    align-items: flex-start;
    &:not(:last-of-type) {
      margin-bottom: 10px;
    }
    & > div {
      width: 100%;
    }
    /deep/ .v-icon {
      margin: 14px 0 0 8px;
      position: absolute;
      right: 36px;
    }
    /deep/ input {
      padding-right: 40px;
    }
  }

</style>