class CreateVisualization {

    constructor(){

        // dictionaries to hold trajectories, intersections, places, and authors
        this.trajectories = {};
        this.intersections = {};
        this.places = {};
        this.authors = {};
        this.continents = {};

        // $.extend(this.continents, continents);
        // console.log('in constructor');
        // console.log(this.continents.objects);

        // store screen height and width
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // this.focus = { place:"" };
        // this.projection = null;
        // this.path = null;
    }


    // set_data(file_path, json_data){
    //     if(file_path.includes('continents')) this.continents = json_data;
    //     else if(file_path.includes('trajectories')) this.trajectories = json_data;
    // }
    //
    // process_data(){
    //     var data_sets = ['data/test_trajectories.json', 'data/test_intersections.json', 'data/test_places.json', 'data/test_author_ids.json', 'data/continents.json'];
    //
    //     for(var i = 0; i < data_sets.length; i++) {
    //         var file_path = data_sets[i];
    //         d3.json(file_path, function (json_data) {
    //             this.set_data(file_path, json_data);
    //         });
    //     }
    // }
    //
    // set_object_data(file_path){
    //
    //     var object = {};
    //
    //     d3.json(file_path, function (error, json) {
    //         if (!error) Object.assign(object, json);
    //     });
    //
    //     return object;
    // }

    update(){
        this.filter_data();
        this.generate_lines();
        this.generate_points();
        this.update_sidebar();
    }

    generate_lines(){

    }

    generate_points(){

    }

    generate_legend(){

    }

    filter_data(){

    }

    update_sidebar(){

    }

    generate_map(){
        this.svg = d3.select('#container').append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .on('click',function(){
                this.focus.place = null;
                this.update();
                d3.selectAll('.selected').classed('selected',false);
            });

        if(!this.focus.place || this.focus.place === null){
            this.focus.place = "Paris_France";
        }

        this.projection = d3.geo.mercator()
            .scale(220)
            .translate([this.width*0.36, this.height*0.6]);

        this.path = d3.geo.path()
            .projection(this.projection);

        // var features = topojson.feature(this.countries,this.countries.objects.countries);
        // var features = topojson.feature(this.continents,this.continents.objects.continents);

        // //draw vector map
        // var map;
        // map = this.svg.selectAll('path.map')
        //     .data([features]);
        // map.enter().append('path')
        //     .classed('map',true);
        // map
        //     .attr('d',self.path)
        // //.attr('filter','url(#f1)')
        // ;
        // map.exit().remove();

        this.generate_lines();
        this.generate_points(this.generate_legend);
        this.update_sidebar();
    }

    print_info(){
        console.log(Object.keys(this.trajectories));
        console.log(this.intersections);
        console.log(this.places);
        console.log(this.authors);
        console.log(this.width);
        console.log(this.height);
    }
}


// var continents = {};
//
// function set_data(json_data){
//     $.extend(continents, json_data);
//     console.log(continents.objects);
// }
//
// function process_data(){
//     console.log('calling process_data');
//
//     // var data_sets = ['data/continents.json', 'data/test_trajectories.json', 'data/test_intersections.json', 'data/test_places.json', 'data/test_author_ids.json'];
//
//     var data_sets = ['data/continents.json'];
//
//     for(var i = 0; i < data_sets.length; i++){
//         var file_path = data_sets[i];
//
//         d3.json(file_path, function(json_data){
//             set_data(json_data);
//         });
//     }
// }
//
// process_data();


d3.json('data/continents.json', function(json_data){
    console.log('hi');
});

// d3_queue.queue()
//     .defer(d3.json, 'data/continents.json')
// 	.awaitAll(makeMyMap);
//
//
// function makeMyMap() {
//     console.log('hi');
// }


// var vis = new CreateVisualization();
