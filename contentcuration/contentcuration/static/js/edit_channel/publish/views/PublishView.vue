<template>
  <VCard class="publish-view">
    <v-card-title primaryTitle>
      <div :title="channel.name" class="headline">
        {{ channel.name }}
      </div>
      <div class="subheading">
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
      </div>
    </v-card-title>
    <v-divider />
    <v-window v-model="step">
      <v-window-item :key="0">
        <VCardText>
          <div class="title">
            {{ $tr('invalidHeader') }}
          </div>
          <v-list>
            <v-list-tile>
              <v-list-tile-action>
                <v-progress-circular
                  v-if="savingLanguage"
                  indeterminate
                  color="primary"
                  size="20"
                />
                <v-icon v-else-if="languageIsValid" color="green">
                  check
                </v-icon>
                <v-icon v-else color="red">
                  clear
                </v-icon>
              </v-list-tile-action>

              <v-list-tile-content>
                <v-list-tile-title>
                  {{ $tr('languageRequired') }}
                </v-list-tile-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <LanguageDropdown :language="channel.language" @changed="setLanguage" />
              </v-list-tile-action>
            </v-list-tile>
          </v-list>
        </VCardText>
        <VCardActions>
          <VBtn
            flat
            dark
            color="primary"
            @click="$emit('cancel')"
          >
            {{ $tr('cancelButton') }}
          </VBtn>
          <v-spacer />
          <VBtn
            depressed
            color="primary"
            class="next-button"
            :disabled="!isValid"
            @click="step++"
          >
            {{ $tr('nextButton') }}
          </VBtn>
        </VCardActions>
      </v-window-item>
      <v-window-item :key="1">
        <VCardText>
          <VTextarea
            v-model="publishDescription"
            :label="$tr('publishMessageLabel')"
            autoGrow
          />
        </VCardText>
        <VCardActions>
          <VBtn
            flat
            dark
            color="primary"
            @click="step--"
          >
            {{ $tr('backButton') }}
          </VBtn>
          <v-spacer />
          <VBtn
            depressed
            dark
            color="primary"
            @click="handlePublish"
          >
            {{ $tr('publishButton') }}
          </VBtn>
        </VCardActions>
      </v-window-item>
    </v-window>
  </VCard>
</template>


<script>

  import _ from 'underscore';
  import { mapActions, mapState } from 'vuex';
  import Constants from 'edit_channel/constants/index';
  import { format_size } from 'edit_channel/utils/string_helper';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown.vue';

  export default {
    name: 'PublishView',
    $trs: {
      versionText: 'Current Version: {version}',
      languageRequired: 'Select a channel language',
      invalidHeader: 'Please resolve any invalid fields before publishing:',
      validHeader: 'Ready to publish!',
      submitLanguage: 'Set channel language',
      unpublishedText: 'Unpublished',
      publishMessageLabel: "Describe what's new in this channel version",
      publishingSizeText: '{count, plural, =1 {# Resource} other {# Resources}}',
      cancelButton: 'CANCEL',
      publishButton: 'PUBLISH',
      nextButton: 'Next',
      backButton: 'Back',
    },
    components: {
      LanguageDropdown,
    },
    data() {
      return {
        savingLanguage: false,
        step: 0,
        publishDescription: '',
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
        return this.size === null ? this.$tr('loadingSize') : format_size(this.size);
      },
      channelCount() {
        return this.channel.main_tree.metadata.resource_count;
      },
    },
    methods: {
      ...mapActions('publish', ['setChannelLanguage', 'publishChannel']),
      setLanguage(languageID) {
        this.savingLanguage = true;
        this.setChannelLanguage(languageID).then(() => {
          this.savingLanguage = false;
        });
      },
      handlePublish() {
        this.$emit('publish');
        this.publishChannel(this.publishDescription);
      },
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
