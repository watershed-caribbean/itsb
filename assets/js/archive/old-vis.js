var init = function(){

	return {

		//empty loading array to hold pending datasets
		loading:[],

		//store screen height and width
		width:window.innerWidth,
		height:window.innerHeight,
		
		init:true,

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

		visible_authors:[],

		//date slider variables
		dt_from:"1913-06-25",
        dt_to:"2016-11-24",
        
        dt_cur_from:null,
        dt_cur_to:null,

        sidebar_mode:'trajectories',

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

                    self.update();
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
					self.focus.place = null;

					self.update();

					//d3.select('#nav_place span').text('');
					//d3.select('#nav_auth').html('');
					d3.selectAll('.selected').classed('selected',false);
				});

			if(!self.focus.place || self.focus.place === null){
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

		update:function(){
			var self = vis;

			self.filterData();
			self.generate_lines();
			self.generate_points();
			self.updateSidebar();
		},

		generate_lines:function(){
			var self = vis;

			//thank you, https://bl.ocks.org/mbostock/8027637
			function closestPoint(pathNode, point) {
			  var pathLength = pathNode.getTotalLength(),
			      precision = 8,
			      best,
			      bestLength,
			      bestDistance = Infinity;

			  // linear scan for coarse approximation
			  for (var scan, scanLength = 0, scanDistance; scanLength <= pathLength; scanLength += precision) {
			    if ((scanDistance = distance2(scan = pathNode.getPointAtLength(scanLength))) < bestDistance) {
			      best = scan, bestLength = scanLength, bestDistance = scanDistance;
			    }
			  }

			  // binary search for precise estimate
			  precision /= 2;
			  while (precision > 0.5) {
			    var before,
			        after,
			        beforeLength,
			        afterLength,
			        beforeDistance,
			        afterDistance;
			    if ((beforeLength = bestLength - precision) >= 0 && (beforeDistance = distance2(before = pathNode.getPointAtLength(beforeLength))) < bestDistance) {
			      best = before, bestLength = beforeLength, bestDistance = beforeDistance;
			    } else if ((afterLength = bestLength + precision) <= pathLength && (afterDistance = distance2(after = pathNode.getPointAtLength(afterLength))) < bestDistance) {
			      best = after, bestLength = afterLength, bestDistance = afterDistance;
			    } else {
			      precision /= 2;
			    }
			  }

			  best = [best.x, best.y];
			  best.distance = Math.sqrt(bestDistance);
			  return best;

			  function distance2(p) {
			    var dx = p.x - point[0],
			        dy = p.y - point[1];
			    return dx * dx + dy * dy;
			  }
			}

			//plot lines
			var trajectoriesG,
				trajectories;
			trajectoriesG = self.svg.selectAll('g.trajectoriesG')
				.data([self.trajectories]);
			trajectoriesG.enter().append('g')
				.classed('trajectoriesG',true);
			trajectoriesG.exit().remove();
			trajectories = trajectoriesG.selectAll('path.trajectory')
				.data(function(d){ return d; });
			trajectories.enter().append('path')
				.classed('trajectory',true);
			trajectories
				.attr('class',function(d){
					var selector_A = d.ArCiCo.replace(/ /g, ''),
						selector_D = d.DptCiCo.replace(/ /g, '')
						selected = (d.ArCiCo === self.focus.place || d.DptCiCo === self.focus.place) ? 'selected' : '';
					return 'trajectory ' +selector_A +' ' +selector_D +' ' +d.AuthorID +' ' +selected;
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

			//check of Google Chrome
			// please note, 
			// that IE11 now returns undefined again for window.chrome
			// and new Opera 30 outputs true for window.chrome
			// and new IE Edge outputs to true now for window.chrome
			// and if not iOS Chrome check
			// so use the below updated condition
			var isChromium = window.chrome,
			    winNav = window.navigator,
			    vendorName = winNav.vendor,
			    isOpera = winNav.userAgent.indexOf("OPR") > -1,
			    isIEedge = winNav.userAgent.indexOf("Edge") > -1,
			    isIOSChrome = winNav.userAgent.match("CriOS");

			//if(isIOSChrome){
			   // is Google Chrome on IOS
			//} else if(isChromium !== null && isChromium !== undefined && vendorName === "Google Inc." && isOpera == false && isIEedge == false) {
			   // is Google Chrome
			//} else { 
			   // not Google Chrome 
			//}

			//this is slow in any other browser but Chrome -- refactor in beta
			if(isChromium !== null && isChromium !== undefined && vendorName === "Google Inc." && isOpera == false && isIEedge == false) {
				//interaction handler for trajectories
				self.svg
					.on('mousemove',function(e){
						var m = d3.mouse(this),
							f = null,
							tt = false;

						//determine which path to focus on
						trajectories.classed('hov',function(d){
								var p = closestPoint(d3.select(this).node(),m),
									t = p.distance <2,
									c = false;
								if(t){
									c = !tt;
									f = d;
									tt = true;

									if(self.tt){
										self.tt.attr('transform',function(){
												var x = m[0],
													y = m[1],
													pad_x = 0,
													pad_y = -10;
												
												x +=pad_x;
												y +=pad_y;

												return 'translate(' +x +',' +y +')';
											});
										self.tt_content.text(d.Name + ': ' +d.DptCiCo.split('_').join(', ') +' → ' +d.ArCiCo.split('_').join(', '));
									}
								}
								return c;
							});
						
						if(self.tt){ 
							self.tt.attr('class',function(d){
								var v = tt ? 'visible' : '',
									a = f ? f.AuthorID : '';
								return v +' tt ' +a;
							}); 
						}
						d3.event.stopPropagation();
					});
			}
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
					var selector = d.placeName.replace(/ /g, ''),
						selected = d.placeName === self.focus.place ? 'selected' : '';
					return 'pointG ' +selector +' ' +selected;
				});
			pointG
				.on('mouseover',function(d){
					var selector = d.placeName.replace(/ /g, '');
					d3.selectAll('.hov').classed('hov',false);
					d3.selectAll('.' +selector).classed('hov',true);
					d3.event.stopPropagation();
				})
				.on('mouseout',function(d){
					d3.selectAll('.hov').classed('hov',false);
				})
				.on('click', function(d){

					//set focus
					self.focus.place = d.placeName;

					d3.selectAll('.selected').classed('selected',false);
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

			//create tooltip
			self.tt = self.svg.selectAll('g.tt')
				.data([self]);
			self.tt.enter().append('g')
				.classed('tt',true);
			self.tt
				.classed('visible',false);
			self.tt.exit().remove();
			self.tt_content = self.tt.selectAll('text.tt_content')
				.data(function(d){ return [d]; });
			self.tt_content.enter().append('text')
				.classed('tt_content',true);
			self.tt_content
				.text('');
			self.tt_content.exit().remove();

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
			var place_city = self.focus.place ? self.focus.place.split('_')[0] : '',
				place_country = self.focus.place ? self.focus.place.split('_')[1] : '',
				place_string = self.focus.place ? place_city +', ' +place_country : '(All locations)';

			//update sidebar with placename
			d3.select('#nav_place span')
				.text(place_string);
			
			var nav_auth,
				auth_div,
				auth_name,
				auth_desc,
				auth_input;

			nav_auth = d3.select('#nav_auth')
					.style('height',function(){
						return self.height -(self.width*0.03) -375 +'px';
					})
					.style('opacity',1);
			legend = d3.select('#nav_legend').style('opacity',1);

			//tab control
			var tabs = d3.selectAll('#nav_tabcontrol .btn');
			tabs
				.classed('selected_tab',function(){
					return this.id === self.sidebar_mode;
				})
				.on('click',function(){
					d3.selectAll('#nav_tabcontrol .btn.selected_tab').classed('selected_tab',false);
					d3.select(this).classed('selected_tab',true);
					self.sidebar_mode = this.id;

					if(self.sidebar_mode === 'trajectories'){
						showTrajectories();
					} else{
						showAuthors();
					}
				});

			if(self.sidebar_mode === 'trajectories'){
				showTrajectories();
			} else{
				showAuthors();
			}

			function showTrajectories(){

				//update author list
				//first, get author array
				//next, build list of names
				var author_arr = [];
				if(self.focus.place && self.intersections_journeys[self.focus.place]){
					author_arr = self.intersections_journeys[self.focus.place];
				} else if(self.focus.place === null){
					d3.keys(self.intersections_journeys).forEach(function(d){
						self.intersections_journeys[d].forEach(function(_d){ 
							if(author_arr.indexOf(_d) <0){
								author_arr.push(_d); 
							}
						});
					});
				}

				auth_div = nav_auth
					.selectAll('div.auth_div')
					.data(author_arr);
				auth_div.enter().append('div')
					.classed('auth_div',true);
				auth_div.exit().remove();
				auth_input = auth_div
					.selectAll('input.auth_input')
					.data(function(d){ return [d]; });
				auth_input.enter().append('input')
					.classed('auth_input',true);
				auth_input
					.style('display','none');
				auth_input.exit().remove();
				auth_name = auth_div
					.selectAll('span.auth_name')
					.data(function(d){ return [d]; });
				auth_name.enter().append('span')
					.classed('auth_name',true);
				auth_name
					.attr('class',function(d){
						return 'auth_name ' +d.AuthorID;
					})
					.style('width','100%')
					.style('padding-top','0')
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
						if(d.ArCiCo === self.focus.place || self.focus.place === null){
							str_pl_1 = "<span>" +dpt +"</span>";
							str_pl_2 = "<span class='focus'>" +arr +"</span>";
						} else if(d.DptCiCo === self.focus.place || self.focus.place === null){
							str_pl_1 = "<span class='focus'>" +dpt +"</span>";
							str_pl_2 = "<span>" +arr +"</span>";
						}

						return "<div class='sidebar_date'>" +str_date +"</div><div class='journey'>" +str_pl_1 +"<span>&nbsp;&rarr;&nbsp;</span>" +str_pl_2 +"</div>";
					});
				auth_desc.exit().remove();
			}

			function showAuthors(){

				//show all authors possible to view
				var author_arr = d3.entries(self.data.authors);
				
				auth_div = nav_auth
					.selectAll('div.auth_div')
					.data(author_arr);
				auth_div.enter().append('div')
					.classed('auth_div',true);
				auth_div.exit().remove();
				auth_input = auth_div
					.selectAll('input.auth_input')
					.data(function(d){ return [d]; });
				auth_input.enter().append('input')
					.classed('auth_input',true);
				auth_input
					.attr('type','checkbox')
					.property('checked',function(d){ 
						return self.visible_authors.indexOf(d.key) >-1;
					})
					.style('display','block')
					;
				auth_input
					.on('click',function(d){
						if(this.checked){
							self.visible_authors.push(d.key);
						} else{
							self.visible_authors = self.visible_authors.filter(function(_d){ return _d !== d.key; });
						}
						self.update();
						d3.event.stopPropagation();
					});
				auth_input.exit().remove();
				auth_name = auth_div
					.selectAll('span.auth_name')
					.data(function(d){ return [d]; });
				auth_name.enter().append('span')
					.classed('auth_name',true);
				auth_name
					.attr('class',function(d){
						return 'auth_name ' +d.key;
					})
					.style('width','auto')
					.style('padding-top','3px')
					.text(function(d){
						var str = ''; 
						if(self.data.authors[d.key]){
							str = self.data.authors[d.key].name;
						}
						return str;
					});
				auth_name.exit().remove();

				//unneeded
				auth_desc = auth_div.selectAll('span.auth_desc').remove();
			}
		},

		//filter data based on state of navigation
		filterData:function(){
			var self = vis;
			var refresh = true;

			self.trajectories = [];
			self.intersections = {};
			self.intersections_journeys = {};

			self.date.start = new Date(self.dt_cur_from || self.dt_from);
			self.date.end = new Date(self.dt_cur_to || self.dt_to);

			//convert dates to timestamps
			var tStamp_start = self.date.start.getTime(),
				tStamp_end = self.date.end.getTime();

			//if initial load, add all authors to visible authors array
			if(self.init){
				self.init = false;
				d3.keys(self.data.authors).forEach(function(d){ self.visible_authors.push(d); });
			}

			//filter intersections (points) first
			d3.keys(self.data.intersections).forEach(function(d,i){

				//get timestamp of current data point
				var tStamp_currentDatum = new Date(d).getTime();

				//only pull elements after the start date and before the end date
				if(tStamp_currentDatum >=tStamp_start && tStamp_currentDatum <=tStamp_end){

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
							var authorVisible,
								authorAccountedFor,
								authorFilteredList;

							//check if author is in visible_authors list
							authorVisible = self.visible_authors.indexOf(__d['AuthorID']) >-1;
							
							//return a list of authors in this place-array that match the current author
							//(the length of this list should never be above 1)
							authorFilteredList = self.intersections[_d].filter(function(a){ 
								return (a['AuthorID'] === __d['AuthorID']);
							});
							//the author is accounted for if the returned list has a length greater than zero
							authorAccountedFor = authorFilteredList && authorFilteredList.length >0;

							//if the author is NOT accounted for, account for it by adding it to the array
							//(it will be returned in the filtered list the next time this author ID is searched)
							if(authorVisible && !authorAccountedFor){
								self.intersections[_d].push(__d);
							} else if(authorVisible){

								//if the author IS accounted for, but at a lower level of specificity, up the level of specificity
								if(val_map[authorFilteredList[0].specificity] >val_map[__d.specificity]){
									authorFilteredList[0].specificity = __d.specificity;
								}
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

					//add each trajectory inside each date array to trajectories array
					self.data.trajectories[d].forEach(function(_d,_i){

						//check if author is in visible_authors list
						var authorVisible = self.visible_authors.indexOf(_d['AuthorID']) >-1;

						if(authorVisible){
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
						}
					});

					//add entry to intersections_journeys dataset for the sidebar
					self.data.trajectories[d].forEach(function(_d,_i){

						//check if author is in visible_authors list
						var authorVisible = self.visible_authors.indexOf(_d['AuthorID']) >-1;

						if(authorVisible){
							var obj = _d;
							obj.date = d;

							if(!self.intersections_journeys[_d.ArCiCo]){
								self.intersections_journeys[_d.ArCiCo] = [];
							}
							if(!self.intersections_journeys[_d.DptCiCo]){
								self.intersections_journeys[_d.DptCiCo] = [];
							}

							//add entry to the 'journeys' dataset for the departing city
							self.intersections_journeys[_d.ArCiCo].push(obj);

							//add entry to the 'journeys' dataset for the arriving city
							self.intersections_journeys[_d.DptCiCo].push(obj);
						}
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
