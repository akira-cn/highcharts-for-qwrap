$(function() {
	$.getJSON('http://www.highcharts.com/samples/data/jsonp.php?filename=new-intraday.json&callback=?', function(data) {

		// create the chart
		chart = new Highcharts.StockChart({
			chart : {
				renderTo : 'container'
			},

			title: {
				text: 'AAPL stock price by minute'
			},
			
			xAxis: {
				gapGridLineWidth: 0
			},
			
			rangeSelector : {
				buttons : [{
					type : 'hour',
					count : 1,
					text : '1h'
				}, {
					type : 'day',
					count : 1,
					text : '1D'
				}, {
					type : 'all',
					count : 1,
					text : 'All'
				}],
				selected : 1,
				inputEnabled : false
			},
			
			series : [{
				name : 'AAPL',
				type: 'area',
				data : data,
				gapSize: 5,
				tooltip: {
					valueDecimals: 2
				},
				fillColor : {
					linearGradient : {
						x1: 0, 
						y1: 0, 
						x2: 0, 
						y2: 1
					},
					stops : [[0, Highcharts.getOptions().colors[0]], [1, 'rgba(0,0,0,0)']]
				},
				threshold: null
			}]
		});
	});
});
