/* global d3 */

class UI {
	
  constructor(){
            
    // Mirrors variables in assets/sass/style.css
    
    this.palette = {
      clr1:        '#FCB040', // Sunrise Orange
      clr2:        '#406AFC', // Bright Azure
      clr3:        '#585F66', // Storm Grey 
      black:       '#000000',
      white:       '#F7F8F9',
      neutral:     '#F0F1F2', // Lightest Neutral in SASS
      darkneutral: '#A5ACAF', 
      coolneutral: '#E6E7E9'  
    }
    
    this.dom = {};
    
    
    /*    
    this.dom = {
      tabs: document.getElementById('tabs').getElementsByTagName('a'),
    };
    */    
  } 
  
  /* LEGACY METHOD. Script no longer handles panel UI. Left for reference. */ 
    
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
        for(var k=0;k<panels.length;k++) {
          tabs[k].classList.remove('active');
        }
        this.classList.add('active');
        panels[this.getAttribute('data-panel')].style.display = 'block';
        panels[this.getAttribute('data-panel')].classList.add('selected');

      }
    }
    
    // set the minimum height of the panels, which should be the window height less the nav elements`.
    
    var h = window.innerHeight - document.getElementById('nav').clientHeight - this.dom.intersections.map.header.clientHeight; 
        
    document.getElementById('panels').setAttribute("style","min-height:" + h + "px");
  }
  
  // Generates the <li> elements for author lists
  
  generateAuthorList(obj) {
    
    var list = '';
    var i = 1;
    var count = 1;
    
    for (var prop in obj.authors) {
      
      if (i%2 != 0) {
        list += "<div class='arow'>\n";
      }
      
      if (obj.authors.hasOwnProperty(prop)) {        
        list += this.authorItemTemplate(obj.authors[prop],prop,'a',count) + "\n";
      }
      
      if (i%2 == 0) {
        list += "</div>\n";
      }
      
      i = i == 2 ? 1 : 2;
      count++;
    }
    
    return list;
    
  }
  
  // Adds a list size class to a list container
  
  addListSizeClass(obj,container) {
    container.classList.remove('large-set');
    container.classList.remove('small-set');
    container.classList.add(obj.length > 25 ? 'large-set' : 'small-set');
  } 
  
  authorItemTemplate(name,key,tag,count) {
    return "<" + tag + " data-key='" + key + "' class='author a-" + count + "' title='" + this.escapeHtml(name) + "'>" + name + "</" + tag + ">";
  }
  

  escapeHtml (string) {
    var entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
      return entityMap[s];
    });
  }  
  
}

class IntersectionsUI extends UI {
  constructor(){
    super();
    var eint = document.getElementById('intersections');
    
    this.dom.intersections = {
      elem: eint,
      legend: eint.getElementsByClassName('legend')[0],
      dateslider: eint.getElementsByClassName('slider')[0],
      datestart: eint.getElementsByClassName('date-start')[0],
      dateend: eint.getElementsByClassName('date-end')[0],
      map: {
        header: eint.getElementsByClassName('header')[1],
        view: eint.getElementsByClassName('map')[0]
      },
      results: {
        header: eint.getElementsByClassName('header')[2],
        title: eint.getElementsByClassName('title')[0],
        view: eint.getElementsByClassName('results-view')[0]
      }
    }
    
    this.initLegendUI();
  }
  
  initLegendUI() {
    d3.select(this.dom.intersections.legend).on('click',function(){
      d3.select(this)
        .transition()
        .duration(800)
        .style('opacity',0)
        .remove();
    });
  }
}

class TrajectoriesUI extends UI {
  constructor() {
    super();
    var etra = document.getElementById('trajectories');
    
    this.dom.trajectories = {
      elem: etra,
      dateslider: etra.getElementsByClassName('slider')[0],
      datestart: etra.getElementsByClassName('date-start')[0],
      dateend: etra.getElementsByClassName('date-end')[0],
      authors: {
        header: etra.getElementsByClassName('header')[1],
        list: etra.getElementsByClassName('authors-list')[0]
      },
      map: {
        header: etra.getElementsByClassName('header')[2],
        view: etra.getElementsByClassName('map')[0]
      }
    }
  }   
}

class ItinerariesUI extends UI {
  constructor() {
    super();
    var eiti = document.getElementById('itineraries');
    this.dom.itineraries = {
      elem: eiti,
      authors: {
        selections: eiti.getElementsByClassName('selections')[0],
        header: eiti.getElementsByClassName('header')[0],
        list: eiti.getElementsByClassName('authors-list')[0],
        author1: eiti.getElementsByClassName('author')[0],
        author2: eiti.getElementsByClassName('author')[1]
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
}

class SearchUI extends UI {
  constructor() {
    super();
    this.dom = {
      searchfield: document.getElementById('search-field'),
      searchresults: document.getElementById('search-results')
    };
  }
}