var d3 = require("d3");
var cloud = require("d3-cloud");

var _ = require("underscore");

const COLOR_SELECTION = ["#8dd3c7", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#bc80bd", "#ccebc5", "#ffed6f"];

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
    constructor(selector, data, config) {
        this.selector = selector || "body";
        this.config = config || {};
        this.init();
        this.set(data, config);
    }

    setConfig(config) {
        config = config || {};
        var color_selection = config.color || COLOR_SELECTION;
        var color =  d3.scaleOrdinal(color_selection);
        this.config = {
            key: config.key || "id",
            value_key: config.value_key || "percent",
            tooltip: config.tooltip,
            get_text: config.get_text,
            center_text: config.center_text,
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

        if(config.center_text) {
            g.append("text")
                .attr("text-anchor", "middle")
                .attr('font-size', '14pt')
                .attr("dy", "0em")
                .text(config.total);

            g.append("text")
                .attr("text-anchor", "middle")
                .attr('font-size', '10pt')
                .attr("dy", "1em")
                .text(config.center_text);
        }
    }
}

class Legend extends Visual {
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

    init() {
        var width = $(this.selector).width();
        this.svg = d3.select(this.selector).append("svg").attr("width", width);
    }
    render(data) {
        if(!data.length) {
            return;
        }

        var config = this.config;
        var svg = this.svg;
        var width = svg.attr("width");
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
                "count": _.findLastIndex(thresholds, function(n) {
                    return n <= d[config.value_key] ;
                })
            };
        });

        var minWidth = _.max(tags, function(d) { return d.text.length; });

        function drawCloud(maxFontSize) {
            var xScale = d3.scaleLinear().domain([0, thresholds.length]).range([10, maxFontSize]);

            cloud().size([Math.min(minWidth.text.length * 30 + 60, width), 10 * Math.max(1, data.length) + 60])
                        .words(tags)
                        .padding(Math.max(5, 15 - (tags.length / 10).toFixed(0)))
                        .text(function(d) { return d.text; })
                        .rotate(function() { return ~~0; })
                        .fontSize(function(d) { return xScale(d.count); })
                        .on("end", function(output) {
                            if(maxFontSize <= 10) {
                                return;
                            }
                            if (tags.length !== output.length) {  // compare between input ant output
                                   drawCloud ( maxFontSize - 2 ); // call the function recursively
                                   return undefined;
                              }
                              else { draw(output, xScale); }     // when all words are included, start rendering
                        })
                        .start();
        }
        drawCloud(60);

        function draw(words, xScale) {
            var maxHeight = _.max(words, function(w) { return w.y + w.height; });
            var minHeight = _.min(words, function(w) { return w.y; });
            var height = (maxHeight.y + maxHeight.height) - minHeight.y + 30;

            svg.attr("height", height)
                .attr("text-align", "center")
                .append("g")
                .attr("transform", "translate(" + [width>>1, height >> 1] + ")")
                .selectAll("text")
                .data(words)
                .enter().append("text")
                .style("font-size", function(d) { return xScale(d.count) + "px"; })
                .style("fill", function(d) { return config.color(d.count); })
                .attr("text-anchor", "middle")
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })
                .text(function(d) { return d.text; })
                .style("margin-left", function(d) {return xScale(d.count) + "px"});
            $(selector).height(height + 10);
        }
        cloud().stop();
    }
}

module.exports = {
    PieChart : PieChart,
    Legend : Legend,
    TagCloud: TagCloud
}
