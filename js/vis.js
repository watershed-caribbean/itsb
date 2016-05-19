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

            // function zeroPad(num, places) {
            //   var zero = places - num.toString().length + 1;
            //   return Array(+(zero > 0 && zero)).join("0") + num;
            // }

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
				self.focus.place = "Hanoi_Vietnam";
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
			self.generate_points();

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
					return 'trajectory ' +d.ArCiCo +' ' +d.DptCiCo;
				})
				/*.classed('tier',function(d){
					return d.tier >0;
				})*/
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
						dr = Math.sqrt((dx +d.tier) * (dx +d.tier) + (dy +d.tier) * (dy +d.tier));
					return 'M' + source.x + ',' + source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + target.x + ',' + target.y;
				});
			trajectories.exit().remove();
		},

		generate_points:function(){
			var self = vis;

			//define min and max radii
			//define point scale
			var minR = 2,
				maxR = 18;
			var pointScale = d3.scale.linear()
				.domain([0,10])	//min and max of final data
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

				//creates properties for the different specifity values
				//let's just store these as raw counts
				obj.specD = 0;
				obj.specM = 0;
				obj.specY = 0;

				self.intersections[d].forEach(function(_d,_i){
					if(_d.specificity === "Y"){
						obj.specD++;
					} else if(_d.specificity === "M"){
						obj.specM++;
					} else if(_d.specificity === "D"){
						obj.specY++;
					};
				});

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
				.attr('class',function(d){
					return 'pointG ' +d.placeName;
				})
				.classed('selected',function(d){
					return d.placeName === self.focus.place;
				});
			pointG
				.on('mouseover',function(d){
					d3.selectAll('.hov').classed('hov',false);
					d3.selectAll('.' +d.placeName).classed('hov',true);
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
				.attr('r',function(d){
					var radius = pointScale(d.specD + d.specM + d.specY);
					return radius;
				});
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
				.attr('r',function(d){
					var radius = pointScale(d.specD + d.specM);
					return radius;
				});
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
					//var radius3 = pointScale(d.specD.length + 1);
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
		},

		updateSidebar:function(){
			var self = vis;
			var place_city = self.focus.place.split('_')[0],
				place_country = self.focus.place.split('_')[1],
				place_string = place_city +', ' +place_country + ' → ' + self.intersections[self.focus.place].length;

			//update sidebar with placename
			d3.select('#nav_place span')
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
				.data(function(d){ return [d.AuthorID]; });
			auth_name.enter().append('span')
				.classed('auth_name',true);
			auth_name
				.text(function(d){
					var str; 
					if(self.data.authors[d]){
						str = self.data.authors[d].name;
					} else{
						str = '';
					}
					return str;
				});
			auth_name.exit().remove();
			auth_desc = auth_div
				.selectAll('span.auth_desc')
				.data(function(d){ return [d.AuthorID]; });
			auth_desc.enter().append('span')
				.classed('auth_desc',true);
			auth_desc
				.text(function(d){
					var str; 
					if(self.data.authors[d]){
						str = self.data.authors[d].description;
					} else{
						str = '';
					}
					return str;
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
							//if(self.intersections[_d].indexOf(__d) <0){
							//note to EF: it's been a while, but you actually wrote this part, not me!
							var authorAccountedFor,
								authorFilteredList;
							
							//return a list of authors in this place-array that match the current author
							authorFilteredList = self.intersections[_d].filter(function(a){ 
								return a['AuthorID'] === __d['AuthorID']; 
							});
							
							//the author is accounted for if the returned list has a length greater than zero
							authorAccountedFor = authorFilteredList && authorFilteredList.length >0;

							//if the author is NOT accounted for, account for it by adding it to the array
							//(it will be returned in the filtered list the next time this author ID is searched)
							if(!authorAccountedFor){
								self.intersections[_d].push(__d);
							}
						});
					});
				}
			});

			//create empty array to keep track of DptCiCo_ArCiCo pairs
			placePairs = [];

			//filter trajectories next
			d3.keys(self.data.trajectories).forEach(function(d,i){

				//get timestamp of current data point
				var tStamp_currentDatum = new Date(d).getTime();

				//only pull elements after the start date and before the end date
				if(tStamp_currentDatum >tStamp_start && tStamp_currentDatum <tStamp_end){
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