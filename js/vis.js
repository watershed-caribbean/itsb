var init = function(){

	return {

		//empty loading array to hold pending datasets
		loading:[],

		//store screen height and width
		width:window.innerWidth,
		height:window.innerHeight,

		data:{},
		date:{
			start:new Date(),
			end:new Date()
		},
		focus:{
			place:""
		},

		navigation:null,
		navActive:false,

		projection:null,
		path:null,

		intersections:{},
		trajectories:[],

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
			var datasets = ['countries','intersections','trajectories','places','authors'],
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
					d3.select('span#dateRange').text('');
					d3.select('#nav_auth').html('');
					d3.selectAll('.selected').classed('selected',false);
				});

			//var format = d3.time.format("%b. %Y");
			//d3.select('#searchbar span').text(format(self.date.start) +' — ' +format(self.date.end));

			if(!self.focus.place || self.focus.place && self.focus.place === 0){
				self.focus.place = "NewYork_US";
			}

			self.navigation = d3.select('#nav_date');

			self.projection = d3.geo.mercator()
				.scale(220)
				.translate([self.width*0.36,self.height*0.6])
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
				.attr('d',self.path)
				//.attr('filter','url(#f1)')
				;
			map.exit().remove();

			//plot lines
			var lineFunction = d3.svg.line()
				.x(function(d){ return d.x; })
				.y(function(d){ return d.y; })
				.interpolate('linear');
			var trajectories;
			trajectories = self.svg.selectAll('path.trajectory')
				.data(self.trajectories)
				;
			trajectories.enter().append('path')
				.classed('trajectory',true);
			trajectories
				.attr('class',function(d){
					return 'trajectory ' +d.ArCiCo +' ' +d.DptCiCo;
				})
				.classed('selected',function(d){
					return d.ArCiCo === self.focus.place || d.DptCiCo === self.focus.place;
				})
				.attr('d',function(d){

					var source = {},
						target = {};

					//isolate x and y start coordinates using projection
					source.raw = self.projection([
						self.data.places[d.ArCiCo][1],
						self.data.places[d.ArCiCo][0]
					]);
					source.x = source.raw[0];
					source.y = source.raw[1];

					//isolate x and y end coordinates using projection
					target.raw = self.projection([
						self.data.places[d.DptCiCo][1],
						self.data.places[d.DptCiCo][0]
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
			trajectories.exit().remove();

			//define min and max radii
			//define point scale
			var minR = 3,
				maxR = 45;
			var pointScale = d3.scale.linear()
				.domain([1,10])	//min and max of final data
				.range([minR,maxR]);

			//define all variables needed for plotting points
			var pointG,

				pointBacks,
				points,

				pbg_01,
				pbg_02,

				pointData = [];

			//store x/y coordinates for each, so we don't have to recalculate these every time
			d3.keys(self.intersections).forEach(function(d){
				var obj = {};

				obj.placeName = d;

				//pass coordinates into projection
				//returns an array of screen coordinates
				var loc = self.projection([
					self.data.places[obj.placeName][1],
					self.data.places[obj.placeName][0]
				]);
				obj.posX = loc[0];
				obj.posY = loc[1];
				pointData.push(obj);
			});

			//point holder
			pointG = self.svg.selectAll('g.pointG')
				.data(pointData);
			pointG.enter().append('g')
				.classed('pointG',true);
			pointG
				.classed('selected',function(d){
					return d.placeName === self.focus.place;
				});
			pointG
				.on('mouseover',function(d){
					d3.selectAll('.hov').classed('hov',false);
					d3.select(this).classed('hov',true);
					d3.selectAll('path.' +d.placeName).classed('hov',true);
				})
				.on('mouseout',function(d){
					d3.select(this).classed('hov',false);
					d3.selectAll('path.' +d.placeName).classed('hov',false);
				})
				.on('click', function(d){

					//set focus
					self.focus.place = d.placeName;

					d3.selectAll('.selected').classed('selected',false);
					d3.select(this).classed('selected',true);
					d3.selectAll('path.' +self.focus.place).classed('selected',true);

					//update sidebar
					self.updateSidebar();

					//prevent event bubbling
					d3.event.stopPropagation();
				});
			pointG.exit().remove();

			//plot background circles (two groups)
			pbg_01 = pointG.selectAll('circle.pbg_01')
				.data(function(d){ return [d]; });
			pbg_01.enter().append('circle')
				.classed('pbg_01',true);
			pbg_01
				.classed('marker',true)
				.attr('cx',function(d,i){
					return d.posX;
				})
				.attr('cy',function(d){
					return d.posY;
				})
				.attr('r',maxR)
				;
			pbg_01.exit().remove();
			pbg_02 = pointG.selectAll('circle.pbg_02')
				.data(function(d){ return [d]; });
			pbg_02.enter().append('circle')
				.classed('pbg_02',true);
			pbg_02
				.classed('marker',true)
				.attr('cx',function(d,i){
					return d.posX;
				})
				.attr('cy',function(d){
					return d.posY;
				})
				.attr('r',maxR/2)
				;
			pbg_02.exit().remove();
			
			//plot pointbacks
			pointBacks = pointG.selectAll('circle.pointBack')
				.data(function(d){ return [d]; })
				;
			pointBacks.enter().append('circle')
				.classed('pointBack',true);
			pointBacks
				.classed('marker',true)
				.attr('cx',function(d){
					return d.posX;
				})
				.attr('cy',function(d){
					return d.posY;
				})
				.attr('r',function(d){
					var radius = pointScale(self.intersections[d.placeName].length);
					return radius;
				});
			pointBacks.exit().remove();

			//plot points
			points = pointG.selectAll('circle.point')
				.data(function(d){ return [d]; })
				;
			points.enter().append('circle')
				.classed('point',true);
			points
				.classed('marker',true)
				.attr('cx',function(d){
					return d.posX;
				})
				.attr('cy',function(d){
					return d.posY;
				})
				.attr('r',function(d){
					var radius = pointScale(self.intersections[d.placeName].length);
					return radius;
				});
			points.exit().remove();

			self.updateSidebar();
		},

		updateSidebar:function(){
			var self = vis;
			var place_city = self.focus.place.split('_')[0],
				place_country = self.focus.place.split('_')[1],
				place_string = place_city +', ' +place_country + ' → ' + self.intersections[self.focus.place].length;

			//update sidebar with placename
			d3.select('span#dateRange')
				.text(place_string);

			//update author list
			//first, get author array
			//next, build list of names
			var author_arr = self.intersections[self.focus.place];
			var auth_div,
				auth_name,
				auth_desc;

			auth_div = d3.select('#nav_auth')
				.selectAll('div.auth_div')
				.data(author_arr);
			auth_div.enter().append('div')
				.classed('auth_div',true);
			auth_div.exit().remove();
			auth_name = auth_div
				.selectAll('span.auth_name')
				.data(function(d){ return [d]; });
			auth_name.enter().append('span')
				.classed('auth_name',true);
			auth_name
				.text(function(d){
					return self.data.authors[d].name;
				});
			auth_name.exit().remove();
			auth_desc = auth_div
				.selectAll('span.auth_desc')
				.data(function(d){ return [d]; });
			auth_desc.enter().append('span')
				.classed('auth_desc',true);
			auth_desc
				.text(function(d){
					return self.data.authors[d].description;
				});
			auth_desc.exit().remove();
		},

		//filter data based on state of navigation
		filterData:function(){
			var self = vis;

			self.date.start = new Date('2001-01-11');
			self.date.end = new Date('2001-04-18');

			//convert dates to timestamps
			var tStamp_start = self.date.start.getTime(),
				tStamp_end = self.date.end.getTime();

			//filter intersections (points) first
			d3.keys(self.data.intersections).forEach(function(d,i){

				//get timestamp of current data point
				var tStamp_currentDatum = new Date(d).getTime();

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
				}
			});

			//filter trajectories next
			d3.keys(self.data.trajectories).forEach(function(d,i){

				//get timestamp of current data point
				var tStamp_currentDatum = new Date(d).getTime();

				//only pull elements after the start date and before the end date
				if(tStamp_currentDatum >tStamp_start && tStamp_currentDatum <tStamp_end){
					self.data.trajectories[d].forEach(function(_d,_i){
						self.trajectories.push(_d);
					});
				}
			});
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
