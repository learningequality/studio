<template>
  <!-- TODO: Remove bootstrap -->
  <div class="btn-group channel-download-wrapper">
    <a class="download-toggle dropdown-toggle" data-toggle="dropdown">
      {{ $tr("downloadReport") }}
    </a>
    <ul class="dropdown-menu dropdown-menu-right">
      <li>
        <a @click="downloadDetails('csv')">
          {{ $tr("downloadCSV") }}
        </a>
      </li>
      <li>
        <a @click="downloadDetails('pdf')">
          {{ $tr("downloadPDF") }}
        </a>
      </li>
      <li>
        <a @click="downloadDetails('detailedPdf')">
          {{ $tr("downloadDetailedPDF") }}
        </a>
      </li>
      <li>
        <a @click="downloadDetails('ppt')">
          {{ $tr("downloadPPT") }}
        </a>
      </li>
    </ul>
  </div>
</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import { alert } from 'edit_channel/utils/dialog';

  export default {
    name: 'ChannelDownloadDropdown',
    $trs: {
      downloadReport: 'Download Channel Report',
      downloadDetailedPDF: 'Download Detailed PDF',
      downloadPDF: 'Download PDF',
      downloadCSV: 'Download CSV',
      downloadPPT: 'Download PPT',
      downloadStartedHeader: 'Download Started',
      downloadStartedTextPDF:
        'Generating a PDF for {channelName}. Download will start automatically.',
      downloadStartedTextPPT:
        'Generating a PPT for {channelName}. Download will start automatically.',
      downloadStartedTextCSV:
        'Generating a CSV for {channelName}. Download will start automatically.',
      downloadFailedHeader: 'Download Failed',
      downloadFailedTextPDF: 'Failed to download a PDF for {channelName}',
      downloadFailedTextPPT: 'Failed to download a PPT for {channelName}',
      downloadFailedTextCSV: 'Failed to download a CSV for {channelName}',
    },
    computed: mapState('channel_list', {
      channel: 'activeChannel',
    }),
    methods: {
      ...mapActions('channel_list', ['downloadChannelDetails']),
      downloadDetails(format) {
        let formatString = '';
        let errorString = '';
        let msgArgs = { channelName: this.channel.name };
        switch (format) {
          case 'ppt':
            formatString = this.$tr('downloadStartedTextPPT', msgArgs);
            errorString = this.$tr('downloadFailedTextPPT', msgArgs);
            break;
          case 'csv':
            formatString = this.$tr('downloadStartedTextCSV', msgArgs);
            errorString = this.$tr('downloadFailedTextCSV', msgArgs);
            break;
          default:
            formatString = this.$tr('downloadStartedTextPDF', msgArgs);
            errorString = this.$tr('downloadFailedTextPDF', msgArgs);
        }

        alert(this.$tr('downloadStartedHeader'), formatString);
        this.downloadChannelDetails({ format: format, id: this.channel.id }).catch(error => {
          console.error(error); // eslint-disable-line no-console
          alert(this.$tr('downloadFailedHeader'), errorString);
        });
      },
    },
  };

</script>


<style lang="less">

  @import '../../../../less/channel_list.less';

  .channel-download-wrapper {
    .download-toggle {
      .action-text;

      padding: 5px;
    }
    .dropdown-menu a {
      padding: 5px 10px;
      &:hover {
        background-color: @gray-200;
      }
    }
  }

</style>
