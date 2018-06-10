var d3 = require("d3");

var _ = require("underscore");

const COLOR_SELECTION = d3.schemeSet3

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
        var xPos = this.d3.event.pageX - $(selector).offset().left;
        var yPos = this.d3.event.pageY - $(selector).offset().top;
        this.$el.transition().duration(200).style('opacity', .9)
        this.$el.style('left', xPos + 'px')
                .style('top', (yPos - 28) + 'px')
    }
    this.hide = function() {
        this.$el.transition().duration(500).style('opacity', 0)
    }
}


function PieChart(selector, data, config) {
    this.selector = selector || "body";
    this.config = config || {};
    this.color = COLOR_SELECTION;

    this.set_config = function(config) {
        this.config = {
            key: config.key || "id",
            value_key: config.value_key || "count",
            tooltip: config.tooltip,
            get_text: config.get_text,
            center_text: config.center_text,
            total: config.total || 0
        }
    };

    this.set = function(data, config) {
        this.set_config(config);
        this.render(data);
    };

    this.render = function(data) {
        var arc = this.arc;
        var legendRectSize = this.legendRectSize;
        var legendSpacing = this.legendSpacing;
        var config = this.config;
        var color = d3.scaleOrdinal(this.color);
        var tip = this.tooltip;

        var g = this.svg.selectAll(".arc")
            .data(this.pie(data))
            .enter().append("g")
            .attr("class", "arc");

        if(config.tooltip) {
            g.append("path")
                .attr("d", arc)
                .style("fill", function (d) {
                    return color(d.data[config.key]);
                }).on("mouseover", function(d) {
                    console.log(d3.event)
                    tip.html(config.tooltip(d))
                    tip.show()
                }).on("mouseout", function(d) {
                    tip.hide();
                })
        } else {
            g.append("path")
                .attr("d", arc)
                .style("fill", function (d) {
                    return color(d.data[config.key]);
                });
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
    };

    var width = config.width || $(selector).width() || 300;
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
    this.legendRectSize = (this.radius * 0.05);
    this.legendSpacing = this.radius * 0.02;

    this.tooltip = new D3Tooltip(d3, selector) //create new tooltip

    this.set(data, config);
}

function Legend(selector, data, config) {
    this.selector = selector || "body";
    this.config = {};
    this.color = COLOR_SELECTION;

    this.set_config = function(config) {
        this.config = {
            key: config.key || "id",
            get_text: config.get_text
        }
    };

    this.set = function(data, config) {
        this.set_config(config);
        this.render(data);
    };


    this.render = function(data) {
        var legend = d3.select(this.selector).append("table").attr('class','legend');
        var leg = {};
        var color = d3.scaleOrdinal(this.color);
        var config = this.config;

        var tr = legend.append("tbody").selectAll("tr").data(data).enter().append("tr");

        // create the first column for each segment.
        tr.append("td").append("svg").attr("width", '16').attr("height", '16').append("rect")
            .attr("width", '16').attr("height", '16')
            .attr("fill", function(d){ return color(d[config.key]); });

        // create the second column for each segment.
        tr.append("td").text(config.get_text);
    };
    this.set(data, config)
}

module.exports = {
    PieChart : PieChart,
    Legend : Legend
}
