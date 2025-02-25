import Vue from 'vue';
import { mapActions } from 'vuex';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import sortBy from 'lodash/sortBy';
import ChannelCatalogPrint from './ChannelCatalogPrint';
import { createTranslator } from 'shared/i18n';
import { fileSizeMixin, constantsTranslationMixin } from 'shared/mixins';

const PrintClass = Vue.extend(ChannelCatalogPrint);

const exportStrings = createTranslator('ChannelExportStrings', {
  id: 'Channel ID',
  name: 'Name',
  description: 'Description',
  language: 'Language',
  token: 'Token',
  size: 'Total resources',
  storage: 'Storage',
  resources: 'Resources',
  languages: 'Included languages',
  subtitles: 'Captions or subtitles',
  coachContent: 'Resources for coaches',
  assessments: 'Assessments',
  tags: 'Tags',
  authors: 'Authors',
  providers: 'Providers',
  aggregators: 'Aggregators',
  licenses: 'Licenses',
  copyrightHolders: 'Copyright holders',
  containsContentFrom: 'Contains content from',
  yes: 'Yes',
  no: 'No',
  downloadFilename: '{year}_{month}_Kolibri_Content_Library',
});

const exportExtensionMap = {
  csv: 'text/csv',
  pdf: 'application/pdf',
};

export const channelExportMixin = {
  computed: {
    exportStrings() {
      return exportStrings;
    },
  },
  mixins: [fileSizeMixin, constantsTranslationMixin],
  methods: {
    ...mapActions('channel', ['getChannelListDetails']),
    _generateFilename(extension, channels = []) {
      if (channels.length === 1) {
        return `${channels[0].name}.${extension}`;
      }

      const now = new Date();
      const filename = `${now.getFullYear()}_${now.toLocaleString('default', {
        month: 'long',
      })}_Kolibri_Content_Library`;
      return `${filename}.${extension}`;
    },

    // All generate methods expect a particular data format, that is
    // either an object or an array of objects, in both cases,
    // the object is composed of data that is a the result of assigning
    // the data from the channel details endpoint to the data from the regular
    // channels endpoint.
    async generateChannelsPDF(channelList) {
      if (channelList.length === 0) {
        return;
      }
      const printComponent = new PrintClass({
        propsData: {
          channelList,
        },
      });
      printComponent.$mount();
      document.body.appendChild(printComponent.$el);
      await printComponent.savePDF(this._generateFilename('pdf', channelList));
      document.body.removeChild(printComponent.$el);
      printComponent.$destroy();
    },
    generateChannelsCSV(channelList) {
      const headers = [
        this.exportStrings.$tr('id'),
        this.exportStrings.$tr('name'),
        this.exportStrings.$tr('description'),
        this.exportStrings.$tr('language'),
        this.exportStrings.$tr('token'),
        this.exportStrings.$tr('size'),
        this.exportStrings.$tr('storage'),
        this.exportStrings.$tr('resources'),
        this.exportStrings.$tr('languages'),
        this.exportStrings.$tr('subtitles'),
        this.exportStrings.$tr('coachContent'),
        this.exportStrings.$tr('assessments'),
        this.exportStrings.$tr('tags'),
        this.exportStrings.$tr('authors'),
        this.exportStrings.$tr('providers'),
        this.exportStrings.$tr('aggregators'),
        this.exportStrings.$tr('licenses'),
        this.exportStrings.$tr('copyrightHolders'),
        this.exportStrings.$tr('containsContentFrom'),
      ];
      const csv = Papa.unparse({
        fields: headers,
        data: channelList.map(channel => [
          channel.id,
          channel.name,
          channel.description,
          this.translateLanguage(channel.language),
          channel.primary_token
            ? `${channel.primary_token.slice(0, 5)}-${channel.primary_token.slice(5, 10)}`
            : '',
          this.$formatNumber(channel.resource_count),
          this.formatFileSize(channel.resource_size),
          sortBy(channel.kind_count, 'kind_id').map(
            kind => `${this.translateConstant(kind.kind_id)} (${this.$formatNumber(kind.count)})`,
          ),
          channel.languages,
          channel.accessible_languages,
          this.exportStrings.$tr(channel.includes.coach_content ? 'yes' : 'no'),
          this.exportStrings.$tr(channel.includes.exercises ? 'yes' : 'no'),
          sortBy(channel.tags, 'count').map(t => t.tag_name),
          channel.authors,
          channel.providers,
          channel.aggregators,
          channel.licenses,
          channel.copyright_holders,
          channel.original_channels ? channel.original_channels.map(ch => ch.name).join(', ') : '',
        ]),
      });
      const blob = new Blob([csv], {
        type: exportExtensionMap['csv'],
      });
      saveAs(blob, this._generateFilename('csv', channelList));
      return csv;
    },
    downloadChannelsCSV(query) {
      return this.getChannelListDetails(query).then(this.generateChannelsCSV);
    },
    downloadChannelsPDF(query) {
      return this.getChannelListDetails(query).then(this.generateChannelsPDF);
    },
  },
};
