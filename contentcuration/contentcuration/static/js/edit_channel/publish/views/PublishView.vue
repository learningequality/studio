<template>
  <VCard class="publish-view">
    <VCardText>
      <h1 class="headline">
        {{ channel.name }}
      </h1>
      <p class="subheading">
        <span v-if="language">
          {{ language.native_name }}
        </span>
        <span>
          {{ $tr('publishingSizeText', {count: channelCount}) }}
        </span>
        <span>
          {{ sizeText }}
        </span>
        <span v-if="channel.version">
          {{ $tr('versionText', {version: channel.version}) }}
        </span>
        <span v-else>
          {{ $tr('unpublishedText') }}
        </span>
      </p>
    </VCardText>
    <VDivider />
    <VWindow v-model="step">
      <VWindowItem :key="0">
        <VCardText>
          <div class="title">
            {{ $tr('invalidHeader') }}
          </div>
          <VList>
            <VListTile>
              <VListTileAction>
                <VProgressCircular
                  v-if="savingLanguage"
                  indeterminate
                  color="primary"
                  size="20"
                />
                <VIcon v-else-if="languageIsValid" color="green">
                  check
                </VIcon>
                <VIcon v-else color="red">
                  clear
                </VIcon>
              </VListTileAction>

              <VListTileContent>
                <VListTileTitle>
                  {{ $tr('languageRequired') }}
                </VListTileTitle>
              </VListTileContent>
              <VListTileAction>
                <LanguageDropdown :language="channel.language" @changed="setLanguage" />
              </VListTileAction>
            </VListTile>
          </VList>
        </VCardText>
        <VCardActions>
          <VBtn
            ref="cancelbutton"
            flat
            dark
            color="primary"
            @click="$emit('cancel')"
          >
            {{ $tr('cancelButton') }}
          </VBtn>
          <VSpacer />
          <VBtn
            ref="nextbutton"
            depressed
            color="primary"
            class="next-button"
            :disabled="!isValid || savingLanguage"
            @click="step++"
          >
            {{ $tr('nextButton') }}
          </VBtn>
        </VCardActions>
      </VWindowItem>
      <VWindowItem :key="1">
        <VForm ref="form" v-model="valid">
          <VCardText>
            <VTextarea
              v-model="publishDescription"
              :label="$tr('publishMessageLabel')"
              required
              :rules="descriptionRules"
              autoGrow
            >
              <template v-slot:append-outer>
                <VTooltip top maxWidth="200">
                  <template v-slot:activator="{ on }">
                    <VIcon color="primary" v-on="on">
                      help_outline
                    </VIcon>
                  </template>
                  <span>{{ $tr('descriptionDescriptionTooltip') }}</span>
                </VTooltip>
              </template>
            </VTextarea>
          </VCardText>
          <VCardActions>
            <VBtn
              ref="backbutton"
              flat
              dark
              color="primary"
              lazyValidation
              @click="step--"
            >
              {{ $tr('backButton') }}
            </VBtn>
            <VSpacer />
            <VBtn
              ref="publishbutton"
              depressed
              dark
              color="primary"
              class="publish-button"
              @click="handlePublish"
            >
              {{ $tr('publishButton') }}
            </VBtn>
          </VCardActions>
        </VForm>
      </VWindowItem>
    </VWindow>
  </VCard>
</template>


<script>

  import _ from 'underscore';
  import { mapActions, mapState } from 'vuex';
  import Constants from 'edit_channel/constants/index';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown.vue';

  const KB = parseFloat(1024);
  const MB = parseFloat(Math.pow(KB, 2));
  const GB = parseFloat(Math.pow(KB, 3));
  const TB = parseFloat(Math.pow(KB, 4));

  export default {
    name: 'PublishView',
    components: {
      LanguageDropdown,
    },
    data() {
      return {
        savingLanguage: false,
        step: 0,
        publishDescription: '',
        size: null,
        valid: true,
      };
    },
    computed: {
      ...mapState('publish', ['channel']),
      isValid() {
        // Add more validation checks here
        return this.languageIsValid;
      },
      languageIsValid() {
        return Boolean(this.channel.language);
      },
      language() {
        return _.findWhere(Constants.Languages, { id: this.channel.language });
      },
      sizeText() {
        if (this.size === null) return this.$tr('loadingSize');
        let size = Number(this.size);
        size = Math.abs(size);

        if (size < KB) {
          return this.$tr('unitBytes', { size: Math.round(size).toString() });
        } else if (KB <= size && size < MB) {
          return this.$tr('unitKilobytes', { size: Math.round(parseFloat(size / KB)) });
        } else if (MB <= size && size < GB) {
          return this.$tr('unitMegabytes', { size: Math.round(parseFloat(size / MB)) });
        } else if (GB <= size && size < TB) {
          return this.$tr('unitGigabytes', { size: Math.round(parseFloat(size / GB)) });
        } else {
          return this.$tr('unitTerabytes', { size: Math.round(parseFloat(size / TB)) });
        }
      },
      channelCount() {
        return this.channel.main_tree.metadata.resource_count;
      },
      descriptionRules() {
        return [v => !!v || this.$tr('descriptionRequiredMessage')];
      },
    },
    mounted() {
      this.loadChannelSize().then(size => {
        this.size = size;
      });
    },
    methods: {
      ...mapActions('publish', ['setChannelLanguage', 'publishChannel', 'loadChannelSize']),
      setLanguage(languageID) {
        this.savingLanguage = true;
        this.setChannelLanguage(languageID).then(() => {
          this.savingLanguage = false;
        });
      },
      handlePublish() {
        if (this.$refs.form.validate()) {
          this.$emit('publish');
          this.publishChannel(this.publishDescription);
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
      cancelButton: 'CANCEL',
      publishButton: 'PUBLISH',
      nextButton: 'Next',
      backButton: 'Back',
      loadingSize: 'Calculating size...',
      unitBytes: '{size}B',
      unitKilobytes: '{size}KB',
      unitMegabytes: '{size}MB',
      unitGigabytes: '{size}GB',
      unitTerabytes: '{size}TB',
      descriptionRequiredMessage: "Please describe what's new in this version before publishing",
      descriptionDescriptionTooltip:
        'This description will be shown to Kolibri admins before they update channel versions',
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .publish-view {
    min-height: 200px;

    .headline,
    .title,
    .subheading {
      font-family: @font-family !important;
    }

    .title {
      margin-bottom: 10px;
      font-weight: bold;
    }

    .subheading {
      color: @gray-700;
      span:not(:first-child)::before {
        content: ' • ';
      }
    }
    .v-btn {
      font-weight: bold;
    }
  }

</style>
