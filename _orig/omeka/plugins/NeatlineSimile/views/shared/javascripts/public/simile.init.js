
/* vim: set expandtab tabstop=2 shiftwidth=2 softtabstop=2 cc=80; */

/**
 * @package     omeka
 * @subpackage  neatline-Simile
 * @copyright   2012 Rector and Board of Visitors, University of Virginia
 * @license     http://www.apache.org/licenses/LICENSE-2.0.html
 */

Neatline.module('Simile', { startWithParent: false,
  define: function(Simile) {


  /**
   * Since SIMILE publishes a record filter immediately on start-up, wait
   * until the rest of the modules are running before starting SIMILE.
   */
  Neatline.on('initialize:after', function() {
    Simile.start();
  });


  /**
   * Start the controller, suppress the request to `__history__.html`.
   */
  Simile.addInitializer(function() {
    SimileAjax.History.enabled = false;
    Simile.__controller = new Simile.Controller();
  });


}});
