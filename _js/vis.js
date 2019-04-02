/* global d3 */
/* global topojson */
/* global lunr */

// Used in some instances for String.replace()

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};


/* !DATA MANAGER */


// The DataManager object is designed to load JSON files once then make the data available to all visualizations.
// Special handling is required to compensate for asynchronous load (the d3.json method does not have a
// synchronous loading method). We could consider jQuery’s ajax method here, but the queue.js library
// is more lightweight.

class DataManager {
  constructor() {
    var self = this;
    this.loading = [];
    this.data = {};
    this.idx;
    this.compiled = {};
    
    this.authors = {};
    this.author_names = {};
    this.places = {};
    this.datasets = ['author_ids','intersections','itineraries','places','continents'];    
  }
  
  // Loads the Datasets
  // d3-queue.js manages deferred processing
  
  load(func) {
		var self = this;
		var q = d3.queue();
		
		/* 
  		partial (non-deferred) jQuery implementation 
  		
  				  var i = 0;
		
  		self.datasets.forEach(function(d){
    		var filepath = '/data/sixty_' + d +'.json.gz';
    		jQuery.ajax({
      		url: filepath,
      		success: function(data) {
        		self.data[i] = JSON.parse(data);
        		i++;
        		console.log(self.data)
      		}
    		});
  		});	

    */
				
		this.datasets.forEach(function(d){
  		var filepath = '/data/' + d +'.json.gz';
  		q.defer(d3.xhr,filepath);
		});	
		
		q.await(function(error){
  		if (error) throw error;
  		
  		// the first argument is an error object, the subsequent ones correspond to the json datasets
  		for(var i=1;i < arguments.length; i++) {
    		var darg = i-1;
    	//	console.log(arguments[i].responseText);
    		self.data[self.datasets[darg]] = JSON.parse(arguments[i].responseText);
  		}
  		
  		var invoke = func.call(invoke);
  		
		});
  }
  
  buildAuthors() {
    var self = this;
		//authors
		d3.keys(self.data.author_ids).forEach(function(k){
			self.authors[self.data.author_ids[k]] = k;
      self.author_names[k] = self.data.author_ids[k];
		});
  }
  
  
  buildPlaces() {
    var self = this;
    self.places = self.data.places;      // Place JSON no longer requires processing.

    /*
    // Places Hack: Replaces dashes with underscores to enforce consistency
		d3.keys(self.data.places).forEach(function(d){
			var k = d.split(',');
			k[0] = k[0].trim().split(' ').join('_');
			k[1] = k[1].trim().split(' ').join('_');
			k = k.join('_').toLowerCase().replaceAll('-','_');
			self.places[k] = self.data.places[d];
			self.places[k].PlaceName = d;
		});
		
		*/
		
  }
  
  
  indexData() {
    
    var self = this;
    
    this.buildAuthors();
    this.buildPlaces();
    var i=0;
    
    for(var date in this.data.itineraries) { 
      this.data.itineraries[date].forEach(function(entry){
                
        var place = self.places[entry.PlaceID]; 
        var placename = '';
        
        
        if (typeof place != 'undefined') {
          placename = place.PlaceName;
        }
        
        self.compiled[i] = {
          'ID' : i,
          'Author' : self.author_names[entry.AuthorID],
          'AuthorID' : entry.AuthorID,
          'Place' : placename,
          'StartCitation' :  entry.StartCitation,
          'StartDate' :  entry.StartDate,
          'EndCitation' :  entry.EndCitation,
          'EndDate' : entry.EndDate,
          'Notes' : entry.Notes,
          'FullEntry' : entry
        };
        
        i++;
      });     
    }

    this.idx = lunr(function(){
      var thislunr = this;
      
      this.ref('ID'); 
            
      this.field('Author');
      this.field('Place');
      this.field('StartCitation');
      this.field('EndCitation');
      this.field('Notes');
      
      for (var id in self.compiled) {
        thislunr.add(self.compiled[id]);
      }
    });    
  }
  
  Search(term) {
    return this.idx.search(term);
  }
  
  DisplaySearchResults(term) {
    var results = this.Search(term);
    
    if (results.length == 0) {
      return "<p>No search results found.</p>";
    }
    
    var html = [];
    
    for(var i=0;i<results.length;i++) {
      var result = this.compiled[results[i].ref];
      
      var date = [];
      
      if (result.StartDate != '') {
        date.push(result.StartDate);
      }
      
      if (result.EndDate != '') {
        date.push(result.EndDate);
      }
      
      html.push(
        "<div class='search-result'>" +
          "<div class='term'>" + result.Author + "</div>" +
          "<div class='subhead'>" + result.Place + " (" + date.join(' – ') + ")</div>" +
          (result.Notes != '' ? "<div class='description'>" + result.Notes + "</div>" : '') + 
        "</div>"
      );
    }
    
    return html.join("\n");
  }
  
  getData() {
    return this.data;
  }
}

/* !VISUALIZATION CLASS */

class Visualization {
	
	constructor(){
  	var self = this;
  	this.data = {};
		this.mode = 0;
		this.places = {};
		this.authors = {};  // {author_id: author_name}
    this.author_names = {}; // {author_name: author_id}
		this.continents = {};
		this.classkey = 'visualization';   
		this.initialized = false;
		
		var self = this;
		
		this.dm = new DataManager();
		this.dm.load(function() {
  		self.init();
		});


		//store screen height and width
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		this.ttime = 45;
				
	}
	
	init() {
  	var self = this;
  	this.data = this.dm.getData();
    this.focus();
    this.process_data(); 
		this.setup();
		this.generate();
		this.intialized = true;		
	}
	
	focus() {
    d3.select('body').style('position','absolute');
		d3.select('body').style('bottom','0');
		this.width = window.innerWidth;
		this.height = window.innerHeight;
	}

	process_data(){
		var self = this;		
		self.continents = self.data.continents;
		// places
		
		self.dm.buildPlaces();
		self.places = self.dm.places;
		
				
		// authors
		// self.authors lists authors by key
		// self.author_names is inverted, listing author ids by name
		// TO DO: this.author_names is deprecated and should be removed from code
		
		self.authors = self.data.author_ids;
		
		d3.keys(self.data.author_ids).forEach(function(k){
      self.author_names[self.data.author_ids[k]] = k;
		});
				
		// itineraries
		self.itineraries = {};
		d3.keys(self.authors).forEach(function(d){
			if(!self.itineraries[d]){ self.itineraries[d] = []; }
		});
		
		d3.keys(self.data.itineraries).forEach(function(d){
			self.data.itineraries[d].forEach(function(_d){
				self.itineraries[_d.AuthorID].push(_d);
			});
		});
		    
    // intersections
    
		self.intersections = {};
		
		// Places Hack: Replaces dashes with underscores to enforce consistency
    // Original code was simply:
    // self.intersections = self.data.intersections
		
		d3.keys(this.data.intersections).forEach(function(key) {
  		self.intersections[key] = {};
  		d3.keys(self.data.intersections[key]).forEach(function(_key) {
        self.intersections[key][_key.replaceAll('-','_')] = self.data.intersections[key][_key];
      });
    });
		
	}

	setup(){
		var self = this;
	}

	generate(){
    this.tear_down();
	}
	
	tear_down(){
	}
}

/* !DATEMAPCONTROLLER CLASS */

/* Refactoring note: This controller class should handle the map and date slider functionality. 
   Right now it does nothing except establish a common date range (which itself should be configurable).
   
   The structure of the current map and slider code will prove a challenge here. They currently rely on
   localized functions, which themselves are very tied to their individual visualizations and are not
   very portable. This will need to be rethought.
*/



class DateMapController extends Visualization {
  constructor() {
    super();
    
		this.range = [
			new Date(1890,0,1),
			new Date(2010,0,1)
		];
		
		this.date_start = this.range[0];
		this.date_end = this.range[1];
  }
  
  init() {
    super.init();
  }
  
  setup() {
    super.setup();
  }
  
  process_data() {
    super.process_data(); 
  }
  
  generate() {
    super.generate();  
  }
    
  tear_down() {
    super.tear_down();
  }
}

/* !TRAJECTORIES CLASS */

class Trajectories extends DateMapController {
  constructor() {
    super();
    this.intersections = {}
    this.trajectories = {}
    this.mode = 2;         
    this.classkey = 'trajectories';
		this.active_authors_t = [];
		this.ui = new TrajectoriesUI();
  }
  
  init() {
    super.init();
  }
  
  setup() {
    
		super.setup();
		
		var self = this;

    // Trajectories setup
    
		this.trajectories.map = d3.select(self.ui.dom.trajectories.map.view)
		  .append('svg')
		  .attr('width','100%')
        .append("g")
        .attr("class", "viz-container");

    d3.select(self.ui.dom.trajectories.authors.list)
      .html(self.ui.generateAuthorList(this));
            
    self.ui.addListSizeClass(self.authors,self.ui.dom.trajectories.authors.list);

  }
  
  process_data() {
    super.process_data();
    				    
    //trajectories
		this.trajectories = {};
    
  }
  
  
  /* !-- Trajectory Generate */

  // Refactoring note: Ideally the slider and map should be generated here using common code.

  generate(){
    super.generate();
    
		var self = this;
		var focus = false;

		d3.select(self.ui.dom.trajectories.map.view).select("svg")
      .attr('height',this.height);

		//click handlers
		this[this.classkey].map.on('click',function(){
			d3.event.stopPropagation();
			unfocus();
		});
		
		// Manage active trajectory map authors
		
    d3.select(self.ui.dom[this.classkey].authors.list)
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
      
		// !--Slider
		
		var sliderwidth = self.ui.dom[this.classkey].dateslider.offsetWidth;
						
		var scale = d3.time.scale()
			.domain(this.range);
							
		var scale_axis = d3.svg.axis()
			.orient('right')
			.ticks(10)
			.tickSize(sliderwidth - 2) //takes into account a 2px border
			.tickFormat(function(date){
  			var dateObj = new Date(date);
  			return dateObj.getUTCFullYear(); // Corrects issue introduced in Chrome 68
			})
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
			return s.invert(self.height -s(_val));
		}    
		
		var slider = d3.select(self.ui.dom[this.classkey].dateslider).call(slide);
		
		d3.select(self.ui.dom[this.classkey].dateslider).selectAll('text').attr("transform", "translate(-" + sliderwidth + ",20)");
		
		update_datebar();

		// !--Map
		var projection = d3.geo.mercator()
			.scale(160)
			.translate([self.ui.dom[this.classkey].map.view.offsetWidth * 0.5,self.ui.dom[this.classkey].map.view.offsetHeight * 0.5]);
		
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
    const mapContainer = this.trajectories.map.append("g")
      .attr("class", "map-container");
		          
		var map;
		map = mapContainer.selectAll('path.map')
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
			
			//filter by date range

			var holder = d3.entries(self.intersections).filter(function(d){  			
				var n = new Date(d.key);
				return n >= self.date_start && n <=self.date_end;
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
      
      // Places Hack: Replaces dashes with underscores to enforce consistency
      
      d3.keys(trajectories).forEach(function(key) {
        d3.keys(trajectories[key]).forEach(function(__key) {
          trajectories[key][__key].PlaceID = trajectories[key][__key].PlaceID.replaceAll('-','_');
        });
      });
                                    
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
  		
			lines_target = self[self.classkey].map.selectAll('g.lines_target')
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
				
      try {
			lines
  				.attr('d',function(d){
  					var source = {},
  							target = {};
  					var p_1 = d.PlaceID || d.PlaceID_End,
  							p_2 = d.PlaceID_End || d.PlaceID;
  							
  					//isolate x and y start coordinates using projection
  					
  					if (typeof self.places[p_1] == "undefined" || typeof self.places[p_2] == "undefined") {
    					console.log("There was a problem with the PlaceID " + d.PlaceID);
  					}
  					
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
			} catch(e) {
  			console.log(e);
			}
		}

		function generate_points(){
  		  		
			//scale for radii
			var r_scale = d3.scale.linear()
				.domain([0,10])
				.range([0,36]);
				
			points_target = self[self.classkey].map.selectAll('g.points_target')
				.data([self]);
			points_target.enter().append('g')
				.classed('points_target',true);
			points_target.exit().remove();
			
			points_g = self[self.classkey].map.selectAll('g.points_g')
				.data(d3.entries(intersections));
			points_g.enter().append('g')
				.classed('points_g',true);
				
			try {	
  			// Remove all existing tooltips.
  			
  			points_g.selectAll("text[class='tip']").remove();
  			points_g
  				.attr('transform',function(d){
    				
    				if (typeof self.places[d.key] === "undefined") {
      				console.log("There was a problem with the PlaceID " + d.key);
    				}
    				
  					var p  = projection([
  								self.places[d.key].Long,
  								self.places[d.key].Lat
  							]),
  							px = p[0],
  							py = p[1];
  					return 'translate(' +px +',' +py +')';
  				})
  				.append('text')
  				.attr("class", "tip")				
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
      				
      				tooltip.push(info.join(''));
    				}
    				
    				return tooltip.join("<br />");
  				});
      } catch(e) {
        console.log(e);
      }
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
										
					// Tooltip code.
					// Leverages CSS3 Animations instead of D3.
					// Fade out and removal of tooltips needs a new methodlogy. 
					
					var g = d3.select(this);
					var t = d3.select(this).select('text').text();
					
					
					// Get bounding rectangle size for general positioning.
					
					var rect = this.getBoundingClientRect();
					var top = rect.top + window.pageYOffset + 20;
					var left = rect.left + window.pageXOffset + 20;
					
					// Remove existing tooltips
					
				  d3.select('.tooltip').remove();
				  
				  // Add an absolutely positioned tooltip to the viz frame

					d3.select(self.ui.dom.trajectories.elem)
					  .append('div')
					  .attr('class','tooltip')
            .style({
  					  'top': top + "px",
  					  'left': left + "px",
  					  'bottom' : 'auto',
  					  'right' : 'auto'
					  })
					  .html(t)
					  .on('click',function() {
  					  // Click event behaviour for tooltip itself.
  					    
  					  // Animation is controlled through CSS.
  					  // Not working as expected.
  					  // Prefered behaviour: on click, the tooltip reverses the CSS animation and fades. Once the animation is complete
  					  // the tooltip is removed from the DOM.
  					  // Trickier than it sounds: d3 doesn’t offer an effective way of running a callback when animations are complete,
  					  // and this CSS based implementation is not working as expected.
  					  // Left here for future consideration.
  					  
  					  d3.select(this)
  				      .style({
    				      'animation-direction':'reverse',
    				      'animaiton-play-state': 'running',
    				      'animation-fill-mode': 'backwards'
    				      })
    				    .transition()
    				    .delay(800)
  				      .remove();
  				  });
  				  
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


		function update_datebar(){
			var f = d3.time.format('%b %Y');
			d3.select(self.ui.dom[self.classkey].datestart).html(f(self.date_start));
			d3.select(self.ui.dom[self.classkey].dateend).html(f(self.date_end));
		}

		function update(){
			filter_data();
			generate_lines();
			generate_points();
		}

		function unfocus(){
			focus = false;
			d3.selectAll('.focus_point').classed('focus_point',false);
		}

		filter_data();
		generate_lines();
		generate_points();

   var zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(1)
    .scaleExtent([1, 8])
    .on("zoom", zoomed); 

		d3.select(".map-container")
      .append("rect")
      .attr("style", "fill: none; pointer-events: all;")
      .attr("width", "100%")
      .attr("height", this.height)
      .call(zoom);

    function zoomed() {
      d3.select(self.ui.dom.trajectories.map.view).select("svg")
        .select(".viz-container")
        .attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

	}
  
  tear_down() {
  	super.tear_down();
  	var self = this;
    var opp = this.mode === 1 ? 2 : 1;
		
		d3.select(self.ui.dom[this.classkey].dateslider).selectAll('*').remove();
		
		d3.selectAll('.sidebar_tab.selected').classed('selected',false);
		d3.select('.sidebar_tab#sidebar_01').classed('selected',true);

		d3.selectAll('._0' +opp).style('display','none');
		d3.selectAll('._0' +this.mode).style('display','block');

		this.date_start = this.range[0];
		this.date_end = this.range[1];

	}}

/*! INTERSECTIONS CLASS */

class Intersections extends DateMapController {
  constructor() {
    super();
    this.mode = 1; 
    this.classkey = 'intersections';   
    this.intersections = {}
    this.trajectories = {}
    this.ui = new IntersectionsUI();

  }
  
  init() {
    super.init();
  }
  
  setup() {
    
		super.setup();
		
		var self = this;
		
		// Intersections setup
		
		this[this.classkey].map = d3.select(self.ui.dom[this.classkey].map.view)
		  .append('svg')
		  .attr('width','100%');
        
		this.svg = d3.select('#container')
			.append('svg')
			.attr('width',this.width);

  }
  
  process_data() {
    super.process_data();
    						    
    //trajectories
		this.trajectories = {};

  }
  
	/* !-- Intersections Generate */

	generate(){
  	super.generate();
  	
		var self = this;
		var focus = false;
    
		this[this.classkey].map.attr('height',this.height);

		//click handlers
		this[this.classkey].map.on('click',function(){
			d3.event.stopPropagation();
			unfocus();
			display_results();
		});
		
		// !--Slider

		var sliderwidth = self.ui.dom[this.classkey].dateslider.offsetWidth;
		
		var scale = d3.time.scale()
			.domain(this.range);
										
		var scale_axis = d3.svg.axis()
			.orient('right')
			.ticks(10)
			.tickSize(sliderwidth - 2) //takes into account a 2px border
			.tickFormat(function(date){
  			var dateObj = new Date(date);
  			return dateObj.getUTCFullYear(); // Corrects issue introduced in Chrome 68
			})
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
				.nice(d3.time.month);
			return s.invert(self.height -s(_val));
		}    

		var slider = d3.select(self.ui.dom[this.classkey].dateslider).call(slide);
		
		d3.select(self.ui.dom[this.classkey].dateslider).selectAll('text').attr("transform", "translate(-" + sliderwidth + ",20)");
		
		update_datebar();
				
		//map
		
		var projection = d3.geo.mercator()
			.scale(160)
			.translate([self.ui.dom[this.classkey].map.view.offsetWidth * 0.5,self.ui.dom[this.classkey].map.view.offsetHeight * 0.5]);
			
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
		map = self[self.classkey].map.selectAll('path.map')
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
			
			
			// vet places with only one figure
			
			var vetted = [];
			
			for(var city in intersections) {
  			if(Object.keys(intersections[city].figures).length < 2) {
    			vetted.push(city);
          delete intersections[city];
  			}
			}
			
			for(var iucity in intersections_unique) {
  			if(vetted.indexOf(iucity) > -1) {
    			delete intersections_unique[iucity];
  			}
  		}

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
				
      try {
  			points_g
  				.attr('transform',function(d){
    				
    				if (typeof self.places[d.key] == "undefined") {
      				console.log("There was a problem with the PlaceID: " + d.key); 
    				}
    				
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
      } catch (e) {
        console.log(e);
      }
			points_g
				.on('click',function(d){
					d3.event.stopPropagation();
					
  				var point = d3.select(this);
  				  				
  				// Scale point
  				
  				var scale = 1.5;
  				
  				// reset all points
  				points_g.forEach(function(d){
    				d3.select(this)
    				  .classed('selected',false)
  						.transition()
  						.duration(self.ttime)
  						.attr('transform',function(_d){
  							var p  = projection([
  										self.places[_d.key].Long,
  										self.places[_d.key].Lat
  									]),
  									px = p[0],
  									py = p[1];
  							return 'translate(' +px +',' +py +')scale(1)';
  						});
  				});
  				  				
					point
					  .classed('selected',true)
						.transition()
						.duration(self.ttime)
						.attr('transform',function(_d){
							var p  = projection([
										self.places[_d.key].Long,
										self.places[_d.key].Lat
									]),
									px = p[0],
									py = p[1];
							return 'translate(' +px +',' +py +')scale(' + scale + ')';
						});
  				
  				// display results
  				
					unfocus();
					if(d.key !== focus.key){
						focus = d;
						d3.select(this).classed('focus_point',true);
					}
  					display_results();
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

		function display_results(){
			var o_scale = d3.scale.linear()
				.domain([0,3])
				.range([0.5,1]);

			if(focus){
				d3.select(self.ui.dom[self.classkey].results.title).html(self.places[focus.key].PlaceName);

				//var data = sidebar_mode === 1 ? (intersections_unique[focus.key] || []) : (trajectories_unique[focus.key]);
				var data = intersections_unique[focus.key] || [];
				var items_target = d3.select(self.ui.dom[self.classkey].results.view);
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
						var dateproc = [];
						
						if (d.StartDate) {
  						dateproc.push(d.StartDate);
						}
						
						if (d.EndDate) {
  						dateproc.push(d.EndDate);
						}
												
						return  dateproc.length > 0 ? dateproc.join('&nbsp;–&nbsp;') : '';
						
						//str = d.StartDate && d.EndDate ? d.StartDate +'&nbsp;&ndash;&nbsp;' + d.EndDate : d.StartDate ? d.StartDate +'&nbsp;&ndash;' : d.EndDate ? '&nbsp;&ndash;' +d.EndDate : '';
						//return str;
					});
				items_date.exit().remove();
				
				self.ui.addListSizeClass(data,self.ui.dom[self.classkey].results.view);

			} else{
				d3.select('#sidebar_title').html('');
				d3.select('#sidebar_items').html('');
				self.ui.addListSizeClass([],self.ui.dom[self.classkey].results.view);
			}
		}

		function update_datebar(){
			var f = d3.time.format('%b %Y');
			d3.select(self.ui.dom[self.classkey].datestart).html(f(self.date_start));
			d3.select(self.ui.dom[self.classkey].dateend).html(f(self.date_end));
		}

		function update(){
			filter_data();
			generate_points();
			display_results();
		}

		function unfocus(){
			focus = false;
			d3.selectAll('.focus_point').classed('focus_point',false);
		}

		filter_data();
		generate_points();
		display_results();
	}
	
  tear_down() {
  	super.tear_down();
  	var self = this;
    var opp = this.mode === 1 ? 2 : 1;
		
		this.intersections.map.selectAll("*").remove();
		d3.select(self.ui.dom[this.classkey].dateslider).selectAll('*').remove();
		
		d3.selectAll('.sidebar_tab.selected').classed('selected',false);
		d3.select('.sidebar_tab#sidebar_01').classed('selected',true);

		d3.selectAll('._0' +opp).style('display','none');
		d3.selectAll('._0' +this.mode).style('display','block');

		this.date_start = this.range[0];
		this.date_end = this.range[1];

	}  
}

/* !ITINERARIES CLASS */

class Itineraries extends Visualization {
  constructor() {
    super();
    this.classkey = 'itineraries';   
    this.selectedauthors = [];
    this.routes = [];
    this.visHeight = this.height * 4;
    this.ui = new ItinerariesUI();
    this.selectionsw = d3.select(this.ui.dom.itineraries.authors.selections).node().getBoundingClientRect().width;
  }
  
  init() {
    super.init();
  }
  
  focus() {
    d3.select('body').style('position','inherit');
    d3.select('body').style('bottom','auto');
  }
  
  setup() {
    var self = this;
    
    // Set up author selection UI
        
    d3.select(self.ui.dom[this.classkey].authors.list)
      .html(self.ui.generateAuthorList(this));
				
    d3.select(self.ui.dom[this.classkey].authors.list)
      .selectAll('.author').each(function(){
        d3.select(this).on('click',function(){
          var elem = d3.select(this);  
          var akey = elem.attr('data-key');
                              
          if(elem.classed('selected')) {
            elem.classed('selected',false);
            self.selectedauthors[self.selectedauthors.indexOf(akey)] = null;
          } else {
            
            self.selectedauthors = [];
            
            d3.select(self.ui.dom[self.classkey].authors.list)
              .selectAll('.author').each(function(){
                 d3.select(this).classed('selected',false);
              });
              
            self.selectedauthors[0] = akey;
            elem.classed('selected',true);
          }
          
          self.generate();  
        });
      });      
  }
  
  /* !--Itineraries Generate */
  
  generate() {
    super.generate();
    
    var self = this;
    
    this.tear_down();
    
    // Checks to see if at least one author is selected
    
    if (d3.select(self.ui.dom[self.classkey].authors.list).selectAll('a.selected')[0].length == 0) {
      d3.select(self.ui.dom[self.classkey].selections[0].header).html("Select an author");
      return;
    }
    
    var merge = [];
        
    for(var i=0; i<this.selectedauthors.length; i++) {
      var slot = i;
      var akey = this.selectedauthors[i];
      var header = self.ui.dom[this.classkey].selections[i].header;
      var view = self.ui.dom[this.classkey].selections[i].view;
      
      if (akey != null) {
        d3.select(header).html(this.authors[akey]);
        this.routes[i] = this.itineraries[akey];
        merge = merge.concat(this.itineraries[akey]);
        d3.select(self.ui.dom[this.classkey].selections[i].view).append('svg')        
      } else {
        d3.select(header).html("Select an author");
        this.routes[i] = null;
      }
    }
                        
    // Find the earliest and latest itinerary dates
    var starts = [], ends = [];
    d3.keys(self.itineraries).forEach(
      function(d){
        starts.push(d3.min(self.itineraries[d], function(_d){ return new Date(_d.StartDate); }));
        ends.push(d3.max(self.itineraries[d], function(_d){ return new Date(_d.EndDate); }));
    });
      
    var earliest_date = d3.min(starts);
    var latest_date = d3.max(ends);
                
    // Set up containers
        
    var cheight = this.visHeight 
                    + 16 
                    + d3.select(self.ui.dom[this.classkey].authors.header).node().getBoundingClientRect().height 
                    + d3.select(self.ui.dom[this.classkey].selections[0].header).node().getBoundingClientRect().height ;
                        
    d3.select(self.ui.dom[this.classkey].authors.selections).style('height',cheight + 'px');
    d3.select(self.ui.dom[this.classkey].elem).style('height',cheight + 'px');
    d3.select(self.ui.dom[this.classkey].authors.list).style('height',cheight + 'px');

    //Translate days to distance
    
    var route_scale = d3.time.scale().domain([earliest_date, latest_date]).range([0, this.visHeight]);
    
    // Create Axis
        
    var axisScale = d3.time.scale().domain([earliest_date, latest_date]).range([0,this.visHeight]);
    var yAxis = d3.svg.axis()
                  .scale(axisScale)
                  .orient('left')
                  .tickSize(this.selectionsw * .95, 0)
                  .tickPadding(-25)
                  .tickFormat(d3.time.format("%Y"));
    
    
    for(var j=0; j<this.selectedauthors.length; j++) {
      this.generate_route(j,route_scale,yAxis);
    } 
        
  }
  
  generate_route(index,route_scale,yAxis) {
    var self = this;
    var author_id = this.selectedauthors[index];
    var route = this.routes[index];
    var view = self.ui.dom[this.classkey].selections[index].view;
            
    if (route == null) {
      return;
    }
    
    var svg = d3.select(view).select('svg');
    
    svg.attr('height', this.visHeight);
    d3.select(view).style('height',this.visHeight);
    
    // add axis to first visualization
    // var w = this.selectionsw *.95 * .8 -10;
    var w = this.selectionsw * 0.5;

    if (index==0) {
      svg.append('g')
        .attr('id','itinerary-axis')
        .call(yAxis)
        .call(function(l){
          l.style('transform','translateX(' + w + 'px)'); // moves lines into position
          l.selectAll('text').attr('y',15); // moves labels below lines
        });

    }
        
    //Create route container
    var route_g = svg.selectAll('g.route_g').data([author_id]);
    
    route_g.enter().append('g').classed('route_g',true);

    route_g
        .attr('class', 'route_g author_' + index)
        .attr('transform', function(d,i){
            var x = 0,
                y = 0;
            return 'translate(' + x +',' + y +')';
        });
        
    route_g.exit().remove();
    
    //Stops
    var route_rad = 4;
    var route_stops = route_g.selectAll('circle.route_stops').data(route);
    route_stops.enter().append('circle').classed('route_stops',true);
    route_stops
        .attr('cx',30)
        .attr('cy',function(d,i){
            return d.StartDate ? route_scale(new Date(d.StartDate)) : route_scale(new Date(d.EndDate));
        })
        .attr('r',route_rad)
        .append("text")
          .attr('class','tip')
          .text(function(d) {
    				var tooltip = [];
    				var info = []

    				
    				if(typeof self.places[d.PlaceID] == 'undefined') {
      				tooltip.push['Location information unspecified or missing.'];
    				} else {
    				  tooltip.push(self.places[d.PlaceID].PlaceName);
    				}
    				// Add names and citations
    				
    				if (d.StartDate != "") {
      				info.push(" \nFrom: " + d.StartDate.toString());
    				}
    				
            if(d.StartCitation != "") {
              info.push(" (" + d.StartCitation.toString() + ")")            
            }    				
    				if (d.EndDate != '') {
      				info.push("\nUntil: " + d.EndDate);
    				}
    				
    				if (d.EndDate != '') {
              info.push(" (" + d.StartCitation.toString() + ")");
    				}
    				

    				tooltip.push(info.join(''));
      		  
      		  return tooltip.join("<br />");
          });
        route_stops
          .on('click',function() {
                        
  					// Tooltip code.
  					// Leverages CSS3 Animations instead of D3.
  					// Fade out and removal of tooltips needs a new methodlogy. 
  					
  					var g = d3.select(this);
  					var t = d3.select(this).select('text').text();
  					
  					var rect = this.getBoundingClientRect();
  					var top = rect.top + window.pageYOffset - 10;
  					var left = rect.left + window.pageXOffset + 50;
  					
  				  d3.select('.tooltip').remove();
  
					d3.select(self.ui.dom.itineraries.elem)
					  .append('div')
					  .attr('class','tooltip')
            .style({
  					  'top': top + "px",
  					  'left': left + "px",
  					  'bottom' : 'auto',
  					  'right' : 'auto'
					  })
					  .html(t)
					  .on('click',function() {
  					  // Click event behaviour for tooltip itself.
  					  // See notes in “trajectories” above.
  					  
  					  d3.select(this)
  				      .style({
    				      'animation-direction':'reverse',
    				      'animaiton-play-state': 'running',
    				      'animation-fill-mode': 'backwards'
    				      })
    				    .transition()
    				    .delay(800)
  				      .remove();
  				  });
          });
          
  
    route_stops.exit().remove();
    
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
              starts.push(d3.min(self.itineraries[d], function(_d){ return new Date(_d.StartDate); }));
              ends.push(d3.max(self.itineraries[d], function(_d){ return new Date(_d.EndDate); }));
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
  
  /* !--Itineraries Tear Down */
  
  tear_down() {
    super.tear_down();
    var self = this;
    for(var i=0;i<this.selectedauthors.length;i++) {
      d3.select(self.ui.dom[this.classkey].selections[i].view).selectAll('*').remove();       
    } 
  }
}

/* !SEARCH  */

class Search extends Visualization {
	constructor() {
  	super();
  	var self = this;
  	this.ui = new SearchUI();	  
  }
  
  init() {
    super.init();
    var self = this;
    
    this.dm.indexData();
    
		d3.select(self.ui.dom.searchfield).on('input',function(){
  		if(this.value.length>2) {
    	  d3.select(self.ui.dom.searchresults).html(self.dm.DisplaySearchResults(this.value));
  		}
		});
    
  }
}

/* INITIALIZATION */

/*
  Note for refactoring: this should be rethought once a proper MVC structure is in place.
  
  Notes for the current structure:
  
  - The DataManager class is designed to load JSON data once (on initial load).
  - It the function passed to it once the dataset is loaded completely.

*/

/*

var intersections = new Object;
var trajectories = new Object;
var itineraries = new Object;

d3.select('body').style('opacity',0.3);

// Intersections are initialized immediately. The second argument is a function to handle data-reliant functionality.

var dm = new DataManager(function(){
    
  d3.selectAll(ui.dom.tabs).each(function() {
  	d3.select(this).on('click',function() {	
    		
  		// Remove active tooltips from the DOM
  		d3.select('.tooltip').remove();
  		  		    	
    	switch(d3.select(this).attr('data-mode')) {
      	case '0':
          d3.select('body').style('position','inherit');
      		d3.select('body').style('bottom','auto');
      	break;
      	case '1':
          if (!intersections.hasOwnProperty('initialized')) {
            intersections = new Intersections;
            intersections.init();
          } else {
            intersections.focus();
          }
          break;
        case '2':      
          // only initialize once. perhaps should be handled in the init() function itself.
                  
          if (!trajectories.hasOwnProperty('initialized')) {
            trajectories = new Trajectories;
            trajectories.init();
          } else {
            trajectories.focus();
          }

      	  break;
      	case '3':
          if (!itineraries.hasOwnProperty('initialized')) {
            itineraries = new Itineraries;
            itineraries.init();
          } else {
            itineraries.focus();
          }

      	  break;  
      	 case '4':
      		// Index when Search tab is clicked.
      		
      		dm.indexData();
      		
      		// Bind Search Field
          		
      		d3.select(ui.dom.searchfield).on('input',function(){
        		if(this.value.length>2) {
          	  d3.select(ui.dom.searchresults).html(dm.DisplaySearchResults(this.value));
        		}
      		});
      	  break;
    	}
  	});
  });
  
  // console.log(performance.now() / 1000);
  
  d3.select('body').transition(200).style('opacity',1);
  
  
});

*/

//custom sub-selections
d3.selection.prototype.first = function() {
  return d3.select(this[0][0]);
};
d3.selection.prototype.last = function() {
  var last = this.size() - 1;
  return d3.select(this[0][last]);
};
