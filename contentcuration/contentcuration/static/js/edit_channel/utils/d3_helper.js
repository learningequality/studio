var d3 = require("d3");

var _ = require("underscore");
require("jqcloud2")
require("jqcloud2/dist/jqcloud.css")

const COLOR_SELECTION = ["#8dd3c7", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#bc80bd", "#ccebc5"];

var ttCounter = 0

function D3Tooltip (d3, selector) {
    this.d3 = d3
    this.id = 'd3-tooltip-' + ttCounter
    this.class = 'd3-tooltip'
    this.$el =  d3.select(selector).append('div')
        .attr('class', this.class)
        .attr('id', this.id)
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('pointer-events', 'none')
    ttCounter += 1
    this.html = function(html) {
        this.$el.html(html)
    }
    this.show = function() {
        var xPos = this.d3.event.pageX - $(selector).offset().left + 10;
        var yPos = this.d3.event.pageY - $(selector).offset().top + 10;
        this.$el.transition().duration(200).style('opacity', .9)
        this.$el.style('left', xPos + 'px')
                .style('top', (yPos - 28) + 'px')
    }
    this.move = function() {
        var xPos = this.d3.event.pageX - $(selector).offset().left + 10;
        var yPos = this.d3.event.pageY - $(selector).offset().top - 28;
        this.$el.style('left', xPos + 'px')
                .style('top', (yPos - 28) + 'px')
    }
    this.hide = function() {
        this.$el.transition().duration(500).style('opacity', 0)
    }
}

class Visual {
    /*
        Base class for visualizations
        config = {
            key (str): key used for data id such as name or label [default:"id"],
            value_key (str): key used for getting number such as percent or count [default:"percent"],
            tooltip (function): function for text to display on tooltip [default:null],
            get_text (function): function for text to display on sections of visualization,
            title (str): title of the visualization,
            total (int): total number of items [default:0],
            width (int): width of visualization [default:300],
            height (int): height of visualization [default:50]
        }

        For example:
            Given: [
                {"name": "Item 1", "count": 3},
                {"name": "Item 2", "count": 1}
            ]

            Config = {
                key: "name",
                value_key: "count",
                tooltip: function(d) {
                    return "<b>" + d.data.key + "</b>: " + d.data.count;
                },
                get_text: function(d) {
                    return d.name;
                },
                title: "Sample Visual"
            }
    */
    constructor(selector, data, config) {
        this.selector = selector || "body";
        this.config = config || {};
        this.init();
        this.set(data, config);
    }

    setConfig(config) {
        // Set configuration for visualization
        config = config || {};
        var color_selection = config.color || COLOR_SELECTION;
        var color =  d3.scaleOrdinal(color_selection);
        this.config = {
            key: config.key || "id",
            value_key: config.value_key || "percent",
            tooltip: config.tooltip,
            get_text: config.get_text,
            title: config.title,
            total: config.total || 0,
            width: config.width || 300,
            height: config.height || 50,
            color_selection: color_selection,
            color: (config.color_key)? color.domain(config.color_key) : color,
        }
    }

    set(data, config) {
        this.setConfig(config);
        this.render(data);
    }
    init(data, config) { /* Override in subclasses */ }
    render(data) { /* Override in subclasses */ }
}

class PieChart extends Visual {
    /* Create pie chart from data */
    init() {
        var width = this.config.width || $(this.selector).width() || 300;
        var height = width;
        this.radius = Math.min(width, height) / 2;

        this.svg = d3.select(this.selector)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        this.svg.append("g").attr("class", "slices");
        this.svg.append("g").attr("class", "labelName");
        this.svg.append("g").attr("class", "labelValue");
        this.svg.append("g").attr("class", "lines");

        var self = this;
        this.pie = d3.pie().sort(null).value(function(d) {
            return d[self.config.value_key];
        });
        this.arc = d3.arc().outerRadius(this.radius * 0.8) .innerRadius(this.radius * 0.4);
        this.outerArc = d3.arc().innerRadius(this.radius * 0.9).outerRadius(this.radius * 0.9);
    }
    render(data) {
        var arc = this.arc;
        var config = this.config;

        var g = this.svg.selectAll(".arc")
            .data(this.pie(data))
            .enter().append("g")
            .attr("class", "arc");

        var path = g.append("path")
                .attr("d", arc)
                .style("fill", function (d) {
                    return config.color(d.data[config.key]);
                });

        if(config.tooltip) {
            if(!this.tooltip) {
                this.tooltip = new D3Tooltip(d3, this.selector);
            }
            var tip = this.tooltip;
            path.on("mouseover", function(d) {
                    tip.html(config.tooltip(d))
                    tip.show()
                }).on("mousemove", function(d) {
                    tip.move();
                })
                .on("mouseout", function(d) {
                    tip.hide();
                })
        }

        if (config.get_text) {
            g.append("text")
                .style("text-anchor", "middle")
                .style("font-size", "8pt")
                .attr("transform", function (d) {
                    return "translate(" + arc.centroid(d) + ")";
                }).attr("dy", ".35em").text(config.get_text);
        }

        if(config.title) {
            g.append("text")
                .attr("text-anchor", "middle")
                .attr('font-size', '14pt')
                .attr("dy", "0em")
                .text(config.total);

            g.append("text")
                .attr("text-anchor", "middle")
                .attr('font-size', '10pt')
                .attr("dy", "1em")
                .text(config.title);
        }
    }
}

class Legend extends Visual {
    /* Create legend from data */
    render(data) {
        var legend = d3.select(this.selector).append("table").attr('class','legend');
        var leg = {};
        var color = this.color;
        var config = this.config;

        var tr = legend.append("tbody").selectAll("tr").data(data).enter().append("tr");

        // create the first column for each segment.
        tr.append("td").append("svg").attr("width", '16').attr("height", '16').append("rect")
            .attr("width", '16').attr("height", '16')
            .attr("fill", function(d){ return config.color(d[config.key]); });

        // create the second column for each segment.
        tr.append("td").text(config.get_text);
    };
}


class TagCloud extends Visual {
    /* Create tag cloud from data */
    render(data) {
        if(!data.length) {
            return;
        }

        var config = this.config;
        var selector = this.selector;

        var weight = config.color_selection.length;
        var max = _.max(data, function(d){ return d[config.value_key]; })[config.value_key];
        var min = _.min(data, function(d){ return d[config.value_key]; })[config.value_key];
        var step = (max - min) / weight;
        var thresholds = [];
        for (var i = 0; i <= weight; ++i) {
            thresholds.push(i * step);
        }

        var tags = _.map(data, function(d) {
            return {
                "text": d[config.key],
                "weight": _.findLastIndex(thresholds, function(n) {
                    return n <= d[config.value_key] ;
                })
            };
        });

        function calculateFontSize(num) {
            return num * 3 + 15;
        }

        // Calculate height based on how much space words will take
        var width = $(selector).width() - 10;
        var space_needed = _.reduce(tags, function(sum, word) {
            var fontsize = calculateFontSize(word.weight);
            var wordsize = fontsize * word.text.length + 10; // Factoring padding
            return sum + wordsize;
        }, 0);

        var max_text_height = calculateFontSize(thresholds.length);
        $(selector).height(space_needed / width * max_text_height + max_text_height);


        $(selector).jQCloud(tags, {
            autoResize: true,
            fontSize: function (width, height, step) {
                return calculateFontSize(step) + 'px';
            },
            width: width,
            delayedMode: true,
            colors: config.color_selection,
            removeOverflowing: false
        });
    }
}

module.exports = {
    PieChart : PieChart,
    Legend : Legend,
    TagCloud: TagCloud
}
