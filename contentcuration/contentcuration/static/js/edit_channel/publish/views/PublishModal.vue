<template>
  <VApp>
    <VDialog v-model="dialog" maxWidth="530px" attach="body">
      <template v-slot:activator="{ on }">
        <VBtn flat dark class="publish-button" v-on="on">
          {{ $tr('publishButton') }}
        </VBtn>
      </template>
      <VCard>
        <VCardText>
          <!-- <v-container grid-list-md> -->
          <PublishView />
          <!-- </v-container> -->
        </VCardText>
        <VCardActions>
          <VBtn
            flat
            dark
            class="cancel-text"
            @click="dialog = false"
          >
            {{ $tr('cancelButton') }}
          </VBtn>

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
        </VCardActions>
      </VCard>
    </VDialog>
  </VApp>
</template>

<script>

  import { mapActions, mapMutations, mapState } from 'vuex';
  import PublishView from './PublishView.vue';

  export default {
    name: 'PublishModal',
    $trs: {
      modalHeader: 'Publish Channel',
      cancelButton: 'CANCEL',
      publishButton: 'PUBLISH',
    },
    components: {
      PublishView,
    },
    data() {
      return {
        dialog: false,
      };
    },
    computed: mapState('publish', ['channel']),
    methods: {
      ...mapActions('publish', ['publishChannel', 'setChannelLanguage']),
      ...mapMutations('publish', { reset: 'RESET_STATE' }),
      toggleModal(open) {
        this.dialog = open;
        if (!this.dialog) {
          this.reset();
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

  .publish-button {
    .action-button;

    margin-right: 40px;
    font-weight: bold;
    color: white;
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

  /deep/ .v-dialog {
    cursor: default;
  }

  /deep/ .application--wrap {
    min-height: 0;
  }

  /deep/ .v-overlay {
    width: 100vw;
  }

</style>
