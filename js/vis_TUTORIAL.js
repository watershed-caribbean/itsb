d3.json('data/countries.json',function(e,dataImported){
	
	var width = window.innerWidth,
		height = window.innerHeight;

	var svg = d3.select('#container').append('svg')
		.attr('width',width)
		.attr('height',height);

	var projection = d3.geo.mercator()
		.scale(200)
		.translate([width/2,height/2])
		;

	var path = d3.geo.path()
		.projection(projection);

	var features = topojson.feature(dataImported,dataImported.objects.countries);

	var map;

	map = svg.selectAll('path.map')
		.data([features]);
	map.enter().append('path')
		.classed('map',true);
	map
		.attr('d',path);
	map
		.on('mouseout',function(_authorData){
			d3.select('div#description').text(_authorData);
		});
	map.exit().remove();
});