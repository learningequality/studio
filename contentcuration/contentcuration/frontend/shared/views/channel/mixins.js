import { mapActions } from 'vuex';
import Papa from 'papaparse';
import sortBy from 'lodash/sortBy';
import { createTranslator } from 'utils/i18n';
import Constants from 'edit_channel/constants/index';
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
});

function getLanguage(language) {
  language = Constants.Languages.find(l => l.id === language);
  return language ? language.native_name : '';
}

export const channelExportMixin = {
  computed: {
    exportStrings() {
      return exportStrings;
    },
  },
  mixins: [fileSizeMixin, constantsTranslationMixin],
  methods: {
    ...mapActions('channel', ['getChannelListDetails']),
    downloadChannelsCSV(query) {
      const headers = [
        this.exportStrings('id'),
        this.exportStrings('name'),
        this.exportStrings('description'),
        this.exportStrings('language'),
        this.exportStrings('token'),
        this.exportStrings('size'),
        this.exportStrings('storage'),
        this.exportStrings('resources'),
        this.exportStrings('languages'),
        this.exportStrings('subtitles'),
        this.exportStrings('coachContent'),
        this.exportStrings('assessments'),
        this.exportStrings('tags'),
        this.exportStrings('authors'),
        this.exportStrings('providers'),
        this.exportStrings('aggregators'),
        this.exportStrings('licenses'),
        this.exportStrings('copyrightHolders'),
      ];

      return this.getChannelListDetails(query).then(channelList => {
        let csv = Papa.unparse({
          fields: headers,
          data: channelList.map(channel => [
            channel.id,
            channel.name,
            channel.description,
            getLanguage(channel.language),
            channel.primary_token
              ? `${channel.primary_token.slice(0, 5)}-${channel.primary_token.slice(5, 10)}`
              : '',
            this.$formatNumber(channel.resource_count),
            this.formatFileSize(channel.resource_size),
            sortBy(channel.kind_count, 'kind_id')
              .map(kind =>
                this.exportStrings('kindCount')
                  .replace('{kind}', this.translateConstant(kind.kind_id))
                  .replace('{count}', this.$formatNumber(kind.count))
              )
              .join(' • '),
            channel.languages.join(' • '),
            channel.accessible_languages.join(' • '),
            this.exportStrings(channel.includes.coach_content ? 'yes' : 'no'),
            this.exportStrings(channel.includes.exercises ? 'yes' : 'no'),
            sortBy(channel.tags, 'count')
              .map(t => t.tag_name)
              .join(' • '),
            channel.authors.join(' • '),
            channel.providers.join(' • '),
            channel.aggregators.join(' • '),
            channel.licenses.join(' • '),
            channel.copyright_holders.join(' • '),
          ]),
        });
        return csv;
      });
    },
  },
};
