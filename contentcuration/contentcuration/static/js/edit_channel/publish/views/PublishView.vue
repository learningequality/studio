<template>
  <VCard class="publish-view">
    <VCardTitle primaryTitle>
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
    </VCardTitle>
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
            :disabled="!isValid"
            @click="step++"
          >
            {{ $tr('nextButton') }}
          </VBtn>
        </VCardActions>
      </VWindowItem>
      <VWindowItem :key="1">
        <VCardText>
          <VTextarea
            v-model="publishDescription"
            :label="$tr('publishMessageLabel')"
            autoGrow
          />
        </VCardText>
        <VCardActions>
          <VBtn
            ref="backbutton"
            flat
            dark
            color="primary"
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
            @click="handlePublish"
          >
            {{ $tr('publishButton') }}
          </VBtn>
        </VCardActions>
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
      loadingSize: 'Calculating size...',
      unitBytes: '{size}B',
      unitKilobytes: '{size}KB',
      unitMegabytes: '{size}MB',
      unitGigabytes: '{size}GB',
      unitTerabytes: '{size}TB',
      negunitBytes: '{size}B',
      negunitKilobytes: '{size}KB',
      negunitMegabytes: '{size}MB',
      negunitGigabytes: '{size}GB',
      negunitTerabytes: '{size}TB',
    },
    components: {
      LanguageDropdown,
    },
    data() {
      return {
        savingLanguage: false,
        step: 0,
        publishDescription: '',
        size: null,
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
        let prefix = size < 0 ? 'neg' : '';
        size = Math.abs(size);

        if (size < KB) {
          return this.$tr(prefix + 'unitBytes', { size: Math.round(size) });
        } else if (KB <= size && size < MB) {
          return this.$tr(prefix + 'unitKilobytes', { size: Math.round(parseFloat(size / KB)) });
        } else if (MB <= size && size < GB) {
          return this.$tr(prefix + 'unitMegabytes', { size: Math.round(parseFloat(size / MB)) });
        } else if (GB <= size && size < TB) {
          return this.$tr(prefix + 'unitGigabytes', { size: Math.round(parseFloat(size / GB)) });
        } else {
          return this.$tr(prefix + 'unitTerabytes', { size: Math.round(parseFloat(size / TB)) });
        }
      },
      channelCount() {
        return this.channel.main_tree.metadata.resource_count;
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
