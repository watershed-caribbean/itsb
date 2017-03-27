class UI {
	
  constructor(){
    
    // Mirrors variables in assets/sass/style.css
    
    this.palette = {
      clr1:        '#1C9CF2', // Blue
      clr2:        '#F9D5B6', // Canteloupe
      clr3:        '#D2D9AC', // Green 
      black:       '#161C1E',
      white:       '#F7F8F9',
      neutral:     '#F9F9F9',
      darkneutral: '#2D393F', // Charcoal
      coolneutral: '#E2E5E8' // Cool blue
    }
    
    var eint = document.getElementById('intersections');
    var etra = document.getElementById('trajectories');
    var eiti = document.getElementById('itineraries');

    // Model key DOM elements for each visualization
    
    this.dom = {
      tabs: document.getElementById('tabs').getElementsByTagName('a')
    };
        
    this.dom.intersections = {
      elem: eint,
      dateslider: eint.getElementsByClassName('slider')[0],
      map: {
        header: eint.getElementsByClassName('header')[1],
        view: eint.getElementsByClassName('map')[0]
      },
      results: {
        header: eint.getElementsByClassName('header')[2],
        view: eint.getElementsByClassName('results-view')[0]
      }
    }
    
    this.dom.trajectories = {
      elem: etra,
      dateslider: etra.getElementsByClassName('slider')[0],
      authors: {
        header: etra.getElementsByClassName('header')[1],
        list: etra.getElementsByClassName('authors-list')[0]
      },
      map: {
        header: etra.getElementsByClassName('header')[2],
        view: etra.getElementsByClassName('map')[0]
      }
    }
    
    this.dom.itineraries = {
      elem: eiti,
      authors: {
        header: eiti.getElementsByClassName('header')[0],
        list: eiti.getElementsByClassName('authors-list')[0]
      },
      selections: [
        { 
          header: eiti.getElementsByClassName('itinerary-header')[0],
          view: eiti.getElementsByClassName('itinerary-view')[0]
        },
        { 
          header: eiti.getElementsByClassName('itinerary-header')[1],
          view: eiti.getElementsByClassName('itinerary-view')[1]
        }
      ]
    }
  }  
  
  initPanels() {
        
    var tabs = document.getElementById("tabs").children;
    var panels = document.getElementById("panels").children;
    
    for(var i=0;i<tabs.length;i++) {
      tabs[i].setAttribute('data-panel',i);
      tabs[i].onclick = function() {
        for(var j=0;j<panels.length;j++) {
          panels[j].style.display = 'none';
          panels[j].classList.remove('selected');
        }
        panels[this.getAttribute('data-panel')].style.display = 'block';
        panels[this.getAttribute('data-panel')].classList.add('selected');

      }
    }
  }
  
}

var ui = new UI;
ui.initPanels();
