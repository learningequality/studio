<template>
  <!-- TODO: Remove bootstrap -->
  <div class="btn-group channel-download-wrapper">
    <a class="download-toggle dropdown-toggle" data-toggle="dropdown">
      {{ $tr("downloadReport") }}
    </a>
    <ul class="dropdown-menu dropdown-menu-right">
      <li>
        <a :href="csv" download>
          {{ $tr("downloadCSV") }}
        </a>
      </li>
      <li>
        <a :href="condensedPdf" download>
          {{ $tr("downloadPDF") }}
        </a>
      </li>
      <li>
        <a :href="detailedPdf" download>
          {{ $tr("downloadDetailedPDF") }}
        </a>
      </li>
      <li>
        <a :href="ppt" download>
          {{ $tr("downloadPPT") }}
        </a>
      </li>
    </ul>
  </div>
</template>


<script>

  import { mapState } from 'vuex';

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
    props: {
      channelId: {
        type: String,
        required: true,
      },
    },
    computed: {
      csv() {
        return window.Urls.get_channel_details_csv_endpoint(this.channelId);
      },
      detailedPdf() {
        return window.Urls.get_channel_details_pdf_endpoint(this.channelId);
      },
      condensedPdf() {
        return window.Urls.get_channel_details_pdf_endpoint(this.channelId) + '?condensed=true';
      },
      ppt() {
        return window.Urls.get_channel_details_ppt_endpoint(this.channelId);
      },
    },
  };

</script>


<style lang="less">

  @import '../../../../static/less/channel_list.less';

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
