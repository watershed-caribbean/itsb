'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global d3 */

var UI = function () {
  function UI() {
    _classCallCheck(this, UI);

    // Mirrors variables in assets/sass/style.css

    this.palette = {
      clr1: '#EE7B22', // Orange
      clr2: '#F9D5B6', // Canteloupe
      clr3: '#D2D9AC', // Green 
      black: '#161C1E',
      white: '#F7F8F9',
      neutral: '#F9F9F9',
      darkneutral: '#2D393F', // Charcoal
      coolneutral: '#E2E5E8' // Cool blue
    };

    var eint = document.getElementById('intersections');
    var etra = document.getElementById('trajectories');
    var eiti = document.getElementById('itineraries');

    // Model key DOM elements for each visualization

    this.dom = {
      tabs: document.getElementById('tabs').getElementsByTagName('a'),
      searchfield: document.getElementById('search-field'),
      searchresults: document.getElementById('search-results')
    };

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
    };

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
    };

    this.dom.itineraries = {
      elem: eiti,
      authors: {
        selections: eiti.getElementsByClassName('selections')[0],
        header: eiti.getElementsByClassName('header')[0],
        list: eiti.getElementsByClassName('authors-list')[0],
        author1: eiti.getElementsByClassName('author')[0],
        author2: eiti.getElementsByClassName('author')[1]
      },
      selections: [{
        header: eiti.getElementsByClassName('itinerary-header')[0],
        view: eiti.getElementsByClassName('itinerary-view')[0]
      }, {
        header: eiti.getElementsByClassName('itinerary-header')[1],
        view: eiti.getElementsByClassName('itinerary-view')[1]
      }]
    };

    this.initLegendUI();
  }

  _createClass(UI, [{
    key: 'initLegendUI',
    value: function initLegendUI() {
      d3.select(this.dom.intersections.legend).on('click', function () {
        d3.select(this).transition().duration(800).style('opacity', 0).remove();
      });
    }
  }, {
    key: 'initPanels',
    value: function initPanels() {

      var tabs = document.getElementById("tabs").children;
      var panels = document.getElementById("panels").children;

      for (var i = 0; i < tabs.length; i++) {
        tabs[i].setAttribute('data-panel', i);
        tabs[i].onclick = function () {
          for (var j = 0; j < panels.length; j++) {
            panels[j].style.display = 'none';
            panels[j].classList.remove('selected');
          }
          for (var k = 0; k < panels.length; k++) {
            tabs[k].classList.remove('active');
          }
          this.classList.add('active');
          panels[this.getAttribute('data-panel')].style.display = 'block';
          panels[this.getAttribute('data-panel')].classList.add('selected');
        };
      }

      // set the minimum height of the panels, which should be the window height less the nav elements`. TO DO: find out why the additional factor is needed to make the slider work. Padding on the slider?

      var h = window.innerHeight - document.getElementById('nav').clientHeight - this.dom.intersections.map.header.clientHeight - 100;

      document.getElementById('panels').setAttribute("style", "min-height:" + h + "px");
    }
  }, {
    key: 'generateAuthorList',
    value: function generateAuthorList(obj) {

      var list = '';
      var i = 1;
      var count = 1;

      for (var prop in obj.authors) {

        if (i % 2 != 0) {
          list += "<div class='arow'>\n";
        }

        if (obj.authors.hasOwnProperty(prop)) {
          list += this.authorItemTemplate(obj.authors[prop], prop, 'a', count) + "\n";
        }

        if (i % 2 == 0) {
          list += "</div>\n";
        }

        i = i == 2 ? 1 : 2;
        count++;
      }

      return list;
    }
  }, {
    key: 'authorItemTemplate',
    value: function authorItemTemplate(name, key, tag, count) {
      return "<" + tag + " data-key='" + key + "' class='author a-" + count + "' title='" + this.escapeHtml(name) + "'>" + name + "</" + tag + ">";
    }
  }, {
    key: 'escapeHtml',
    value: function escapeHtml(string) {
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
  }]);

  return UI;
}();

var ui = new UI();
ui.initPanels();
