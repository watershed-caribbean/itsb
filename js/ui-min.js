class UI {
	
  constructor(){
   
  }
  
  initPanels(){
        
    var tabs = document.getElementById("tabs").children;
    var panels = document.getElementById("panels").children;
    
    for(var i=0;i<tabs.length;i++) {
      tabs[i].setAttribute('data-panel',i);
      tabs[i].onclick = function() {
        for(var j=0;j<panels.length;j++) {
          panels[j].style.display = 'none';
        }
        panels[this.getAttribute('data-panel')].style.display = 'block';
      }
    }
  }
}

var ui = new UI;
ui.initPanels();

