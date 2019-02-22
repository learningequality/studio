<template>

  <div id="channel-preview-wrapper" :style="'background-image: url(' + this.channel.thumbnail_url + ')'">
    <div id="channel-details-overlay">
        <div id="channel-details-panel">
          <h2 id="channel-details-top-options">
            <ChannelStar :class="{invisible: isNew}" :key="channel.id + '_starDetails'" :channel="channel"/>
            <a class="material-icons" @click="closePanel">clear</a>
          </h2>

          <div id="channel-details-view-panel">
            <div id="channel-details">
                <div v-if="editing || isNew">
                  <ChannelEditor :key="channel.id + '_editor'"/>
                  <div class="buttons">
                    <a class="action-text" @click="handleCancelChanges">{{ $tr('cancel') }}</a>
                    <button
                      class="action-button"
                      :class="{'disabled': !isValid || saving}"
                      :disabled="!isValid || saving"
                      :title="saveButtonTitle"
                      @click="handleSaveChannel"
                    >{{ (isNew)? $tr('create') : $tr('save') }}</button>
                  </div>
                </div>

                <div v-else class="channel-details-top">
                  <img :alt="channel.name" :src="channel.thumbnail_url"/>
                  <div class="channel-section">
                    <div class="language-wrapper">
                      <div v-if="language">
                        <span class="material-icons">language</span>
                        {{language.native_name}}
                      </div>
                    </div>
                    <h3>{{channel.name}}</h3>
                    <p class="channel-text">
                      <span>{{ $tr('created', {'date': $formatDate(channel.created, {day:'numeric', month:'short', 'year':'numeric'})}) }}</span>
                      <span v-if="channel.published">{{ $tr('published', {'date': $formatDate(channel.last_published, {day:'numeric', month:'short', 'year':'numeric'})}) }}</span>
                    </p>
                    <hr>
                    <ToggleText :key="channel.id + 'Description'" :text="channel.description"/>
                    <br>
                    <a :href="channelUrl" id="open-channel">{{ $tr("openChannel") }}</a>
                    <a v-if="canEdit" id="edit-details" @click="editing = true">{{ $tr("editDetails") }}</a>

                    <!-- <div class="channel-download-wrapper">
                    <a class="action-text dropdown-toggle" data-toggle="dropdown">{{ $tr("downloadReport") }}</a>
                    <ul class="dropdown-menu dropdown-menu-right details-download-dropdown">
                        <li><a>{{ $tr("downloadCSV") }}</a></li>
                        <li><a>{{ $tr("downloadPDF") }}</a></li>
                        <li><a>{{ $tr("downloadDetailedPDF") }}</a></li>
                        <li><a>{{ $tr("downloadPPT") }}</a></li>
                    </ul>
                  </div> -->
                </div>
              </div>
              <div v-if="!isNew">
                <div v-if="loading" class="loading">
                  {{ $tr('loading') }}
                </div>
                <div v-show="!loading" ref="lookinside">
                  <!-- Channel details will be inserted here -->
                </div>
                <div v-if="canEdit" id="delete-section">
                  <h4>{{ $tr('deleteTitle') }}</h4>
                  <p>{{ $tr('deletePrompt') }}</p>
                  <a class="delete-channel" @click="handleDeleteChannel">{{ $tr('deleteChannel') }}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

import _ from 'underscore';
import State from 'edit_channel/state';
import { mapGetters, mapActions, mapMutations } from 'vuex';
import { dialog, alert } from 'edit_channel/utils/dialog';
import Constants from 'edit_channel/constants/index';
import ChannelStar from './ChannelStar.vue';
import ChannelEditor from './ChannelEditor.vue';
import ToggleText from './ToggleText.vue';
import { setChannelMixin } from './../mixins';

export default {
  name: 'ChannelDetailsPanel',
  $trs: {
    loading: "Loading details...",
    deleteTitle: "Delete this Channel",
    deletePrompt: "Once you delete a channel, the channel will be permanently deleted.",
    deleteChannel: "Delete channel",
    deletingChannel: "Deleting Channel...",
    deleteWarning: "All content under this channel will be deleted.\nAre you sure you want to delete this channel?",
    cancel: "Cancel",
    created: "Created {date}",
    published: "Last Published {date}",
    openChannel: "Open channel",
    editDetails: "Edit details",
    downloadReport: "Download Channel Report",
    downloadDetailedPDF: "Download Detailed PDF",
    downloadPDF: "Download PDF",
    downloadCSV: "Download CSV",
    downloadPPT: "Download PPT",
    create: "Create",
    save: "Save",
    invalidChannel: "Must fill out required fields",
    errorChannelSave: "Error Saving Channel",
    saving: "Saving..."
  },
  components: {
    ChannelStar,
    ChannelEditor,
    ToggleText
  },
  mixins: [setChannelMixin],
  data() {
    return {
      editing: false,
      loading: false,
      saving: false
    };
  },
  mounted() {
    this.loadDetails();
  },
  watch: {
    channel(newVal, oldVal) {
      if(newVal.id !== oldVal.id) {
        this.editing = false;
        _.defer(this.loadDetails);
      }
    }
  },
  computed: Object.assign(
    mapGetters('channel_list', {
      channel: 'activeChannel',
      changes: 'channelChanges'
    }),
    {
      isNew() {
        return !!!this.channel.id;
      },
      isValid() {
        return !!this.changes.name.length;
      },
      canEdit() {
        return !this.channel.ricecooker_version && _.contains(this.channel.editors, State.current_user.id);
      },
      channelUrl() {
        let isEditor = _.contains(this.channel.editors, State.current_user.id);
        return (isEditor)? window.Urls.channel(this.channel.id) : window.Urls.channel_view_only(this.channel.id);
      },
      language() {
        return Constants.Languages.find(language => language.id === this.channel.language);
      },
      saveButtonTitle() {
        if(!this.isValid)
          return this.$tr('invalidChannel');
        else if(this.saving)
          return this.$tr('saving');
        return "";
      }
    }
  ),
  methods: Object.assign(
    mapActions('channel_list', [
      'deleteChannel',
      'loadChannelDetailsView',
      'saveChannel'
    ]),
    mapMutations('channel_list', {
      cancelChanges: 'CANCEL_CHANNEL_CHANGES'
    }),
    {
      closePanel() {
        this.editing = false;
        this.setChannel(null);
      },
      handleSaveChannel() {
        this.saving = true;
        this.saveChannel().then((channel) => {
          this.editing = false;
          this.saving = false;
        }).catch( (error) => {
            alert(this.$tr('errorChannelSave'), error.responseText || error);
        });
      },
      handleCancelChanges() {
        if(this.isNew) {
          this.closePanel()
        } else {
          this.cancelChanges();
          this.editing = false;
        }
      },
      handleDeleteChannel() {
        dialog(this.$tr("deletingChannel"), this.$tr("deleteWarning"), {
            [this.$tr("cancel")]:() => { },
            [this.$tr("deleteChannel")]: () => {
                this.deleteChannel(this.channel);
                this.editing = false;
            },
        }, null);
      },
      loadDetails() {
        if(!this.isNew) {
          this.loading = true;
          this.loadChannelDetailsView(this.$refs.lookinside).then(() => {
            this.loading = false;
          });
        }
      }
    }
  )
};

</script>


<style lang="less">

@import '../../../../less/channel_list.less';

#channel-preview-wrapper {
  overflow: hidden;
  width: @channel-preview-width;
  margin-left: 2px;
  background-color: white;
  background-size:     cover;
  background-repeat:   no-repeat;
  background-position: center center;
  #channel-details-overlay {
    height: inherit;
    background-color: rgba(240,240,240, 0.8);
  }

  #channel-details-panel {
    margin: 0px auto;
    float: none;
    display: table-cell;
    vertical-align: top;
    height: 83vh;
    width: @channel-preview-width - 40px;
  }
  h2 {
    display: grid;
    grid-auto-flow: column;
    justify-content: space-between;
    padding-right: 12px;
    a {
      cursor: pointer;
      color: @gray-800;
      font-weight: bold;
      text-decoration: none;
    }
    .invisible {
      visibility: hidden;
    }
  }

  #channel-details-view-panel {
    height: inherit;
    #channel-details {
      display: block;
      overflow: hidden;
      overflow-y: auto;
      padding: 0px;
      min-height: 350px;
      background-color: rgba(256,256,256,0.8);
      height: inherit;
      padding-top: 15px;
      border: 2px solid @gray-500;
      position: relative;
      margin-bottom: 20px;

      .channel-details-top{
        .thumbnail-title-columns;
        padding: 0px 20px 40px 20px;
        img {
          width:130px;
          height:130px;
          object-fit: cover;
          border: 2px solid @gray-500;
          margin-top: 35px;
        }
        .channel-section {
          padding-left: 20px;
          .language-wrapper {
            font-size: 15pt;
            text-align: right;
            font-weight: bold;
            min-height: 25px;
            span {
              color: @blue-200;
              vertical-align: top;
              font-size: 20pt;
              margin-right: 5px;
            }
          }
          h3 {
            margin: 5px 0px;
            font-weight: bold;
          }
          .channel-text {
            color: @gray-700;
            span:not(:last-child)::after {
              content: '  •  ';
            }
          }
          #open-channel {
            .action-button;
            padding: 5px 25px;
            margin-right: 15px;
            text-transform: uppercase;
          }
          #edit-details {
            .action-text;
            text-transform: uppercase;
          }
        }
      }
      .buttons {
        display: grid;
        grid-auto-flow: column;
        justify-content: space-between;
        margin-left: @channel-thumbnail-size;
        margin-bottom: 20px;
        padding: 0px 20px;
        a, button {
          text-transform: uppercase;
        }
      }
      hr {
        border-color: @gray-300;
      }
    }
  }

  .loading {
    border: 2px solid @blue-200;
    background-color: white;
    color: @gray-500;
    text-align: center;
    font-style: italic;
    font-size: 20pt;
    padding: 100px 0px;
    font-weight: bold;
  }

  .tab-content {
    border-left: none;
    border-right: none;
  }

  #delete-section {
    margin-top: 30px;
    padding: 5px 30px 35px 30px;
    h4 {
      font-size: 10pt;
      color: @gray-800;
      margin: 2px 0px;
      font-weight: bold;
    }
    p {
      margin-top: 5px;
      margin-bottom: 20px;
    }
    a {
      color: @delete-color;
      font-weight: bold;
      text-transform: uppercase;
    }
  }
}

</style>

  .channel-download-wrapper {
    margin-top: 30px;
      margin-bottom: -25px;
      padding: 0px;
      font-size: 10pt;
      text-align: right;
  }
  .details-download-dropdown {
    width: max-content;
  }
  .download_option {
    padding: 5px 10px;
    cursor: pointer;
    &:hover {
      background-color: @gray-200;
    }
  }
