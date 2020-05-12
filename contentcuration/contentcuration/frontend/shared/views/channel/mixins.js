import { mapActions } from 'vuex';
import Papa from 'papaparse';
import sortBy from 'lodash/sortBy';
import { createTranslator } from 'shared/i18n/utils';
import { fileSizeMixin, constantsTranslationMixin } from 'shared/mixins';

const exportStrings = createTranslator('ChannelExportStrings', {
  id: 'Channel id',
  name: 'Name',
  description: 'Description',
  language: 'Language',
  token: 'Token',
  size: 'Size',
  storage: 'Storage',
  resources: 'Resources',
  languages: 'Included languages',
  subtitles: 'Subtitles',
  coachContent: 'Coach content',
  assessments: 'Assessments',
  tags: 'Tags',
  authors: 'Authors',
  providers: 'Providers',
  aggregators: 'Aggregators',
  licenses: 'Licenses',
  copyrightHolders: 'Copyright holders',
  yes: 'Yes',
  no: 'No',
  kindCount: '{kind} ({count})',
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
    _generateDownload(content, extension) {
      let blob = new Blob([content]);
      let downloadButton = document.createElement('a');
      downloadButton.href = window.URL.createObjectURL(blob, {
        type: exportExtensionMap[extension],
      });
      downloadButton.target = '_blank';
      let now = new Date();
      let filename = this.exportStrings.$tr('downloadFilename', {
        year: now.getFullYear(),
        month: now.toLocaleString('default', { month: 'long' }),
      });
      downloadButton.download = `${filename}.${extension}`;
      downloadButton.click();
    },
    downloadChannelsCSV(query) {
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
      ];

      return this.getChannelListDetails(query).then(channelList => {
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
            sortBy(channel.kind_count, 'kind_id').map(kind =>
              this.exportStrings.$tr('kindCount', {
                kind: this.translateConstant(kind.kind_id),
                count: this.$formatNumber(kind.count),
              })
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
          ]),
        });

        this._generateDownload(csv, 'csv');
        return csv;
      });
    },
  },
};
