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
		intersections_journeys:{},

		trajectories:[],

		//date slider variables
		dt_from:"1913-06-25",
        dt_to:"2016-11-24",
        
        dt_cur_from:null,
        dt_cur_to:null,

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
			var datasets = ['continents','intersections','trajectories','places','authors'],
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

		//generates date slider
		generateDateSlider:function(){

			var self = vis;
			var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

            $('.slider-time').html("Jun. 1913"); //Should pull from "self.dt_from"
            $('.slider-time2').html("Nov. 2016");

            var min_val = Date.parse(self.dt_from)/1000;
            var max_val = Date.parse(self.dt_to)/1000;

            function formatDT(__dt) {
                var year = __dt.getFullYear();
                var month = months[__dt.getMonth()];
                //var date = zeroPad(__dt.getDate(), 2);
                
                return month + '. ' + year;
            };

            $("#slider-range").slider({
                range:true,
                min:min_val,
                max:max_val,
                step:10,
                values:[min_val, max_val],
                slide:function (e, ui) {
                    self.dt_cur_from = new Date(ui.values[0]*1000); //.format("yyyy-mm-dd hh:ii:ss");
                    $('.slider-time').html(formatDT(self.dt_cur_from));

                    self.dt_cur_to = new Date(ui.values[1]*1000); //.format("yyyy-mm-dd hh:ii:ss");                
                    $('.slider-time2').html(formatDT(self.dt_cur_to));

                    self.filterData();
					self.generate_lines();
					self.generate_points();
					self.updateSidebar();
                }
            });
		},

		//generates visualization
		generate:function(){
			var self = vis;

			self.svg = d3.select('#container').append('svg')
				.attr('width',self.width)
				.attr('height',self.height)
				.on('click',function(){
					d3.select('#nav_place span').text('');
					d3.select('#nav_auth').html('');
					d3.selectAll('.selected').classed('selected',false);
				});

			if(!self.focus.place || self.focus.place && self.focus.place === 0){
				self.focus.place = "Paris_France";
			}

			self.projection = d3.geo.mercator()
				.scale(220)
				.translate([self.width*0.36,self.height*0.6])
				;

			self.path = d3.geo.path()
				.projection(self.projection);

			//var features = topojson.feature(self.data.countries,self.data.countries.objects.countries);
			var features = topojson.feature(self.data.continents,self.data.continents.objects.continents);

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

			self.generate_lines();
			self.generate_points(self.generate_legend);

			self.updateSidebar();
		},

		generate_lines:function(){
			var self = vis;

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
					var selector_A = d.ArCiCo.replace(/ /g, ''),
						selector_D = d.DptCiCo.replace(/ /g, '')
						selected = (d.ArCiCo === self.focus.place || d.DptCiCo === self.focus.place) ? 'selected' : '';
					return 'trajectory ' +selector_A +' ' +selector_D +' ' +d.AuthorID +' ' +selected;
				})
				/*.classed('tier',function(d){
					return d.tier >0;
				})*/
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
						dr = Math.sqrt((dx +d.tier) * (dx +d.tier) + (dy +d.tier) * (dy +d.tier));
					return 'M' + source.x + ',' + source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + target.x + ',' + target.y;
				});
			trajectories.exit().remove();
		},

		generate_points:function(_callback){
			var self = vis;

			//define min and max radii
			//define point scale
			var minR = 0.5,
				maxR = 15;
			var pointScale = d3.scale.linear()
				.domain([0,10])	//min and max of final data
				.range([minR,maxR]);

			//define all variables needed for plotting points
			var pointG,

				pointBacks,
				points,

				points_YearSpec,
				points_MonthSpec,

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

				//get specificity
				obj.specY = self.intersections[d].filter(function(_d){ return _d.specificity === "Y"; }).length;
				obj.specM = self.intersections[d].filter(function(_d){ return _d.specificity === "M"; }).length;
				obj.specD = self.intersections[d].filter(function(_d){ return _d.specificity === "D"; }).length;

				pointData.push(obj);
			});

			//point holder
			pointG = self.svg.selectAll('g.pointG')
				.data(pointData);
			pointG.enter().append('g')
				.classed('pointG',true);
			pointG
				.attr('class',function(d){
					var selector = d.placeName.replace(/ /g, '');
					return 'pointG ' +selector;
				})
				.classed('selected',function(d){
					return d.placeName === self.focus.place;
				});
			pointG
				.on('mouseover',function(d){
					var selector = d.placeName.replace(/ /g, '');
					d3.selectAll('.hov').classed('hov',false);
					d3.selectAll('.' +selector).classed('hov',true);
				})
				.on('mouseout',function(d){
					d3.selectAll('.hov').classed('hov',false);
				})
				.on('click', function(d){

					//set focus
					self.focus.place = d.placeName;

					d3.selectAll('.selected').classed('selected',false);
					//d3.select(this).classed('selected',true);
					d3.selectAll('.' +self.focus.place).classed('selected',true);

					//update sidebar
					self.updateSidebar();

					//prevent event bubbling
					d3.event.stopPropagation();
				});
			pointG.exit().remove();

			//plot background circles (two groups)
			points_YearSpec = pointG.selectAll('circle.points_YearSpec')
				.data(function(d){ return [d]; });
			points_YearSpec.enter().append('circle')
				.classed('points_YearSpec',true);
			points_YearSpec
				.classed('marker',true)
				.attr('cx',function(d,i){
					return d.posX;
				})
				.attr('cy',function(d){
					return d.posY;
				})
				.attr('r',function(d){
					var radius = pointScale(d.specD +d.specM +d.specY);
					return radius;
				});
			points_YearSpec.exit().remove();
			points_MonthSpec = pointG.selectAll('circle.points_MonthSpec')
				.data(function(d){ return [d]; });
			points_MonthSpec.enter().append('circle')
				.classed('points_MonthSpec',true);
			points_MonthSpec
				.classed('marker',true)
				.attr('cx',function(d,i){
					return d.posX;
				})
				.attr('cy',function(d){
					return d.posY;
				})
				.attr('r',function(d){
					var radius = pointScale(d.specD +d.specM);
					return radius;
				});
			points_MonthSpec.exit().remove();
			
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
					var radius = pointScale(d.specD);
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
					var radius = pointScale(d.specD);
					return radius;
				});
			points.exit().remove();

			if(_callback){
				_callback(pointScale);
			}
		},

		generate_legend:function(_scale){
			var self = vis;
			var scale = _scale;

			//legend
			var legend,
				legendLabels,
				legendTrajectory,
				legendTrajectoryLabel,

				legend_ySpace = 15;
			var legendData = [
					'Specificity — Day',
					'Specificity — Month',
					'Specificity — Year',
					'1 intersection',
					'3 intersections',
					'6 intersections'
				];
			legend = d3.select('#nav_legend svg').selectAll('circle.marker')
				.data(legendData);
			legend.enter().append('circle')
				.classed('marker',true);
			legend
				.attr('class',function(d,i){
					var spec = i === 1 ? 'points_MonthSpec' : i === 2 ? 'points_YearSpec' : '';
					return 'marker ' +spec;
				})
				.attr('cx',function(d,i){
					var xpos = i <3 ? 150 : 15;
					return xpos;
				})
				.attr('cy',function(d,i){
					var ypos = (i%3)*legend_ySpace +15;
					return ypos;
				})
				.attr('r',function(d,i){
					var rad = 0;
					if(i <3){
						rad = scale(2);
					} else{
						rad = +d.split(' ')[0];
					}
					return rad;
				});
			legend.exit().remove();
			legendLabels = d3.select('#nav_legend svg').selectAll('text.legendLabel')
				.data(d3.merge([legendData,['Journey trajectory']]));
			legendLabels.enter().append('text')
				.classed('legendLabel',true);
			legendLabels
				.attr('x',function(d,i){
					var xpos;
					if(i <6){
						xpos = i <3 ? 165 : 27;
					} else{
						xpos = 165;
					}
					return xpos;
				})
				.attr('y',function(d,i){
					var ypos;
					if(i <6){
						ypos = (i%3)*legend_ySpace +18;
					} else{
						ypos = 3*legend_ySpace +18;
					}
					return ypos;
				})
				.text(function(d){
					var str = d;
					return str;
				});
			legendLabels.exit().remove();
			legendTrajectory = d3.select('#nav_legend svg').selectAll('path.legendTrajectory')
				.data([self]);
			legendTrajectory.enter().append('path')
				.classed('legendTrajectory',true);
			legendTrajectory
				.attr('d',function(d){

					var source = {},
						target = {};

					source.x = 100;
					source.y = 60;

					target.x = 150;
					target.y = 60;

					var f = 20;

					//this is a path builder -- creates a curved line between points
					//src: http://stackoverflow.com/questions/13455510/curved-line-on-d3-force-directed-tree
					var dx = target.x -source.x,
						dy = target.y -source.y,
						dr = Math.sqrt((dx +f) * (dx +f) + (dy +f) * (dy +f));
					return 'M' + source.x + ',' + source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + target.x + ',' + target.y;
				});
			legendTrajectory.exit().remove();
		},

		updateSidebar:function(){
			var self = vis;
			var place_city = self.focus.place.split('_')[0],
				place_country = self.focus.place.split('_')[1],
				place_string = place_city +', ' +place_country;// + ' → ' + self.intersections[self.focus.place].length;

			//update sidebar with placename
			d3.select('#nav_place span')
				.text(place_string);

			//update author list
			//first, get author array
			//next, build list of names
			var author_arr = self.intersections_journeys[self.focus.place];
			var nav_auth,
				auth_div,
				auth_name,
				auth_desc;

			nav_auth = d3.select('#nav_auth')
				.style('height',function(){
					return window.innerHeight -(window.innerWidth*0.03) -350 +'px';
				})
				.style('opacity',1);
			legend = d3.select('#nav_legend').style('opacity',1);

			auth_div = nav_auth
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
				.attr('class',function(d){
					return 'auth_name ' +d.AuthorID;
				})
				.text(function(d){
					var str = ''; 
					if(self.data.authors[d.AuthorID]){
						str = self.data.authors[d.AuthorID].name;
					}
					return str;
				});
			auth_name.exit().remove();
			auth_desc = auth_div
				.selectAll('span.auth_desc')
				.data(function(d){ return [d]; });
			auth_desc.enter().append('span')
				.classed('auth_desc',true);
			auth_desc
				.html(function(d){
					var str_date = d.date,
						str_pl_1 = '',
						str_pl_2 = '',

						dpt = d.DptCiCo.split('_').join(', '),
						arr = d.ArCiCo.split('_').join(', ');

					//date formatting
					if(d.specificity === 'D'){
						str_date = d.date;
					} else if(d.specificity === 'M'){
						var dd = d.date.split('-');
						str_date = [dd[0],dd[1]].join('-');
					} else if(d.specificity === 'Y'){
						var dd = d.date.split('-');
						str_date = dd[0];
					}

					//journey formatting
					if(d.ArCiCo === self.focus.place){
						str_pl_1 = "<span>" +dpt +"</span>";
						str_pl_2 = "<span class='focus'>" +arr +"</span>";
					} else if(d.DptCiCo === self.focus.place){
						str_pl_1 = "<span class='focus'>" +dpt +"</span>";
						str_pl_2 = "<span>" +arr +"</span>";
					}

					return "<div class='sidebar_date'>" +str_date +"</div><div class='journey'>" +str_pl_1 +"<span>&nbsp;&rarr;&nbsp;</span>" +str_pl_2 +"</div>";
				});
			auth_desc.exit().remove();
		},

		//filter data based on state of navigation
		filterData:function(){
			var self = vis;

			self.trajectories = [];
			self.intersections = {};

			self.date.start = new Date(self.dt_cur_from || self.dt_from);
			self.date.end = new Date(self.dt_cur_to || self.dt_to);

			//convert dates to timestamps
			var tStamp_start = self.date.start.getTime(),
				tStamp_end = self.date.end.getTime();

			//filter intersections (points) first
			d3.keys(self.data.intersections).forEach(function(d,i){

				//get timestamp of current data point
				var tStamp_currentDatum = new Date(d).getTime();

				//only pull elements after the start date and before the end date
				if(tStamp_currentDatum >tStamp_start && tStamp_currentDatum <tStamp_end){

					d3.keys(self.data.intersections[d]).forEach(function(_d,_i){
						
						if(!self.intersections[_d]){
							self.intersections[_d] = [];
						}
						self.data.intersections[d][_d].forEach(function(__d,__i){
						
							var val_map = {
									"Y":0,
									"M":1,
									"D":2
								};

							//note to EF: it's been a while, but you actually wrote this part, not me!
							var authorAccountedFor,
								authorFilteredList;
							
							//return a list of authors in this place-array that match the current author
							//(the length of this list should never be above 1)
							authorFilteredList = self.intersections[_d].filter(function(a){ 
								return a['AuthorID'] === __d['AuthorID']; 
							});
							
							//the author is accounted for if the returned list has a length greater than zero
							authorAccountedFor = authorFilteredList && authorFilteredList.length >0;

							//if the author is NOT accounted for, account for it by adding it to the array
							//(it will be returned in the filtered list the next time this author ID is searched)
							if(!authorAccountedFor){
								self.intersections[_d].push(__d);
							} else{

								//if the author IS accounted for, but at a lower level of specificity, up the level of specificity
								if(val_map[authorFilteredList[0].specificity] <val_map[__d.specificity]){
									authorFilteredList[0].specificity = __d.specificity;
								}
							}
						});
					});
				}
			});

			//run through intersections dataset to create a list of authors and journeys for each
			//this part just sets up the empty arrays for each location
			//populate below, when filtering through the trajectories.json dataset
			//this dataset is for the sidebar
			d3.keys(self.intersections).forEach(function(d){
				self.intersections_journeys[d] = [];
			});

			//create empty array to keep track of DptCiCo_ArCiCo pairs
			placePairs = [];

			//filter trajectories next
			d3.keys(self.data.trajectories).forEach(function(d,i){

				//get timestamp of current data point
				var tStamp_currentDatum = new Date(d).getTime();

				//only pull elements after the start date and before the end date
				if(tStamp_currentDatum >tStamp_start && tStamp_currentDatum <tStamp_end){

					//add each trajectory inside each date array to trajectories array
					self.data.trajectories[d].forEach(function(_d,_i){

						//create variable for trajectory count (to avoid stacking)
						var tier = 0;

						//concat placepair string
						var placePair = [_d.ArCiCo,_d.DptCiCo].join('_');
		
						if(placePairs.indexOf(placePair) <0){
							tier = 0;
						} else{
							tier = placePairs.filter(function(_d){ return _d === placePair; })[0].length +1;
						}
						placePairs.push(placePair);

						_d.tier = tier;
						self.trajectories.push(_d);
					});

					//add entry to intersections_journeys dataset
					self.data.trajectories[d].forEach(function(_d,_i){

						var obj = _d;
						obj.date = d;

						//add entry to the 'journeys' dataset for the departing city
						self.intersections_journeys[_d.ArCiCo].push(obj);

						//add entry to the 'journeys' dataset for the arriving city
						self.intersections_journeys[_d.DptCiCo].push(obj);
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
vis.generateDateSlider();
vis.getData(vis.processData);