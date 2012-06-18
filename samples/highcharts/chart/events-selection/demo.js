$(function () {
    var $report = $('#report');
    
    // create the chart
    var chart = new Highcharts.Chart({
        chart: {
            renderTo: 'container',
            events: {
                selection: function(event) {
                    if (event.xAxis) {
                        $report.html('min: '+ event.xAxis[0].min +', max: '+ event.xAxis[0].max);
                    } else {
                        $report.html ('Selection reset');
                    }
                }
            },
            zoomType: 'x'
        },
        xAxis: {
        },
        
        series: [{
            data: [29.9, 71.5, 106.4, 129.2, 144.0, 176.0, 135.6, 148.5, 216.4, 194.1, 95.6, 54.4]        
        }]
    });
});