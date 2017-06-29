
/* vim: set expandtab tabstop=2 shiftwidth=2 softtabstop=2 cc=80; */

/**
 * @package     omeka
 * @subpackage  neatline-Simile
 * @copyright   2012 Rector and Board of Visitors, University of Virginia
 * @license     http://www.apache.org/licenses/LICENSE-2.0.html
 */

Neatline.module('Editor.Exhibit.Simile', function(Simile) {


  Simile.Router = Neatline.Shared.Router.extend({


    routes: {
      simile: 'simile'
    },


    /**
     * Show the SIMILE defaults form.
     */
    simile: function() {

      Neatline.execute('EDITOR:display', [
        'EDITOR:EXHIBIT',
        'EDITOR:SIMILE'
      ]);

      Neatline.execute(
        'EDITOR:EXHIBIT:activateTab', 'simile'
      );

    }


  });


});
