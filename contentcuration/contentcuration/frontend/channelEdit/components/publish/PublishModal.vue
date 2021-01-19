<template>

  <VDialog v-model="dialog" maxWidth="500px" lazy>
    <VCard class="pa-4">
      <h1 class="headline">
        {{ currentChannel.name }}
      </h1>
      <p v-if="loadingMetadata" class="pt-1">
        <VProgressCircular indeterminate size="16" color="grey lighten-1" />
      </p>
      <p v-else class="body-2 grey--text metadata pt-1">
        <span>
          {{ languageName }}
        </span>
        <span>
          {{ $tr('publishingSizeText', { count: node.resource_count }) }}
        </span>
        <span>
          {{ formatFileSize(size) }}
        </span>
        <span v-if="currentChannel.version">
          {{ $tr('versionText', { version: currentChannel.version }) }}
        </span>
        <span v-else>
          {{ $tr('unpublishedText') }}
        </span>
      </p>
      <VWindow v-model="step">
        <VWindowItem :key="0">
          <p class="subheading">
            <Icon color="amber">
              warning
            </Icon>
            <span class="mx-2">
              {{ $tr('incompleteCount', { count: node.error_count }) }}
            </span>
          </p>
          <p class="subheading">
            {{ $tr('incompleteWarning') }}
          </p>
          <p class="subheading">
            {{ $tr('incompleteInstructions') }}
          </p>
          <VCardActions class="pa-0 pt-4">
            <VSpacer />
            <VBtn flat data-test="cancel" @click="close">
              {{ $tr('cancelButton') }}
            </VBtn>
            <VBtn
              color="primary"
              data-test="next"
              @click="step++"
            >
              {{ $tr('nextButton') }}
            </VBtn>
          </VCardActions>
        </VWindowItem>
        <VWindowItem :key="1">
          <VForm ref="form" lazy-validation>
            <VCardText class="px-0">
              <p class="subheading">
                {{ $tr('publishMessageLabel') }}
              </p>
              <VTextarea
                v-model="publishDescription"
                :label="$tr('versionDescriptionLabel')"
                required
                :rules="descriptionRules"
                autoGrow
                box
              >
                <template #append-outer>
                  <HelpTooltip :text="$tr('descriptionDescriptionTooltip')" bottom />
                </template>
              </VTextarea>
            </VCardText>
            <VCardActions class="pa-0 pt-4">
              <VSpacer />
              <VBtn flat data-test="back" @click="close">
                {{ $tr('cancelButton') }}
              </VBtn>
              <VBtn
                color="primary"
                data-test="publish"
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
  import Languages from 'shared/leUtils/Languages';
  import { fileSizeMixin } from 'shared/mixins';
  import HelpTooltip from 'shared/views/HelpTooltip';
  import { forceServerSync } from 'shared/data/serverSync';

  export default {
    name: 'PublishModal',
    components: {
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
        publishDescription: '',
        size: 0,
        loadingMetadata: false,
      };
    },
    computed: {
      ...mapGetters(['areAllChangesSaved']),
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
      languageName() {
        return Languages.get(this.currentChannel.language).native_name;
      },
      descriptionRules() {
        return [v => !!v.trim() || this.$tr('descriptionRequiredMessage')];
      },
    },
    beforeMount() {
      // Proceed to description if no incomplete nodes found
      if (!this.node.error_count) {
        this.step++;
      }
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
      close() {
        this.publishDescription = '';
        this.dialog = false;
      },
      async handlePublish() {
        if (this.$refs.form.validate()) {
          if (!this.areAllChangesSaved) {
            await forceServerSync();
          }

          this.publishChannel(this.publishDescription).then(this.close);
        }
      },
    },
    $trs: {
      // Headers
      versionText: 'Current Version: {version}',
      unpublishedText: 'Unpublished',
      publishingSizeText: '{count, plural, =1 {# resource} other {# resources}}',

      // Incomplete channel window
      incompleteCount: '{count, plural, =1 {# incomplete resource} other {# incomplete resources}}',
      incompleteWarning:
        'Incomplete resources will not be published and made available for download in Kolibri.',
      incompleteInstructions: "Click 'Continue' to confirm that you would like to publish anyway.",
      nextButton: 'Continue',

      // Description + publish
      publishMessageLabel: "Describe what's new in this channel version",
      versionDescriptionLabel: 'Version description',
      descriptionRequiredMessage: "Please describe what's new in this version before publishing",
      descriptionDescriptionTooltip:
        'This description will be shown to Kolibri admins before they update channel versions',
      cancelButton: 'Cancel',
      publishButton: 'Publish',
    },
  };

</script>


<style lang="less" scoped>

  .metadata span:not(:first-child)::before {
    content: ' • ';
  }

</style>
