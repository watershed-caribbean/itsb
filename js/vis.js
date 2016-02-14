var init = function(){

	return {

		//empty loading array to hold pending datasets
		loading:[],

		//store screen height and width
		width:window.innerWidth,
		height:window.innerHeight,

		data:{},

		navigation:null,
		navActive:false,

		projection:null,
		path:null,

		intersections:{},
		trajectories:{},

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
			var datasets = ['countries','intersections','trajectories','places'],
				callback = _callback;

			datasets.forEach(function(d){

				//push name of dataset into loading array
				self.loading.push(d);
			});

			//cycle through each string in the array
			datasets.forEach(function(d){

				//concat filename and path from dataset name
				var filepath = 'data/' +d +'.json';

				//retrieve dataset
				d3.json(filepath,function(e,_d){
					if(!e){
						self.data[d] = _d;
						self.loadingManager(d,callback);
					}
				});

			});
		},

		//generates visualization
		generate:function(){
			var self = vis;

			self.svg = d3.select('#container').append('svg')
				.attr('width',self.width)
				.attr('height',self.height)
				.on('click',function(){
					d3.select('span#placeName').text('');
				});

			self.navigation = d3.select('#navigation');

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
			/*var trajectories;
			trajectories = self.svg.selectAll('path.trajectory')
				//.data(self.trajectories)
				.data([])
				;
			trajectories.enter().append('path')
				.classed('trajectory',true);
			trajectories
				.attr('class',function(d){
					return d.end.key + ' ' + d.start.key + ' trajectory';
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
			trajectories.exit().remove();*/

			// Initialize d3 tooltip
			/*var tip = d3.tip()
				.attr('class', 'd3-tip')
				.html(function(d) { return d.value.name; })
				.offset([-15,0]);*/

			//define point scale
			var pointScale = d3.scale.linear()
				.domain([1,10])	//min and max of final data
				.range([3,45]);

			//plot points 
			var points,
				pointData = d3.entries(self.places);
			points = self.svg.selectAll('circle.point')
				//.data(pointData)
				.data(d3.keys(self.intersections))
				;
			points.enter().append('circle')
				.classed('point',true);
				//.call(tip);	//invokes the tooltip, d3.tip
			points
				.attr('cx',function(d){
					
					//pass coordinates into projection
					//returns an array of screen coordinates
					//take the first value (x)
					var posX = self.projection([
						self.data.places[d][1],
						self.data.places[d][0]
					])[0];
					return posX;
				})
				.attr('cy',function(d){
					
					//pass coordinates into projection
					//returns an array of screen coordinates
					//take the second value (y)
					var posY = self.projection([
						self.data.places[d][1],
						self.data.places[d][0]
					])[1];
					return posY;
				})
				.attr('r',function(d){
					var radius = pointScale(self.intersections[d].length);
					return radius;
				});
			points
				.on('mouseover', function(d){
					d3.select(this)
						.style('fill','red');	//changes fill
					//.attr('r',6);	//changes radius
					//tip.show(d)	//calls tooltip
				
				})
				.on('mouseout', function(d){
					d3.select(this)
						.style('fill','black') //returns to default
					//.attr('r', 3); //returns to default
					//tip.hide(d); //hides tooltip
				})
				.on('click', function(d){
					d3.select('span#placeName')
						.text(d + ': ' + self.intersections[d].length);
					d3.event.stopPropagation();
				});
			points.exit().remove();
		},

		//filter data based on state of navigation
		filterData:function(){
			var self = vis;

			var date_start = new Date('2001-01-11'),
				date_end = new Date('2001-04-18');

			var holder = [];

			//filter intersections (points) first
			d3.keys(self.data.intersections).forEach(function(d,i){

				var tStamp_start = date_start.getTime(),
					tStamp_end = date_end.getTime(),

					tStamp_currentDatum = new Date(d).getTime();

				//only pull elements after the start date and before the end date
				if(tStamp_currentDatum >tStamp_start && tStamp_currentDatum <tStamp_end){

					var ref = d3.keys(self.data.intersections[d]);

					ref.forEach(function(_d,_i){
						
						if(!self.intersections[_d]){
							self.intersections[_d] = [];
						}
						self.data.intersections[d][_d].forEach(function(__d,__i){
							if(self.intersections[_d].indexOf(__d) <0){
								self.intersections[_d].push(__d);
							}
						});
					});
					holder.push(self.data.intersections[d]);
				}
			});

			//filter trajectories next
			//**ASSIGNMENT**
		},

		//puts data in correct format
		processData:function(){
			var self = vis;

			//any data transformation logic goes here

			self.filterData();
			self.generate();
		}
	}
}

var vis = init();
vis.getData(vis.processData);
