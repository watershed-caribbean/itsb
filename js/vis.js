var init = function(){

	return {

		loading:[],

		width:window.innerWidth,
		height:window.innerHeight,

		projection:null,
		path:null,

		loadingManager:function(_elem,_callback){
			var self = vis;
			var empty = false;
			self.loading = self.loading.filter(function(d){
				return d !== _elem;
			});
			if(self.loading.length === 0){ 
				_callback();
			}
		},
		getData:function(_callback){
			var self = vis;
			var datasets = ['c'],
				callback = _callback;

			datasets.forEach(function(d){
				self.loading.push(d);
			});

			d3.json('data/countries.json',function(e,d){
				self.countries = d;
				self.loadingManager('c',callback);
			});
		},
		processData:function(){
			var self = vis;
			vis.generate();
		},
		generate:function(){
			var self = vis;

			self.svg = d3.select('#container').append('svg')
				.attr('width',self.width)
				.attr('height',self.height);

			self.projection = d3.geo.mercator()
				.scale(200)
				.translate([self.width/2,self.height/2])
				;

			self.path = d3.geo.path()
				.projection(self.projection);

			var features = topojson.feature(self.countries,self.countries.objects.countries);

			var map;
			map = self.svg.selectAll('path.map')
				.data([features]);
			map.enter().append('path')
				.classed('map',true);
			map
				.attr('d',self.path);
			map.exit().remove();
		}
	}
}

var vis = init();
vis.getData(vis.processData);