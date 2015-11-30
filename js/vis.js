var init = function(){

	return {

		//empty loading array to hold pending datasets
		loading:[],

		//store screen height and width
		width:window.innerWidth,
		height:window.innerHeight,

		projection:null,
		path:null,

		//ensures the callback function is only called
		//once all datasets have been retrieved
		loadingManager:function(_elem,_callback){
			var self = vis;
			var empty = false;

			//remove name of retrieved JSON document from loading array
			self.loading = self.loading.filter(function(d){
				return d !== _elem;
			});

			//if loading array is empty, callback function
			if(self.loading.length === 0){ 
				_callback();
			}
		},

		//retrieves datasets
		getData:function(_callback){
			var self = vis;

			//'datasets' array holds strings for all files to be retrieved
			var datasets = ['countries'],
				callback = _callback;

			//cycle through each string in the array
			datasets.forEach(function(d){

				//concat filename and path from dataset name
				var filename = d +'.json',
					filepath = 'data/' +filename;

				//push name of dataset into loading array
				self.loading.push(d);

				//retrieve dataset
				d3.json(filepath,function(e,d){
					self.countries = d;
					self.loadingManager('countries',callback);
				});
			});
		},

		//generates visualization
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
		},

		//puts data in correct format
		processData:function(){
			var self = vis;
			self.generate();
		}
	}
}

var vis = init();
vis.getData(vis.processData);