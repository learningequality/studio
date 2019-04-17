<template>
  <div class="publish-items">
    <label v-if="!channel.has_changed" class="unchanged-label">
      {{ $tr('noChangesLabel') }}
    </label>
    <VBtn
      flat
      dark
      class="publish-button"
      :class="{disabled: !channel.has_changed}"
      :disabled="!channel.has_changed"
      @click.stop="toggleModal(true)"
    >
      {{ $tr('publishButton') }}
    </VBtn>
    <VDialog v-model="dialog" maxWidth="500px" attach="body">
      <VCard>
        <VCardText>
          <PublishView />
        </VCardText>
        <VCardActions>
          <VBtn
            flat
            dark
            class="cancel-text"
            @click="toggleModal(false)"
          >
            {{ $tr('cancelButton') }}
          </VBtn>
          <div>
            <span class="size-text">
              {{ $tr('publishingSizeText', {count: channelCount, size: sizeText}) }}
            </span>
            <VBtn
              flat
              dark
              class="publish-button"
              :class="{disabled: !channel.language}"
              :disabled="!channel.language"
              @click="publishChannel"
            >
              {{ $tr('publishButton') }}
            </VBtn>
          </div>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import PublishView from './PublishView.vue';
  import { format_size } from 'edit_channel/utils/string_helper';

  export default {
    name: 'PublishModal',
    $trs: {
      modalHeader: 'Publish Channel',
      cancelButton: 'CANCEL',
      publishButton: 'PUBLISH',
      noChangesLabel: 'No changes',
      loadingSize: 'Loading...',
      publishingSizeText: '{count, plural, =1 {# Resource} other {# Resources}} ({size})',
    },
    components: {
      PublishView,
    },
    data() {
      return {
        dialog: false,
        size: null,
      };
    },
    // TODO: add watch here for channelCount
    computed: {
      ...mapState('publish', ['channel']),
      ...mapGetters('publish', ['channelCount']),
      sizeText() {
        return this.size === null ? this.$tr('loadingSize') : format_size(this.size);
      },
    },
    methods: {
      ...mapActions('publish', ['publishChannel', 'setChannelLanguage', 'loadChannelSize']),
      ...mapMutations('publish', { reset: 'RESET_STATE' }),
      toggleModal(open) {
        this.dialog = open;
        if (!this.dialog) {
          this.reset();
        } else {
          this.loadChannelSize().then(size => {
            this.size = size;
          });
        }
      },
      handlePublish() {
        this.publishChannel();
        // handle_published: function() {
        //   var dialog = require('edit_channel/utils/dialog');
        //   this.set_publishing();
        //   var self = this;
        //   State.current_channel.fetch({
        //     success: function(channel) {
        //       var new_channel = new Models.ChannelCollection();
        //       new_channel.reset(channel.toJSON());
        //       $('#publish_id_text').val(State.current_channel.get('primary_token'));
        //       dialog.alert(
        //         self.get_translation('publish_in_progress'),
        //         self.get_translation('publishing_prompt')
        //       );
        //     },
        //   });
        // },
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  * {
    font-family: 'Noto Sans';
  }

  .unchanged-label {
    color: @gray-500;
  }

  .publish-button {
    .action-button;

    font-weight: bold;
    color: white;
  }

  .size-text {
    margin-right: 5px;
    font-size: 10pt;
    font-style: italic;
    color: @gray-500;
  }

  .cancel-text {
    .action-text;

    color: @blue-500 !important;
  }

  .v-card__actions {
    display: grid;
    grid-auto-flow: column;
    justify-content: space-between;
  }

  .publish-items {
    min-width: max-content;
  }

  /deep/ .v-dialog {
    cursor: default;
  }

</style>
