class CreateVisualization {

    constructor(data_sets){
        this.trajectories = this.set_object_data(data_sets[0]);
        this.intersections = this.set_object_data(data_sets[1]);
        this.places = this.set_object_data(data_sets[2]);
        this.authors = this.set_object_data(data_sets[3]);
    }

    set_object_data(file_path){
        var object = {};

        d3.json(file_path, function (error, json) {
            if (!error) Object.assign(object, json);
        });

        return object;
    }

    print_info(){
        console.log(this.trajectories);
        console.log(this.intersections);
        console.log(this.places);
        console.log(this.authors);
    }
}




var data_sets = ['data/test_trajectories.json', 'data/test_intersections.json', 'data/test_places.json', 'data/test_author_ids.json'];
var vis = new CreateVisualization(data_sets);
vis.print_info();
