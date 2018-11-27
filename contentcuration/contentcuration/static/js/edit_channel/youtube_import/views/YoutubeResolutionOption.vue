<template>
  <li class="ListItem">
    <input
      type="checkbox"
      @change="handleCheckboxChange"
      :checked="isChecked"
      :id="resolution.resolution"
    >
    </input>
    <label
      :class="{ selected: isChecked }"
      :title="resolution.resolution"
      :for="resolution.resolution"
    >
      {{ resolution.resolution }}
      <b class="size">{{size}}</b>
    </label>
  </li>
</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import stringHelper from '../../utils/string_helper';
  import { PageTypes, ImportStatus } from '../constants';

  export default {
    name: 'YoutubeResolutionOption',
    props: {
      resolution: {
        type: Object,
        required: true,
      }
    },
    data() {
      return {
        isChecked: false,
      }
    },
    computed: Object.assign(
      {
        size() {
          return `${stringHelper.format_size(this.resolution.size)}`;
        }
      }
    ),
    methods: Object.assign(
      mapActions('youtube_import', [
        'addResolution',
        'removeResolution',
      ]),
      {
        startDownload() {
          console.log("DOWNLOADING!")
          // this.submitYoutubeURL({url: this.youtubeUrl, onSuccess: this.goToConfirm});
        },
        handleCheckboxChange() {
          this.isChecked = !this.isChecked;
          if (this.isChecked) {
            this.addResolution(this.resolution);
          } else {
            this.removeResolution(this.resolution);
          }
        }
      }
    )
  }

</script>


<style lang="less" scoped>
  @import "../../../../less/global-variables.less";
  input[type="checkbox"], label {
    font-weight: normal;
    cursor: pointer;
  }
  .size {
    margin-left: 5px;
    color: @gray-500;
    font-size: 11pt;
    vertical-align: text-bottom;
  }

</style>
