<template>
  <div class="publish-view">
    <h4 :title="channel.name">
      {{ channel.name }}
    </h4>
    <p>
      <span>{{ $tr('topicCountText', {count: topicCount}) }}</span>
      <span>{{ $tr('resourceCountText', {count: resourceCount}) }}</span>
      <span v-if="channel.language">
        {{ channel.language }}
      </span>
      <span v-if="channel.version">
        {{ $tr('versionText', {version: channel.version}) }}
      </span>
    </p>
    <hr>
    <div v-if="!isValid" class="invalid-section">
      <label>{{ $tr('invalidHeader') }}</label>
      <ul>
        <li>
          <span class="prompt">
            {{ $tr('languageRequired') }}
          </span>
          <LanguageDropdown :language="channel.language" @changed="setChannelLanguage" />
          <span
            v-if="updatedLanguage"
            :title="$tr('submitLanguage')"
            class="submit-language"
            @click="submitLanguage"
          >
            check
          </span>
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

  import { mapActions, mapState } from 'vuex';

  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown.vue';

  export default {
    name: 'PublishView',
    $trs: {
      topicCountText: '{count, plural, =1 {# Topic} other {# Topics}}',
      resourceCountText: '{count, plural, =1 {# Resource} other {# Resources}}',
      versionText: 'Current Version: {version}',
      languageRequired: 'Channel language is required',
      invalidHeader: 'Please resolve the following before publishing:',
      validHeader: 'Ready to publish!',
      submitLanguage: 'Set channel language',
    },
    components: {
      LanguageDropdown,
    },
    computed: {
      ...mapState('publish', ['channel']),
      isValid() {
        return Boolean(this.channel.language);
      },
      resourceCount() {
        return this.channel.main_tree.metadata.resource_count;
      },
      topicCount() {
        return this.channel.main_tree.metadata.total_count - this.resourceCount;
      },
    },
    mounted() {
      // console.log(this.channel);
    },
    methods: {
      ...mapActions('publish', ['']),
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .publish-view {
    min-height: 200px;
    h4 {
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

    .prompt {
      margin-right: 20px;
      font-size: 12pt;
      &::before {
        .material-icons;

        margin-right: 10px;
        color: @red-error-color;
        vertical-align: text-bottom;
        content: 'clear';
      }
      &.prompt-ready::before {
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
