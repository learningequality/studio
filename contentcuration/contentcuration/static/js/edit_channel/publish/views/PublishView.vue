<template>
  <div class="publish-view">
    <h1 :title="channel.name">
      {{ channel.name }}
    </h1>
    <p>
      <span v-if="language">
        {{ language.native_name }}
      </span>
      <span v-if="channel.version">
        {{ $tr('versionText', {version: channel.version}) }}
      </span>
      <span v-else>
        {{ $tr('unpublishedText') }}
      </span>
    </p>
    <hr>
    <div v-if="!validOnLoad" class="invalid-section">
      <label>{{ $tr('invalidHeader') }}</label>
      <ul>
        <li>
          <span v-if="saving" class="prompt-icon spinner"></span>
          <span v-else class="prompt-icon" :class="{valid: isValid, invalid: !isValid}">
            {{ (isValid)? 'check' : 'clear' }}
          </span>
          <span class="prompt">
            {{ $tr('languageRequired') }}
          </span>
          <LanguageDropdown :language="channel.language" @changed="setLanguage" />
        </li>
      </ul>
    </div>
    <div v-else class="valid-section">
      <span class="prompt prompt-ready">
        {{ $tr('validHeader') }}
      </span>
    </div>
  </div>
</template>


<script>

  import _ from 'underscore';
  import { mapActions, mapState } from 'vuex';
  import Constants from 'edit_channel/constants/index';

  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown.vue';

  export default {
    name: 'PublishView',
    $trs: {
      versionText: 'Current Version: {version}',
      languageRequired: 'Select a channel language',
      invalidHeader: 'Please resolve the following before publishing:',
      validHeader: 'Ready to publish!',
      submitLanguage: 'Set channel language',
      unpublishedText: 'Unpublished',
    },
    components: {
      LanguageDropdown,
    },
    data() {
      return {
        validOnLoad: true,
        saving: false,
      };
    },
    computed: {
      ...mapState('publish', ['channel']),
      isValid() {
        return Boolean(this.channel.language);
      },
      language() {
        return _.findWhere(Constants.Languages, { id: this.channel.language });
      },
    },
    mounted() {
      this.validOnLoad = this.isValid;
    },
    methods: {
      ...mapActions('publish', ['setChannelLanguage']),
      setLanguage(languageID) {
        this.saving = true;
        this.setChannelLanguage(languageID).then(() => {
          this.saving = false;
        });
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .publish-view {
    min-height: 200px;
    h1 {
      font-size: 15pt;
      font-weight: bold;
    }
    p {
      color: @gray-700;
      span:not(:first-child)::before {
        content: ' • ';
      }
    }

    .invalid-section {
      ul {
        padding: 0 10px;
        list-style: none;
        li {
          max-width: unset;

          .language-select {
            vertical-align: bottom;
          }
        }
      }
    }

    .prompt-icon {
      .material-icons;

      margin-right: 10px;
      color: @gray-500;
      vertical-align: text-bottom;
      &.valid {
        color: @green-success-color;
      }
      &.invalid {
        color: @red-error-color;
      }
    }

    .prompt {
      margin-right: 20px;
      font-size: 12pt;
      &.prompt-ready::before {
        .prompt-icon;

        color: @green-success-color;
        content: 'check_circle';
      }
    }

    .submit-language {
      .material-icons;

      padding-left: 5px;
      color: @green-success-color;
      cursor: pointer;
    }
  }

</style>
