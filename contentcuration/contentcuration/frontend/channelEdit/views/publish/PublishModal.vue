<template>

  <VDialog v-model="dialog" maxWidth="500px" lazy>
    <VCard class="pa-4">
      <h1 class="headline">
        {{ currentChannel.name }}
      </h1>
      <p v-if="loadingMetadata" class="pt-1">
        <VProgressCircular indeterminate size="16" color="grey lighten-1" />
      </p>
      <p v-else class="subheading grey--text body-2">
        <span v-if="language">
          {{ languageName }}
        </span>
        <span>
          {{ $tr('publishingSizeText', {count: node.resource_count}) }}
        </span>
        <span>
          {{ sizeText }}
        </span>
        <span v-if="currentChannel.version">
          {{ $tr('versionText', {version: currentChannel.version}) }}
        </span>
        <span v-else>
          {{ $tr('unpublishedText') }}
        </span>
      </p>
      <VDivider />
      <VWindow v-model="step">
        <VWindowItem :key="0">
          <p class="body-1 pt-4 font-weight-bold">
            {{ $tr('invalidHeader') }}
          </p>
          <VList>
            <VListTile>
              <VListTileContent>
                <VListTileTitle>
                  <Icon v-if="language" color="greenSuccess">
                    check
                  </Icon>
                  <Icon v-else color="red">
                    clear
                  </Icon>
                  <span class="ml-1">
                    {{ $tr('languageRequired') }}
                  </span>
                </VListTileTitle>
              </VListTileContent>
              <VListTileAction style="max-width: 150px;">
                <LanguageDropdown v-model="language" />
              </VListTileAction>
            </VListTile>
          </VList>
          <VCardActions class="pa-0 pt-4">
            <VBtn flat @click="close">
              {{ $tr('cancelButton') }}
            </VBtn>
            <VSpacer />
            <VBtn
              color="primary"
              :disabled="!isValid"
              @click="step++"
            >
              {{ $tr('nextButton') }}
            </VBtn>
          </VCardActions>
        </VWindowItem>
        <VWindowItem :key="1">
          <VForm ref="form" lazy-validation>
            <VCardText>
              <VTextarea
                v-model="publishDescription"
                :label="$tr('publishMessageLabel')"
                required
                :rules="descriptionRules"
                autoGrow
              >
                <template v-slot:append-outer>
                  <HelpTooltip :text="$tr('descriptionDescriptionTooltip')" bottom />
                </template>
              </VTextarea>
            </VCardText>
            <VCardActions class="pa-0 pt-4">
              <VBtn flat @click="back">
                {{ $tr('backButton') }}
              </VBtn>
              <VSpacer />
              <VBtn
                color="primary"
                @click="handlePublish"
              >
                {{ $tr('publishButton') }}
              </VBtn>
            </VCardActions>
          </VForm>
        </VWindowItem>
      </VWindow>
    </VCard>
  </VDialog>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import Constants from 'edit_channel/constants/index';
  import { fileSizeMixin } from 'shared/mixins';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown';
  import HelpTooltip from 'shared/views/HelpTooltip';

  export default {
    name: 'PublishModal',
    components: {
      LanguageDropdown,
      HelpTooltip,
    },
    mixins: [fileSizeMixin],
    props: {
      value: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        step: 0,
        publishDescription: 'woohoo',
        size: null,
        loadingMetadata: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel', 'rootId']),
      ...mapGetters('contentNode', ['getContentNode']),
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      node() {
        return this.getContentNode(this.rootId);
      },
      sizeText() {
        return this.formatFileSize(this.size);
      },
      language: {
        get() {
          return this.currentChannel.language;
        },
        set(language) {
          this.updateChannel({ id: this.currentChannel.id, language });
        },
      },
      languageName() {
        return Constants.Languages.find(lang => lang.id === this.language).native_name;
      },
      isValid() {
        // Determine if channel is valid here
        return this.language;
      },
      descriptionRules() {
        return [v => !!v.trim() || this.$tr('descriptionRequiredMessage')];
      },
    },
    mounted() {
      this.loadingMetadata = true;
      this.loadChannelSize(this.rootId).then(size => {
        this.size = size;
        this.loadingMetadata = false;
      });
    },
    methods: {
      ...mapActions('currentChannel', ['loadChannelSize', 'publishChannel']),
      ...mapActions('channel', ['updateChannel']),
      close() {
        this.publishDescription = '';
        this.dialog = false;
      },
      back() {
        this.$refs.form.resetValidation();
        this.step--;
      },
      handlePublish() {
        if (this.$refs.form.validate()) {
          this.publishChannel(this.publishDescription).then(this.close);
        }
      },
    },
    $trs: {
      versionText: 'Current Version: {version}',
      languageRequired: 'Select a channel language',
      invalidHeader: 'Please resolve any invalid fields before publishing:',
      unpublishedText: 'Unpublished',
      publishMessageLabel: "Describe what's new in this channel version",
      publishingSizeText: '{count, plural, =1 {# Resource} other {# Resources}}',
      cancelButton: 'Cancel',
      publishButton: 'Publish',
      nextButton: 'Next',
      backButton: 'Back',
      descriptionRequiredMessage: "Please describe what's new in this version before publishing",
      descriptionDescriptionTooltip:
        'This description will be shown to Kolibri admins before they update channel versions',
    },
  };

</script>


<style lang="less" scoped>

  .subheading span:not(:first-child)::before {
    content: ' • ';
  }

</style>
