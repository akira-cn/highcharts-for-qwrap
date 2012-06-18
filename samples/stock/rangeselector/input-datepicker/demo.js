$(function() {

    $.getJSON('http://www.highcharts.com/samples/data/jsonp.php?filename=aapl-c.json&callback=?', function(data) {
        // Create the chart
        window.chart = new Highcharts.StockChart({
            chart : {
                renderTo : 'container'
            },

            rangeSelector : {
                selected : 1
            },

            title : {
                text : 'AAPL Stock Price'
            },
            
            series : [{
                name : 'AAPL',
                data : data,
                tooltip: {
                    valueDecimals: 2
                }
            }]
            
        }, function(chart){

            // apply the date pickers
            setTimeout(function(){
                $('input.highcharts-range-selector', $('#'+chart.options.chart.renderTo))
                    .datepicker()
            },0)
        });
    });
    
    
    // Set the datepicker's date format
    $.datepicker.setDefaults({
        dateFormat: 'yy-mm-dd',
        onSelect: function(dateText) {
            this.onchange();
            this.onblur();
        }
    });

});
