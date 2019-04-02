var _ = require('underscore');
var BaseViews = require('edit_channel/views');
var stringHelper = require('edit_channel/utils/string_helper');
require('details.less');
var d3Helper = require('edit_channel/utils/d3_helper');
const State = require('edit_channel/state');
const Constants = require('edit_channel/constants/index');

var NAMESPACE = 'details';
var MESSAGES = {
  author: 'This channel features resources created by',
  aggregator: 'Material in this channel was originally hosted at',
  provider: 'The material in this channel was provided by',
  empty_details: 'This channel is empty',
  topic_author: 'This topic features resources created by',
  topic_aggregator: 'Material in this topic was originally hosted at',
  topic_provider: 'The material in this topic was provided by',
  topic_empty_details: 'This topic is empty',
  no_license: 'No license selected',
  author_description: 'Person or organization who created the content',
  aggregator_description:
    'Website or org hosting the content collection but not necessarily the creator or copyright holder',
  provider_description: 'Organization that commissioned or is distributing the content',
  license: '{count, plural,\n =1 {License}\n other {Licenses}}',
  copyright_holder: '{count, plural,\n =1 {Copyright Holder}\n other {Copyright Holders}}',
  auth_info: 'Authoring Information',
  metadata_info: 'Content Metadata',
  summary_info: 'Summary',
  total_resources: '# of Resources',
  resource_size: 'Size',
  storage: 'Storage',
  visibility_breakdown: 'Visibility',
  content_breakdown: 'Content Summary',
  languages: 'Languages',
  tags: 'Content Tags',
  resource_count: '{count, plural,\n =1 {# Resource}\n other {# Resources}}',
  visibility_count:
    '{count, plural,\n =1 {# resource is}\n other {# resources are}} visible to {user}',
  kind_count: '{count, plural,\n =1 {# {kind}}\n other {# {kind_plural}}}',
  role_description: 'Coach content is visible to coaches only in Kolibri',
  sample_pathway: 'Sample Pathway',
  channel_id: 'Channel ID',
  channel_tokens: '{count, plural,\n =1 {Channel Token}\n other {Channel Tokens}}',
  copy: 'Copy',
  copy_text: 'Copy the following into Kolibri to import this channel',
  total_resource_count: '{data, plural,\n =1 {Total Resource}\n other {Total Resources}}',
  invalid_channel: 'Cannot save invalid channel',
  original_channels: 'Includes Content From',
  whats_inside: "What's Inside",
  source: 'Source',
  topic: 'topic',
  using_channel: 'Using this Channel',
  very_small: 'Very Small',
  small: 'Small',
  average: 'Average',
  large: 'Large',
  very_large: 'Very Large',
  includes: 'Includes',
  coach_content: 'Coach Content',
  assessments: 'Assessments',
  accessible_languages: 'Subtitles',
  instructor_resources: 'For Educators',
  recommended: '(Recommended)',
  preview: 'Preview',
  more: 'Show More',
  less: 'Show Less',
  original_content: 'Original Content',
  details_tooltip: '{kind} ({percent}%)',
};

const CHANNEL_SIZE_DIVISOR = 100000000;

var SCALE_TEXT = [
  'very_small',
  'very_small',
  'small',
  'small',
  'average',
  'average',
  'average',
  'large',
  'large',
  'very_large',
  'very_large',
];

var DetailsView = BaseViews.BaseListEditableItemView.extend({
  template: require('./hbtemplates/details_view.handlebars'),
  tooltip_template: require('./hbtemplates/details_tooltip.handlebars'),
  name: NAMESPACE,
  $trs: MESSAGES,
  initialize: function(options) {
    _.bindAll(this, 'render_visuals');
    this.channel = options.channel;
    var channel_maintree_id = this.channel.main_tree.id || this.channel.main_tree;
    this.is_channel = _.isEqual(channel_maintree_id, this.model.id);
    State.current_channel_editor_cid = this.cid;
    this.render();
  },
  events: {
    'click .btn-tab': 'set_tab',
    'click .toggle-list': 'set_toggle_text',
    'click .copy-id-btn': 'copy_id',
  },
  render: function() {
    var self = this;
    var original_channels = _.map(this.model.get('metadata').original_channels, function(item) {
      return item.id === self.channel.id
        ? { id: item.id, name: self.get_translation('original_content'), count: item.count }
        : item;
    });
    this.$el.html(
      this.template(
        {
          details: this.model.get('metadata'),
          resource_count: this.model.get('metadata').resource_count,
          original_channels: original_channels,
          is_channel: this.is_channel,
          license_count: this.model.get('metadata').licenses.length,
          copyright_holder_count: this.model.get('metadata').copyright_holders.length,
          token_count:
            this.channel && this.channel.secret_tokens ? this.channel.secret_tokens.length : 0,
          channel: this.channel,
          size_bar: this.get_size_bar(this.model.get('metadata').resource_size),
          count_bar: this.get_count_bar(this.model.get('metadata').resource_count),
          authors: this.get_split_list(this.model.get('metadata').authors),
          aggregators: this.get_split_list(this.model.get('metadata').aggregators),
          providers: this.get_split_list(this.model.get('metadata').providers),
          languages: this.get_split_list(this.model.get('metadata').languages),
          accessible_languages: this.get_split_list(
            this.model.get('metadata').accessible_languages
          ),
        },
        {
          data: this.get_intl_data(),
        }
      )
    );
    this.$('[data-toggle="tooltip"]').tooltip();
    _.defer(this.render_visuals, 500);
  },
  render_visuals: function() {
    if (this.cid === State.current_channel_editor_cid) {
      // Render visualizations with tags/kind counts
      this.render_breakdown();
      this.render_tagcloud();
    }
  },
  render_tagcloud: function() {
    new d3Helper.TagCloud('#tagcloud', this.model.get('metadata').tags, {
      key: 'tag_name',
      value_key: 'count',
    });
  },
  render_breakdown: function() {
    var self = this;
    var total = this.model.get('metadata').resource_count;
    var data = _.map(this.model.get('metadata').kind_count, function(k) {
      return {
        kind_id: k.kind_id,
        percent: ((k.count / total) * 100).toFixed(1),
        count: k.count,
      };
    });

    var color_key = Constants.ContentKinds.map(function(k) {
      return k.kind;
    });
    new d3Helper.PieChart('#svg_wrapper', data, {
      key: 'kind_id',
      width: 350,
      total: stringHelper.format_number(total),
      color_key: color_key,
      title: this.get_translation(
        'total_resource_count',
        this.model.get('metadata').resource_count
      ),
      tooltip: function(d) {
        return self.tooltip_template(d.data, { data: self.get_intl_data() });
      },
    });

    new d3Helper.Legend('#legend_wrapper', data, {
      key: 'kind_id',
      color_key: color_key,
      get_text: function(d) {
        return stringHelper.translate(d.kind_id + '_plural');
      },
    });
  },
  get_size_bar: function(size) {
    // Get data for size bar indicator
    // Run python manage.py get_channel_stats to get latest stats
    var size_index = Math.max(
      1,
      Math.min(Math.ceil(Math.log(size / CHANNEL_SIZE_DIVISOR) / Math.log(2)), 10)
    );
    return {
      filled: _.range(size_index),
      text: this.get_translation(SCALE_TEXT[size_index]),
    };
  },
  get_count_bar: function(count) {
    // Get data for count bar indicator
    // Run python manage.py get_channel_stats to get latest stats
    var size_index = Math.max(1, Math.min(Math.floor(Math.log(count) / Math.log(2.8)), 10));
    var bar = [];
    for (var i = 0; i < 10; ++i) {
      bar.push(i < size_index);
    }
    return {
      filled: bar,
      text: this.get_translation(SCALE_TEXT[size_index]),
    };
  },
  get_split_list: function(items) {
    // Separate items into short and long list to allow user to show more/less
    items = items.sort();
    return {
      short: items.length <= 10 ? items : items.slice(0, 9),
      full: items.length <= 10 ? [] : items.slice(9, items.length),
    };
  },
  set_tab: function(e) {
    // Set tab as active
    this.$('.btn-tab').removeClass('active');
    $(e.target).addClass('active');
  },
  set_toggle_text: function(e) {
    // Set show more/less text
    var current_text = $(e.target).text();
    $(e.target).text($(e.target).data('update'));
    $(e.target).data('update', current_text);
  },
  copy_id: function(event) {
    event.stopPropagation();
    event.preventDefault();
    var button = $(event.target);
    $(button.data('text')).focus();
    $(button.data('text')).select();
    try {
      document.execCommand('copy');
      button.text('check');
    } catch (e) {
      button.text('clear');
    }
    setTimeout(function() {
      button.text('content_paste');
    }, 2500);
  },
});

module.exports = {
  DetailsView: DetailsView,
};
