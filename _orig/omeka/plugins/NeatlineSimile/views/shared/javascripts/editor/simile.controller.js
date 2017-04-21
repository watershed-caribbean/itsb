
/* vim: set expandtab tabstop=2 shiftwidth=2 softtabstop=2 cc=80; */

/**
 * @package     omeka
 * @subpackage  neatline-Simile
 * @copyright   2012 Rector and Board of Visitors, University of Virginia
 * @license     http://www.apache.org/licenses/LICENSE-2.0.html
 */

Neatline.module('Editor.Exhibit.Simile', function(Simile) {


  Simile.Controller = Neatline.Shared.Controller.extend({


    slug: 'EDITOR:SIMILE',

    commands: ['display'],


    /**
     * Create the router and view.
     */
    init: function() {
      this.router = new Simile.Router();
      this.view = new Simile.View();
    },


    /**
     * Display the form.
     *
     * @param {Object} container: The container element.
     */
    display: function(container) {
      this.view.showIn(container);
      this.view.buildWidgets();
    }


  });


});
