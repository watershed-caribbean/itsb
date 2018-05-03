/* global d3 */
/* global ui */

class CreateMap {
	
	constructor(){
		this.data = {};

		this.itineraries = {};
		this.trajectories = {};
		this.intersections = {};
		this.places = {};
		this.authors = {};  // {author_id: author_name}
    this.author_names = {}; // {author_name: author_id}
		this.continents = {};
		this.active_authors_t = [];

		//store screen height and width
		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.loading = [];

		this.range = [
			new Date(1890,1,1),
			new Date(2010,1,1)
		];
		this.date_start = this.range[0];
		this.date_end = this.range[1];

		/* Modes: (1) Intersections, (2) Trajectories, (3) Itineraries */
		
		d3.select('.panel').each(function(){
  		if (d3.select(this).classed('selected')){
    		self.mode = d3.select(this).attr('data-mode');
  		}
		});

		this.ttime = 45;
	}

	loading_manager(_elem){
		var self = this;
		
		//remove name of retrieved JSON document from loading array
		self.loading = self.loading.filter(function(d){ return d !== _elem; });

		if(self.loading.length === 0){
			self.process_data();
			self.setup();
			self.generate();
		}
	}

	get_data(){
		var self = this;
		var datasets = ['author_ids','intersections','itineraries','places','continents'];

		datasets.forEach(function(d){ self.loading.push(d); });
		datasets.forEach(function(d){

			var filepath = 'data/three_' +d +'.json';

			d3.json(filepath,function(e,_d){
				if(!e){
					self.data[d] = _d;
					self.loading_manager(d);
				}
			});
		});
	}

	process_data(){
		var self = this;
		
		self.continents = self.data.continents;

		//WEAKPOINT ** fix later
		//places
		d3.keys(self.data.places).forEach(function(d){
			var k = d.split(',');
			k[0] = k[0].trim().split(' ').join('-');
			k[1] = k[1].trim().split(' ').join('-');
			k = k.join('_').toLowerCase();
			self.places[k] = self.data.places[d];
			self.places[k].PlaceName = d;
		});

		//authors
		d3.keys(self.data.author_ids).forEach(function(k){
			self.authors[self.data.author_ids[k]] = k;
      self.author_names[k] = self.data.author_ids[k];
		});
		
		//intersections
		self.intersections = self.data.intersections;

		//trajectories
		self.trajectories = {};

		//itineraries
		self.itineraries = {};
		d3.keys(self.authors).forEach(function(d){
			if(!self.itineraries[d]){ self.itineraries[d] = []; }
		});
		d3.keys(self.data.itineraries).forEach(function(d){
			self.data.itineraries[d].forEach(function(_d){
				self.itineraries[_d.AuthorID].push(_d);
			});
		});
	}

	setup(){
		var self = this;

    /* Switch modes when tabs are clicked  */
    
		d3.selectAll(ui.dom.tabs).each(function() {
  		d3.select(this).on('click',function() {
    		self.switch_mode(d3.select(this).attr('data-mode'));
  		});
		});
		
		// Intersections setup
		
		this.intersections.map = d3.select(ui.dom.intersections.map.view)
		  .append('svg')
		  .attr('width','100%');
		  
    // Trajectories setup
    
		this.trajectories.map = d3.select(ui.dom.trajectories.map.view)
		  .append('svg')
		  .attr('width','100%');
        
    d3.select(ui.dom.trajectories.authors.list)
      .html(ui.generateAuthorList(this));
        
		this.svg = d3.select('#container')
			.append('svg')
			.attr('width',this.width);

        // Create left figure drop-down selector
        d3.select('#left_itinerary')
            .append('select')
            .attr('id','left_select')
            .on('change', function(){ self.route_change('left'); })
            .selectAll('option')
            .data(d3.keys(self.author_names)).enter()
            .append('option')
            .text(function (d) { return d; });

        // Create right figure drop-down selector
        d3.select('#right_itinerary')
            .append('select')
            .attr('id', 'right_select')
            .on('change', function(){ self.route_change('right'); })
            .selectAll('option')
            .data(d3.keys(self.author_names)).enter()
            .append('option')
            .text(function (d) { return d; });

        // Create left div for figure route
        this.left_svg = d3.select('#left_itinerary')
            .append('svg') //WAS "DIV"
            .attr('id', 'left_route');

        // Create right div for figure route
        this.right_svg = d3.select('#right_itinerary')
            .append('svg') //WAS "DIV"
            .attr('id', 'right_route');

        // Update left route and right route to show route for current figure
        self.route_change('left');
        self.route_change('right');
        
        
	}

	generate(){
    this.tear_down();
    
    switch(this.mode) {
      case 1:
      default:
        this.generate_int_map();
        break;
      case 2:
        this.generate_traj_map(); // TO DO: New function for trajectories
        break;
      case 3:
        this.generate_routes();
    }
	}
	
	/* !INTERSECTIONS MAP FUNCTION */

	generate_int_map(){
		var self = this;
		var focus = false;
		//var sidebar_tabs = d3.selectAll('.sidebar_tab'),
			//	sidebar_mode = 1;

		this.intersections.map.attr('height',this.height);

		//click handlers
		this.intersections.map.on('click',function(){
			d3.event.stopPropagation();
			unfocus();
			generate_sidebar();
		});
		
		//slider
		
		var sliderwidth = ui.dom.intersections.dateslider.offsetWidth;
		
		var scale = d3.time.scale()
			.domain(this.range);
					
		var scale_axis = d3.svg.axis()
			.orient('right')
			.ticks(10)
			.tickSize(sliderwidth - 2) //takes into account a 2px border
			.tickPadding(12);
			
		var slide = d3.slider()
			.scale(scale)
			.axis(scale_axis)
			.value([
				scale_value_converter(this.range[1]),
				scale_value_converter(this.range[0])
			])
			.orientation('vertical')
			.margin(0)
			.animate(false)
			.on('slide',function(evt,value){
				var v_1 = value[1] instanceof Date ? value[1] : new Date(value[1]),
						v_2 = value[0] instanceof Date ? value[0] : new Date(value[0]);
				
				self.date_start = scale_value_converter(v_1);
				self.date_end = scale_value_converter(v_2);

				// unfocus();
				update_datebar();
				update();
			})
			.on('slideend',function(evt,value){
				update();
			});
			

		//the slider library, though lightweight, is flawed
		//use this to convert the date values properly
		function scale_value_converter(_val){
			var s = d3.time.scale()
				.domain(scale.domain())
				.range([0,self.height])
				.nice(d3.time.month)
				;
			return s.invert((self.height -(s(_val))));
		}    

		var slider = d3.select(ui.dom.intersections.dateslider).call(slide);
		
		d3.select(ui.dom.intersections.dateslider).selectAll('text').attr("transform", "translate(-" + sliderwidth + ",20)").text(function(d){
  		return d3.select(this).text() + "s";
		});
		
		update_datebar();
				
		//map
		var projection = d3.geo.mercator()
			.scale(180)
			.translate([ui.dom.intersections.map.view.offsetWidth * 0.5,ui.dom.intersections.map.view.offsetHeight * 0.5]);
			
		var path = d3.geo.path().projection(projection);

		var features = topojson.feature(self.continents,self.continents.objects.continents);
		var intersections,
				intersections_unique;
		var points_target,
				points_g,
				points_backs,
				points_03,
				points_02,
				points_01;

		//draw vector map
		var map;
		map = self.intersections.map.selectAll('path.map')
			.data([features]);
		map.enter().append ('path')
			.classed('map',true);
		map
			.attr('d',path);
		map.exit().remove();

		function filter_data(){

			//clear objects
			intersections = {};
			intersections_unique = {};
			

			//INTERSECTIONS
			//filter by date range
			var holder = d3.entries(self.intersections).filter(function(d){
				var n = new Date(d.key);
				return n >=self.date_start && n <=self.date_end;
			});
			//get distinct places
			//slot author IDs into place
			//highest likelihood score wins
			holder.forEach(function(d){
				if(d3.keys(d.value).length >0){
					d3.keys(d.value).forEach(function(_d){
						if(!intersections[_d]){ 
							intersections[_d] = {}; 
							intersections[_d].figures = {}; 
						}
						d.value[_d].forEach(function(__d){
							if(!intersections[_d].figures[__d.AuthorID] || intersections[_d].figures[__d.AuthorID] >__d.Likelihood){
								intersections[_d].figures[__d.AuthorID] = __d.Likelihood;
							}
						});
					});
				}
			});
			//tally up totals
			
			// Assigns intersections lists dynamically
			
			d3.keys(intersections).forEach(function(d){
				intersections[d].lists = {};
			  for(var i=1;i <= Object.keys(self.authors).length; i++) {
  				var key = "_0" + i.toString();
  				intersections[d].lists[key] = d3.values(intersections[d].figures).filter(function(_d){ return _d === i; });
        }
			});
			
			//make list of unique intersections per place
			holder.forEach(function(d){
				d3.keys(d.value).forEach(function(_d){
					if(!intersections_unique[_d]){ intersections_unique[_d] = []; }
					d.value[_d].forEach(function(__d){
						if(intersections_unique[_d].filter(function(t){ return t.AuthorID === __d.AuthorID && t.EndDate === __d.EndDate; }).length === 0){
							intersections_unique[_d].push(__d);
						}
					});
				});
			});

		}

		function generate_points(){
  		
			//scale for radii
			var r_scale = d3.scale.linear()
				.domain([0,10])
				.range([0,36]);

			points_target = self.intersections.map.selectAll('g.points_target')
				.data([self]);
			points_target.enter().append('g')
				.classed('points_target',true);
			points_target.exit().remove();

			points_g = self.intersections.map.selectAll('g.points_g')
				.data(d3.entries(intersections));
			points_g.enter().append('g')
				.classed('points_g',true);
			points_g
				.attr('transform',function(d){
  				
					var p  = projection([
								self.places[d.key].Long,
								self.places[d.key].Lat
							]),
							px = p[0],
							py = p[1];
					return 'translate(' +px +',' +py +')';
				})
				.append('title')
				.text(function(d){
  				return self.places[d.key].PlaceName;
				});
			points_g
				.on('mousemove',function(d){
					d3.select(this)
						.transition()
						.duration(self.ttime)
						.attr('transform',function(_d){
							var p  = projection([
										self.places[_d.key].Long,
										self.places[_d.key].Lat
									]),
									px = p[0],
									py = p[1];
							return 'translate(' +px +',' +py +')scale(1.5)';
						});
				})
				.on('mouseout',function(d){
					d3.select(this)
						.transition()
						.duration(self.ttime/2)
						.attr('transform',function(_d){
							var p  = projection([
										self.places[_d.key].Long,
										self.places[_d.key].Lat
									]),
									px = p[0],
									py = p[1];
							return 'translate(' +px +',' +py +')scale(1)';
						});
				})
				.on('click',function(d){
					d3.event.stopPropagation();
					unfocus();
					if(d.key !== focus.key){
						focus = d;
						d3.select(this).classed('focus_point',true);
					}
					generate_sidebar();
				});
			points_g.exit().remove();

			//circlebacks (most certain size)
			points_backs = points_g.selectAll('circle.point_back')
				.data(function(d){ return [d.value.lists._01]; });
			points_backs.enter().append('circle')
				.classed('point_back',true);
			points_backs
				.attr('cx',0)
				.attr('cy',0)
				.attr('r',function(d){
					var r_tot = d.length +this.parentNode.__data__.value.lists._02.length +this.parentNode.__data__.value.lists._03.length;
					return r_scale(r_tot);
				});
			points_backs.exit().remove();

			//least certain
			points_01 = points_g.selectAll('circle.point_01')
				.data(function(d){ return [d.value.lists._01]; });
			points_01.enter().append('circle')
				.classed('point_01',true);
			points_01
				.classed('point',true)
				.attr('cx',0)
				.attr('cy',0)
				.attr('r',function(d){
					var r_tot = d.length +this.parentNode.__data__.value.lists._02.length +this.parentNode.__data__.value.lists._03.length;
					return r_scale(r_tot);
				});
			points_01.exit().remove();
				
			//certain
			points_02 = points_g.selectAll('circle.point_02')
				.data(function(d){ return [d.value.lists._02]; });
			points_02.enter().append('circle')
				.classed('point_02',true);
			points_02
				.classed('point',true)
				.attr('cx',0)
				.attr('cy',0)
				.attr('r',function(d){ 
					var r_tot = d.length +this.parentNode.__data__.value.lists._03.length;
					return r_scale(r_tot);
				});
			points_02.exit().remove();
				
			//most certain
			points_03 = points_g.selectAll('circle.point_03')
				.data(function(d){ return [d.value.lists._03]; });
			points_03.enter().append('circle')
				.classed('point_03',true);
			points_03
				.classed('point',true)
				.attr('cx',0)
				.attr('cy',0)
				.attr('r',function(d){
					var r_tot = d.length;
					return r_scale(r_tot);
				});
			points_03.exit().remove();
		}

		function generate_sidebar(){
			var o_scale = d3.scale.linear()
				.domain([0,3])
				.range([0.5,1]);

			if(focus){
				d3.select(ui.dom.intersections.results.title).html(self.places[focus.key].PlaceName);

				//var data = sidebar_mode === 1 ? (intersections_unique[focus.key] || []) : (trajectories_unique[focus.key]);
				var data = (intersections_unique[focus.key] || []);
				var items_target = d3.select(ui.dom.intersections.results.view);
				var items,
						items_date;

				items = items_target.selectAll('.item')
					.data(data);
				items.enter().append('div')
					.classed('item',true);
				items
					.attr('class',function(d){
						var idx = d3.keys(self.authors).indexOf(d.AuthorID);
						return 'item id_' +idx;
					})
					.style('opacity',function(d){
						return o_scale(d.Likelihood);
					})
					.html(function(d){
						return self.authors[d.AuthorID];
					});
				items.exit().remove();

				items_date = items.selectAll('div.item_date')
					.data(function(d){ return [d]; });
				items_date.enter().append('div')
					.classed('item_date',true);
				items_date
					.html(function(d){
						var str;
						str = d.StartDate && d.EndDate ? d.StartDate +'&nbsp;&ndash;&nbsp;' +d.EndDate : d.StartDate ? d.StartDate +'&nbsp;&ndash;' : d.EndDate ? '&nbsp;&ndash;' +d.EndDate : '';
						
						/* // Trajectory code
							var a1 = d.PlaceID === focus.key ? 'accent' : '',
									a2 = d.PlaceID_End && d.PlaceID_End === focus.key ? 'accent' : '';
							var p1 = '<span class="_' +d.Likelihood +' ' +a1 +'">' +self.places[d.PlaceID].PlaceName +'</span>',
									p2 = '<span class="_' +d.Likelihood_End +' ' +a2 +'">' +(d.PlaceID_End ? self.places[d.PlaceID_End].PlaceName : '') +'</span>';
							str = '<div class="b">' +(d.EndDate || '') +'</div><div>' +p1 +'&nbsp;&rarr;&nbsp;' +p2 +'</div>';
						*/
						return str;
					});
				items_date.exit().remove();

			} else{
				d3.select('#sidebar_title').html('');
				d3.select('#sidebar_items').html('');
			}
		}

		function update_datebar(){
			var f = d3.time.format('%b. %Y');
			d3.select('#date_start').html(f(self.date_start));
			d3.select('#date_end').html(f(self.date_end));
		}

		function update(){
			filter_data();
			generate_points();
			generate_sidebar();
		}

		function unfocus(){
			focus = false;
			d3.selectAll('.focus_point').classed('focus_point',false);
		}

		filter_data();
		generate_points();
		generate_sidebar();
	}
	
	/* !TRAJECTORIES MAP FUNCTION */
	
	generate_traj_map(){
  	  	
		var self = this;
		var focus = false;

		this.trajectories.map.attr('height',this.height);

		//click handlers
		this.trajectories.map.on('click',function(){
			d3.event.stopPropagation();
			unfocus();
			generate_sidebar();
		});
		
		// Manage active trajectory map authors
		
    d3.select(ui.dom.trajectories.authors.list)
      .selectAll('.author').each(function(){
        d3.select(this).on('click',function(){
          var elem = d3.select(this);          
          if (elem.classed('selected')) { // remove item from active list
            elem.classed('selected',false);
            var index = self.active_authors_t.indexOf(elem.attr('data-key'));
            if (index > -1) {
              self.active_authors_t.splice(index,1);
            }
          } else {
            elem.classed('selected',true);
            self.active_authors_t.push(elem.attr('data-key'));
          }
          
          update();
        });
      });
      
		//slider
		
		var sliderwidth = ui.dom.trajectories.dateslider.offsetWidth;
		
		console.log(sliderwidth);
		
		var scale = d3.time.scale()
			.domain(this.range);
					
		var scale_axis = d3.svg.axis()
			.orient('right')
			.ticks(10)
			.tickSize(sliderwidth - 2) //takes into account a 2px border
			.tickPadding(12);
			
		var slide = d3.slider()
			.scale(scale)
			.axis(scale_axis)
			.value([
				scale_value_converter(this.range[1]),
				scale_value_converter(this.range[0])
			])
			.orientation('vertical')
			.margin(0)
			.animate(false)
			.on('slide',function(evt,value){
				var v_1 = value[1] instanceof Date ? value[1] : new Date(value[1]),
						v_2 = value[0] instanceof Date ? value[0] : new Date(value[0]);
				
				self.date_start = scale_value_converter(v_1);
				self.date_end = scale_value_converter(v_2);

				// unfocus();
				update_datebar();
				update();
			})
			.on('slideend',function(evt,value){
				update();
			});
			

		//the slider library, though lightweight, is flawed
		//use this to convert the date values properly
		function scale_value_converter(_val){
			var s = d3.time.scale()
				.domain(scale.domain())
				.range([0,self.height])
				.nice(d3.time.month)
				;
			return s.invert((self.height -(s(_val))));
		}    

		var slider = d3.select(ui.dom.trajectories.dateslider).call(slide);
		
		d3.select(ui.dom.trajectories.dateslider).selectAll('text').attr("transform", "translate(-" + sliderwidth + ",20)");
		
		update_datebar();
				
		//map
		var projection = d3.geo.mercator()
			.scale(180)
			.translate([ui.dom.trajectories.map.view.offsetWidth * 0.5,ui.dom.trajectories.map.view.offsetHeight * 0.5]);
			
		var path = d3.geo.path().projection(projection);

		var features = topojson.feature(self.continents,self.continents.objects.continents);
		var intersections,
				intersections_unique,
				trajectories,
				trajectories_unique;
		var points_target,
				points_g,
				points_backs,
				points_03,
				points_02,
				points_01,

				lines_target,
				lines_g,
				lines;

		//draw vector map
		var map;
		map = self.trajectories.map.selectAll('path.map')
			.data([features]);
		map.enter().append ('path')
			.classed('map',true);
		map
			.attr('d',path);
		map.exit().remove();

		function filter_data(){
  		  		
			//clear objects
			intersections = {};
			intersections_unique = {};
			trajectories = {};
			trajectories_unique = {};
			
			//INTERSECTIONS
			//filter by date range
			var holder = d3.entries(self.intersections).filter(function(d){  			
				var n = new Date(d.key);
				return n >=self.date_start && n <=self.date_end;
			});
			
			
			//get distinct places
			//slot author IDs into place
			//highest likelihood score wins
			holder.forEach(function(d){
				if(d3.keys(d.value).length >0){
					d3.keys(d.value).forEach(function(_d){  // _d is city key
  					
  					
  					// Check to see if there is at least 1 valid author
  					var b = 0;
  					
            d.value[_d].forEach(function(__d){
              if (self.active_authors_t.indexOf(__d.AuthorID) > -1) {
                b++;
              }
            });
                        
            if (b==0) { return; }
  					
  					// Create entry
  					
						if(!intersections[_d]){ 
							intersections[_d] = {}; 
							intersections[_d].figures = {}; 
						}
						
				    // Only add valid authors
				    		
						d.value[_d].forEach(function(__d){
							if((!intersections[_d].figures[__d.AuthorID] || intersections[_d].figures[__d.AuthorID] >__d.Likelihood) && self.active_authors_t.indexOf(__d.AuthorID) > -1){
								intersections[_d].figures[__d.AuthorID] = __d.Likelihood;
								intersections[_d].info = d.value[_d];
							}
						});
					});
				}
			});
			//tally up totals
			
			// Assigns intersections lists dynamically
			
			d3.keys(intersections).forEach(function(d){
				intersections[d].lists = {};
			  for(var i=1;i <= Object.keys(self.authors).length; i++) {
  				var key = "_0" + i.toString();
  				intersections[d].lists[key] = d3.values(intersections[d].figures).filter(function(_d){ return _d === i; });
        }
			});
			
			//make list of unique intersections per place
			holder.forEach(function(d){
				d3.keys(d.value).forEach(function(_d){
					if(!intersections_unique[_d]){ intersections_unique[_d] = []; }
					d.value[_d].forEach(function(__d){
						if(intersections_unique[_d].filter(function(t){ return t.AuthorID === __d.AuthorID && t.EndDate === __d.EndDate; }).length === 0){
							intersections_unique[_d].push(__d);
						}
					});
				});
			});

			//TRAJECTORIES
			holder.forEach(function(d){
				d3.keys(d.value).forEach(function(_d){
					d.value[_d].forEach(function(__d){
						if(!trajectories[__d.AuthorID]){ trajectories[__d.AuthorID] = []; }
						if(trajectories[__d.AuthorID].filter(function(t){ return t.PlaceID === __d.PlaceID && t.EndDate === __d.EndDate; }).length === 0){
							trajectories[__d.AuthorID].push(__d);
						}
					});
				});
			});
			
			
			
      for (var author in trajectories) {
       if (self.active_authors_t.indexOf(author) == -1) {
         delete trajectories[author];
       } 
      }
                  
			//pair up start and end points
			var tier = 0;
			for(var i=0; i<d3.keys(trajectories).length; i++){
				for(var j=0; j<trajectories[d3.keys(trajectories)[i]].length -1; j++){
					trajectories[d3.keys(trajectories)[i]][j].PlaceID_End = trajectories[d3.keys(trajectories)[i]][j+1].PlaceID;
					trajectories[d3.keys(trajectories)[i]][j].Likelihood_End = trajectories[d3.keys(trajectories)[i]][j+1].Likelihood;
					trajectories[d3.keys(trajectories)[i]][j].tier = tier;
					tier=(j%2)*10;
				} 
			}
						
			//make list of unique trajectories per place
			d3.keys(intersections).forEach(function(d){
				if(!trajectories_unique[d]){ trajectories_unique[d] = []; }
			});
			
			d3.values(trajectories).forEach(function(d){
				d.forEach(function(_d){ 
					if(!trajectories_unique[_d.PlaceID]){ trajectories_unique[_d.PlaceID] = []; }
					if(!trajectories_unique[_d.PlaceID_End]){ trajectories_unique[_d.PlaceID_End] = []; }
					trajectories_unique[_d.PlaceID].push(_d);
					if(_d.PlaceID_End){ trajectories_unique[_d.PlaceID_End].push(_d); }
				});
			});
						
		}

		function generate_lines(){

			lines_target = self.trajectories.map.selectAll('g.lines_target')
				.data([self]);
			lines_target.enter().append('g')
				.classed('lines_target',true);
			lines_target.exit().remove();

			lines_g = lines_target.selectAll('g.lines_g')
				.data(d3.entries(trajectories));
			lines_g.enter().append('g')
				.classed('lines_g',true);
			lines_g
				.attr('class',function(d){
					return 'lines_g id_' +d3.keys(self.authors).indexOf(d.key);
				});
			lines_g.exit().remove();

			lines = lines_g.selectAll('path.line')
				.data(function(d){ return d.value.filter(function(_d){ return _d.PlaceID_End; }); });
			lines.enter().append('path')
				.classed('line',true);
			lines
				.attr('d',function(d){
					var source = {},
							target = {};
					var p_1 = d.PlaceID || d.PlaceID_End,
							p_2 = d.PlaceID_End || d.PlaceID;
							
					//isolate x and y start coordinates using projection
					source = projection([
						self.places[p_1].Long,
						self.places[p_1].Lat
					]);
					// if(!self.places[p_2]){debugger;}
					//isolate x and y end coordinates using projection
					target = projection([
						self.places[p_2].Long,
						self.places[p_2].Lat
					]);
					
					//this is a path builder -- creates a curved line between points
					//src: http://stackoverflow.com/questions/13455510/curved-line-on-d3-force-directed-tree
					var dx = target[0] -source[0],
							dy = target[1] -source[1],
							dr = Math.sqrt((dx +d.tier) * (dx +d.tier) + (dy +d.tier) * (dy +d.tier));
					return 'M' + source[0] + ',' + source[1] + 'A' + dr + ',' + dr + ' 0 0,1 ' + target[0] + ',' + target[1];
				});
			lines.exit().remove();
		}

		function generate_points(){
  		  		  		
			//scale for radii
			var r_scale = d3.scale.linear()
				.domain([0,10])
				.range([0,36]);
				
			points_target = self.trajectories.map.selectAll('g.points_target')
				.data([self]);
			points_target.enter().append('g')
				.classed('points_target',true);
			points_target.exit().remove();

			points_g = self.trajectories.map.selectAll('g.points_g')
				.data(d3.entries(intersections));
			points_g.enter().append('g')
				.classed('points_g',true);
			points_g
				.attr('transform',function(d){
					var p  = projection([
								self.places[d.key].Long,
								self.places[d.key].Lat
							]),
							px = p[0],
							py = p[1];
					return 'translate(' +px +',' +py +')';
				})
				.append('title')
				.text(function(d){
  				var tooltip = [];
  				tooltip.push(self.places[d.key].PlaceName);
  				
  				// Add names and citations
  				for(var i=0;i< d.value.info.length;i++) {
    				var info = []
    				info.push(self.authors[d.value.info[i].AuthorID]);
    				
    				if (d.value.info[i].StartDate != "") {
      				info.push(" \nFrom: " + d.value.info[i].StartDate.toString());
    				}
    				
            if(d.value.info[i].StartCitation != "") {
              info.push(" (" + d.value.info[i].StartCitation.toString() + ")")            
            }    				
    				if (d.value.info[i].EndDate != '') {
      				info.push("\nUntil: " + d.value.info[i].EndDate);
    				}
    				
    				if (d.value.info[i].EndDate != '') {
              info.push(" (" + d.value.info[i].StartCitation.toString() + ")");
    				}
    				
    				info.push("\n");
    				tooltip.push(info.join(''));
  				}
  				
  				return tooltip.join("\n");
				});
			points_g
				.on('mousemove',function(d){
					d3.select(this)
						.transition()
						.duration(self.ttime)
						.attr('transform',function(_d){
							var p  = projection([
										self.places[_d.key].Long,
										self.places[_d.key].Lat
									]),
									px = p[0],
									py = p[1];
							return 'translate(' +px +',' +py +')scale(1.5)';
						});
				})
				.on('mouseout',function(d){
					d3.select(this)
						.transition()
						.duration(self.ttime/2)
						.attr('transform',function(_d){
							var p  = projection([
										self.places[_d.key].Long,
										self.places[_d.key].Lat
									]),
									px = p[0],
									py = p[1];
							return 'translate(' +px +',' +py +')scale(1)';
						});
				})
				.on('click',function(d){
					d3.event.stopPropagation();
					unfocus();
					if(d.key !== focus.key){
						focus = d;
						d3.select(this).classed('focus_point',true);
					}
					generate_sidebar();
				});
			points_g.exit().remove();

			//circlebacks (most certain size)
			points_backs = points_g.selectAll('circle.point_back')
				.data(function(d){ return [d.value.lists._01]; });
			points_backs.enter().append('circle')
				.classed('point_back',true);
			points_backs
				.attr('cx',0)
				.attr('cy',0)
				.attr('r',function(d){
					return r_scale(1);
				});
			points_backs.exit().remove();

			//least certain
			points_01 = points_g.selectAll('circle.point_01')
				.data(function(d){ return [d.value.lists._01]; });
			points_01.enter().append('circle')
				.classed('point_01',true);
			points_01
				.classed('point',true)
				.attr('cx',0)
				.attr('cy',0)
				.attr('r',function(d){
					return r_scale(1);
				});
			points_01.exit().remove();
				
			//certain
			points_02 = points_g.selectAll('circle.point_02')
				.data(function(d){ return [d.value.lists._02]; });
			points_02.enter().append('circle')
				.classed('point_02',true);
			points_02
				.classed('point',true)
				.attr('cx',0)
				.attr('cy',0)
				.attr('r',function(d){ 
					return r_scale(1);
				});
			points_02.exit().remove();
				
			//most certain
			points_03 = points_g.selectAll('circle.point_03')
				.data(function(d){ return [d.value.lists._03]; });
			points_03.enter().append('circle')
				.classed('point_03',true);
			points_03
				.classed('point',true)
				.attr('cx',0)
				.attr('cy',0)
				.attr('r',function(d){
					var r_tot = d.length;
					return r_scale(r_tot);
				});
			points_03.exit().remove();
		}

		function generate_sidebar(){
			var o_scale = d3.scale.linear()
				.domain([0,3])
				.range([0.5,1]);

			if(focus){
				d3.select(ui.dom.intersections.results.title).html(self.places[focus.key].PlaceName);

				//var data = sidebar_mode === 1 ? (intersections_unique[focus.key] || []) : (trajectories_unique[focus.key]);
				var data = (intersections_unique[focus.key] || []);
				var items_target = d3.select(ui.dom.intersections.results.view);
				var items,
						items_date;

				items = items_target.selectAll('.item')
					.data(data);
				items.enter().append('div')
					.classed('item',true);
				items
					.attr('class',function(d){
						var idx = d3.keys(self.authors).indexOf(d.AuthorID);
						return 'item id_' +idx;
					})
					.style('opacity',function(d){
						return o_scale(d.Likelihood);
					})
					.html(function(d){
						return self.authors[d.AuthorID];
					});
				items.exit().remove();

				items_date = items.selectAll('div.item_date')
					.data(function(d){ return [d]; });
				items_date.enter().append('div')
					.classed('item_date',true);
				items_date
					.html(function(d){
						var str;
						str = d.StartDate && d.EndDate ? d.StartDate +'&nbsp;&ndash;&nbsp;' +d.EndDate : d.StartDate ? d.StartDate +'&nbsp;&ndash;' : d.EndDate ? '&nbsp;&ndash;' +d.EndDate : '';
						
						/* // Trajectory code
							var a1 = d.PlaceID === focus.key ? 'accent' : '',
									a2 = d.PlaceID_End && d.PlaceID_End === focus.key ? 'accent' : '';
							var p1 = '<span class="_' +d.Likelihood +' ' +a1 +'">' +self.places[d.PlaceID].PlaceName +'</span>',
									p2 = '<span class="_' +d.Likelihood_End +' ' +a2 +'">' +(d.PlaceID_End ? self.places[d.PlaceID_End].PlaceName : '') +'</span>';
							str = '<div class="b">' +(d.EndDate || '') +'</div><div>' +p1 +'&nbsp;&rarr;&nbsp;' +p2 +'</div>';
						*/
						return str;
					});
				items_date.exit().remove();

			} else{
				d3.select('#sidebar_title').html('');
				d3.select('#sidebar_items').html('');
			}
		}

		function update_datebar(){
			var f = d3.time.format('%b. %Y');
			d3.select('#date_start').html(f(self.date_start));
			d3.select('#date_end').html(f(self.date_end));
		}

		function update(){
			filter_data();
			generate_lines();
			generate_points();
			generate_sidebar();
		}

		function unfocus(){
			focus = false;
			d3.selectAll('.focus_point').classed('focus_point',false);
		}

		filter_data();
		generate_lines();
		generate_points();
		generate_sidebar();
	}

  route_change(_side){
      var author_name = d3.select('#'+_side+'_select').property('value');
      var author_id = this.author_names[author_name];

      var curr_svg;
      if(_side == 'left'){ curr_svg = this.left_svg; }
      else { curr_svg = this.right_svg; }

      var self = this;
      var visH = this.height*30;
      curr_svg.attr('height', visH);

      // Find the earliest and latest itinerary dates
      var starts = [], ends = [];
      d3.keys(self.itineraries).forEach(
          function(d){
              starts.push(d3.min(self.itineraries[d], function(_d){ return (new Date(_d.StartDate)); }));
              ends.push(d3.max(self.itineraries[d], function(_d){ return (new Date(_d.EndDate)); }));
      });

      var earliest_date = d3.min(starts);
      var latest_date = d3.max(ends);

      //Translate days to distance
      var route_scale = d3.time.scale().domain([earliest_date, latest_date]).range([0, visH -150 -60]);

      //Create route container
      var route_g = curr_svg.selectAll('g.route_g').data(author_id);
      route_g.enter().append('g').classed('route_g',true);
      route_g
          .attr('class', 'route_g author_' + _side)
          .attr('transform', function(d,i){
              var x = i*(self.width/2),
                  y = 75;
              return 'translate(' + x +',' + y +')';
          });
      route_g.exit().remove();

      //Add background line
      var route_line_background = route_g.selectAll('line.route_line_background')
          .data(self.itineraries[author_id]);
      route_line_background.enter().append('line').classed('route_line_background',true);
      route_line_background
          .attr('x1',self.width/4)
          .attr('y1',function(d,i){ return route_scale(route_scale.domain()[0]); })
          .attr('x2',self.width/4)
          .attr('y2',function(d,i){ return route_scale(route_scale.domain()[1]); });
      route_line_background.exit().remove();

      //Add figure name
      var route_labels = route_g.selectAll('text.route_label').data(author_id);
      route_labels.enter().append('text').classed('route_label',true);
      route_labels
          .attr('x',self.width/4)
          .attr('y',-30)
          .text(author_name);
      route_labels.exit().remove();

      //Lines
      var route_line = route_g.selectAll('line.route_line').data(self.itineraries[author_id]);
      route_line.enter().append('line').classed('route_line',true);
      route_line
          .attr('class', 'route_line author_' + _side)
          .attr('x1',self.width/4)
          .attr('y1',function(d, i){
              return d.StartDate ? route_scale(new Date(d.StartDate)) : route_scale(new Date(d.EndDate));
          })
          .attr('x2',self.width/4)
          .attr('y2',function(d, i){
              return d.EndDate ? route_scale(new Date(d.EndDate)) : route_scale(new Date(d.StartDate));
          });
      route_line.exit().remove();

      //Points
      var route_points = route_g.selectAll('line.route_points').data(self.itineraries[author_id]);
      route_points.enter().append('line').classed('route_points',true);
      route_points
          .attr('x1',self.width/4 -15)
          .attr('y1',function(d,i){
              return d.StartDate ? route_scale(new Date(d.StartDate)) : route_scale(new Date(d.EndDate));
          })
          .attr('x2',self.width/4 +45)
          .attr('y2',function(d,i){
              return d.StartDate ? route_scale(new Date(d.StartDate)) : route_scale(new Date(d.EndDate));
          });
      route_points.exit().remove();

      //Stops
      var route_rad = 3;
      var route_stops = route_g.selectAll('circle.route_stops').data(self.itineraries[author_id]);
      route_stops.enter().append('circle').classed('route_stops',true);
      route_stops
          .attr('cx',self.width/4 +45)
          .attr('cy',function(d,i){
              return d.StartDate ? route_scale(new Date(d.StartDate)) : route_scale(new Date(d.EndDate));
          })
          .attr('r',route_rad);
      route_stops.exit().remove();

      //Point labels
      var route_point_labels = route_g.selectAll('text.route_point_labels').data(self.itineraries[author_id]);
      route_point_labels.enter().append('text').classed('route_point_labels',true);
      route_point_labels
          .attr('x',self.width/4 +60)
          .attr('y',function(d,i){
              return (d.StartDate ? route_scale(new Date(d.StartDate)) : route_scale(new Date(d.EndDate))) +4;
          })
          .text(function(d){
              var t1 = d.StartDate || 'Unknown',
                  t2 = d.EndDate || 'Unknown';
              return self.places[d.PlaceID].PlaceName + ' (' +t1 +' to ' +t2 +')';
          });
      route_point_labels.exit().remove();

  }

  generate_routes(){
      var visH = this.height*6;
      this.svg.attr('height', visH);
  }

	switch_mode(_id){
		this.mode = _id;
		this.tear_down();
						
    switch(this.mode) {
      case '1':
      default:
        this.generate_int_map();
        break;
      case '2':
        this.generate_traj_map();
        break;
      case '3':
        this.generate_routes();
    }
	}

	tear_down(){
		var opp = this.mode === 1 ? 2 : 1;
		
		this.intersections.map.selectAll("*").remove();
		d3.select(ui.dom.intersections.dateslider).selectAll('*').remove();
		d3.select(ui.dom.trajectories.dateslider).selectAll('*').remove();
		
		d3.selectAll('.sidebar_tab.selected').classed('selected',false);
		d3.select('.sidebar_tab#sidebar_01').classed('selected',true);

		d3.selectAll('._0' +opp).style('display','none');
		d3.selectAll('._0' +this.mode).style('display','block');

		this.date_start = this.range[0];
		this.date_end = this.range[1];
	}
}

var vis = new CreateMap();
vis.get_data();

//custom sub-selections
d3.selection.prototype.first = function() {
  return d3.select(this[0][0]);
};
d3.selection.prototype.last = function() {
  var last = this.size() - 1;
  return d3.select(this[0][last]);
};


// old_routes(){

// }
