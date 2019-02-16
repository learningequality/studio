<template>

  <div id="channel-preview-wrapper">
    <div id="channel-details-overlay">
        <div id="channel-details-panel">
          <h2 id="channel-details-top-options">
            <ChannelStar :key="channel.id + '_starDetails'" :channel="channel"/>
            <a class="material-icons">clear</a>
          </h2>

          <div id="channel-details-view-panel">
            <div id="channel-details" class="container-fluid">
              <div class="row" id="channel-details-area">
                  <!-- Channel editor will be inserted here -->
              </div>
              <br><br>
              <div v-if="!isNew" id="look-inside">
                <div class="default-item">{{$tr('loading')}}</div>
              </div>
              <div v-if="!isNew && canEdit" id="delete-section">
                <h4>{{ $tr('deleteTitle') }}</h4>
                <p>{{ $tr('deletePrompt') }}</p>
                <a class="delete-channel">{{ $tr('deleteChannel') }}</a>
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
import { mapGetters, mapActions } from 'vuex';
import ChannelStar from './ChannelStar.vue';

export default {
  name: 'ChannelDetailsPanel',
  $trs: {
    loading: "Loading details...",
    deleteTitle: "Delete this Channel",
    deletePrompt: "Once you delete a channel, the channel will be permanently deleted.",
    deleteChannel: "Delete channel"
  },
  components: {
    ChannelStar,
  },
  // mounted() {
  //   // this.loadChannelList(this.listType).then(() => {
  //   //   this.loading = false;
  //   // });
  // },
  computed: Object.assign(
    mapGetters('channel_list', {
      channel: 'activeChannel'
    }),

  //   {
  //     listChannels() {
  //       return _.where(this.channels, {[this.listType]: true});
  //     }
  //   }
  // ),
  // methods: Object.assign(
  //   mapActions('channel_list', [
  //     'loadChannelList'
  //   ])
    {
      isNew() {
        return !!!this.channel.id;
      },
      canEdit() {
        return !this.channel.ricecooker_version && _.contains(this.channel.editors, State.current_user.id);
      }
    }
  ),
};

</script>


<style lang="less" scoped>

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

    }
  }

  #delete-section {
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



#channel_details{
  #channel_details_area {
    width: 100%;
      margin-left: 10px;
    .column {
      display: table-column;
      &.profile {
        padding-top: 30px;
      }
      .description {
        min-height: 25px;
        word-wrap: break-word;
      }
    }
    .cancel { padding-left: 0px; }
    #submit { margin-right: 10px; }
  }

  #channel_error{ display:none; }
  .image_dropzone{ width: 120px; }
  .profile { padding: 0px; }
  .new_channel_pic{
    .image_dropzone{ width: auto; }
  }
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
  img{
      width:130px;
      height:130px;
      object-fit: cover;
  }
  .channel_pic {
    border: 2px solid @gray-500;
    min-height: 130px;
  }

  h4, .title {
    font-size: 10pt;
    color: @gray-800;
    margin: 2px 0px;
    font-weight: bold;
  }
  h3 {
    margin-bottom: 5px;
    margin-top: 0px;
    font-weight: bold;
  }

  .channel_text {
    color: @gray-700;
  }
  .identifier_label {
    padding: 0;
    padding-top: 5px;
  }
  .language_wrapper {
    min-height: 25px;
    b { font-size: 15pt; }
    i {
      color: @blue-200;
      vertical-align: top;
      font-size: 20pt;
      margin-right: 5px;
    }
  }

  input[type="text"] {
    margin-bottom: 20px;
  }

  input[type="text"], textarea {
    padding: 2px 0;
    font-size: @larger-body-text;
    width:100%;
    .input-form;
    &.copy-id-text {
      display: inline-block;
        padding: 2px;
        background-color: @gray-200;
        border: none;
        font-weight: bold;
        color: @gray-500;
        margin-bottom: 5px;
        width: 225px;
        font-size: 10pt;
    }
  }
  .copy-id-btn{
    padding:3px;
    font-size: 16pt;
    vertical-align: sub;
    cursor: pointer;
    color: @gray-500;
    &:hover { color:@blue-500; }
  }
  textarea{
    resize:none;
    height:auto;
    margin-bottom: 15px;
  }

  .details_view {
    display: none;
  }
  #look-inside { border-bottom: 2px solid @blue-200; }


  .required{
    margin-left:5px;
    color:@red-error-color;
    span{
      font-style:italic;
      font-size: 8pt;
    }
  }

  .tab-content {
    border: none;
    border-top: 2px solid @blue-200;
  }
  #open-button {
    padding: 5px 25px;
  }
  .download_option {
    padding: 5px 10px;
    cursor: pointer;
    &:hover {
      background-color: @gray-200;
    }
  }
  .toggle_description {
    color: @gray-700 !important;
    &:hover { color: @blue-500 !important; }
  }
  .empty_default {
    padding: 100px 0px;
      margin-top: 0px;
    &.loading { border-top: 2px solid @blue-200; }
  }
  hr {
    border-color: @gray-300;
  }
}

#channel_details_bottom {
  height: 40px;
  padding: 0px;
  padding-top: 5px;
  width: 100%;
  a {
    border-width: 2px !important;
    width: inherit;
    padding: 5px;
      font-size: 14pt;
      margin-top: 3px;
  }
}
