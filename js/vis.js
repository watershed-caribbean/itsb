var init = function(){

	return {

		//empty loading array to hold pending datasets
		loading:[],

		//store screen height and width
		width:window.innerWidth,
		height:window.innerHeight,

		data:{},

		projection:null,
		path:null,

		places:{},
		connections:[],

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
			var datasets = [
					{
						'name':'countries',
						'type':'json'
					},
					{
						'name':'places',
						'type':'csv'
					},
					{
						'name':'connections',
						'type':'csv'
					}
				],
				callback = _callback;

			datasets.forEach(function(d){

				//push name of dataset into loading array
				self.loading.push(d.name);
			});

			//cycle through each string in the array
			datasets.forEach(function(d){

				//concat filename and path from dataset name
				var filename = d.name +'.' +d.type,
					filepath = 'data/' +filename;

				//different retrieval functions for different filetypes
				if(d.type === 'json'){

					//retrieve dataset
					d3.json(filepath,function(e,_d){
						if(!e){
							self.data[d.name] = _d;
							self.loadingManager(d.name,callback);
						}
					});

				} else if(d.type === 'csv'){

					//retrieve dataset
					d3.csv(filepath,function(e,_d){
						if(!e){
							self.data[d.name] = _d;
							self.loadingManager(d.name,callback);
						}
					});
				}
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

			var features = topojson.feature(self.data.countries,self.data.countries.objects.countries);

			//draw vector map
			var map;
			map = self.svg.selectAll('path.map')
				.data([features]);
			map.enter().append('path')
				.classed('map',true);
			map
				.attr('d',self.path);
			map.exit().remove();

			//plot lines
			var lineFunction = d3.svg.line()
				.x(function(d){ return d.x; })
				.y(function(d){ return d.y; })
				.interpolate('linear');
			var connections;
			connections = self.svg.selectAll('path.connection')
				.data(self.connections);
			connections.enter().append('path')
				.classed('connection',true);
			connections
				.attr('class',function(d){
					/*var startString = 'start_' +d.start.key,
						endString = 'end_' +d.end.key;*/
					return d.end.key + ' ' + d.start.key + ' connection';
				})
				.attr('d',function(d){

					var source = {},
						target = {};

					//isolate x and y start coordinates using projection
					source.raw = self.projection([
						d.start.coords.lon,
						d.start.coords.lat
					]);
					source.x = source.raw[0];
					source.y = source.raw[1];

					//isolate x and y end coordinates using projection
					target.raw = self.projection([
						d.end.coords.lon,
						d.end.coords.lat
					]);
					target.x = target.raw[0];
					target.y = target.raw[1];

					//this is a path builder -- creates a curved line between points
					//src: http://stackoverflow.com/questions/13455510/curved-line-on-d3-force-directed-tree
					var dx = target.x -source.x,
						dy = target.y -source.y,
						dr = Math.sqrt(dx * dx + dy * dy);
					return 'M' + source.x + ',' + source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + target.x + ',' + target.y;
				});
			connections.exit().remove();

			// Initialize d3 tooltip
			var tip = d3.tip()
				.attr('class', 'd3-tip')
				.html(function(d) { return d.value.name; })
				.offset([-15,0]);

			//define point scale
			var pointScale = d3.scale.linear()
				.domain([1,20])	//min and max of final data
				.range([1,15]);

			//plot points 
			var points,
				pointData = d3.entries(self.places);
			points = self.svg.selectAll('circle.point')
				.data(pointData);
			points.enter().append('circle')
				.classed('point',true)
				
				//invokes the tooltip, d3.tip
				.call(tip);
			points
				.attr('cx',function(d){
				
					//pass coordinates into projection
					//returns an array of screen coordinates
					//take the first value (x)
					var posX = self.projection([
						self.places[d.key].lon,
						self.places[d.key].lat
					])[0];
					return posX;
				})
				.attr('cy',function(d){
					
					//pass coordinates into projection
					//returns an array of screen coordinates
					//take the second value (y)
					var posY = self.projection([
						self.places[d.key].lon,
						self.places[d.key].lat
					])[1];
					return posY;
				})
				//.attr('r',3)
				.attr('r',function(d){
					var radius = pointScale(d.value.intersectionVal);
					return radius;
				});
			points
				//mouseover display changes
				.on('mouseover', function(d){
					
					//this.style.cursor='pointer'; //let's just do this in the CSS
 
 					//since mouseEvent styling will continue to get more complicated,
					//we should start implementing classes to control style whenever
					//possible -- this can be done using selectors in the CSS

					//d3.selectAll('path.' +d.key).classed('focus',true);

					d3.select(this)
						//.attr('fill','red')	//changes fill
						.classed('focus',true)	//applies "focus" class to point, which can be styled in the CSS
						.attr('r',6)			//changes radius
						;

					tip.show(d);				//calls tooltip
				})
				.on('mouseout', function(d){
					d3.select(this)
						//.attr('fill','black')	//returns to default
						.classed('focus',false)	//removes "focus" class from point
						.attr('r', 3); 			//returns to default
					tip.hide(d); 				//hides tooltip
				})
				.on('click', function(d){
					/*d3.select(this)
						.attr('fill','red')		//changes fill
						.attr('r',6);*/			//changes radius
				});
			points.exit().remove();
		},

		//filter data based on state of navigation
		filterData:function(){

			//	**TODO**
		},	

		//creates unique identifiers for place names
		util_keyify:function(_name){
			var key = _name.split(' ').join('_');
			return key;
		},

		//puts data in correct format
		processData:function(){
			var self = vis;

			//first cycle through raw 'places' data to create dictionary
			self.data.places.forEach(function(d){
				d.key = self.util_keyify(d.name);
				if(!self.places[d.key]){
					self.places[d.key] = {};
					self.places[d.key].name = d.name;
					self.places[d.key].lat = parseFloat(d.lat);
					self.places[d.key].lon = parseFloat(d.lon);

					self.places[d.key].intersectionVal = parseInt(d.intersectionVal);
				}
			});

			//now, cycle through raw 'connections' data
			//use 'places' array for lat/lon reference
			//assumes that every entry is unique
			self.data.connections.forEach(function(d){
				var connectionObject = {};

				//create new Date object from parsed date
				connectionObject.date = new Date(Date.parse(d.date));

				//store year (for future timeline navigation)
				connectionObject.year = connectionObject.date.getFullYear();

				//store author
				connectionObject.author = d.author;

				//create empty objects for start and end locations
				connectionObject.start = {};
				connectionObject.end = {};

				//store start and end names
				connectionObject.start.name = d.start;
				connectionObject.end.name = d.end;

				//store start and end keys
				connectionObject.start.key = self.util_keyify(d.start);
				connectionObject.end.key = self.util_keyify(d.end);

				//store start and end lat/lon, pulled from 'places' array
				connectionObject.start.coords = self.places[connectionObject.start.key];
				connectionObject.end.coords = self.places[connectionObject.end.key];

				//push formatted pair to 'connections' array
				self.connections.push(connectionObject);
			});

			self.filterData();
			self.generate();
		}
	}
}

var vis = init();
vis.getData(vis.processData);
