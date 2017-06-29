
/* vim: set expandtab tabstop=2 shiftwidth=2 softtabstop=2 cc=80; */

/**
 * @package     omeka
 * @subpackage  neatline-Simile
 * @copyright   2012 Rector and Board of Visitors, University of Virginia
 * @license     http://www.apache.org/licenses/LICENSE-2.0.html
 */

Neatline.module('Simile', { startWithParent: false,
  define: function(Simile) {


  Simile.Controller = Neatline.Shared.Controller.extend({


    slug: 'SIMILE',

    events:[
      { 'refresh': 'load' },
      'select'
    ],

    commands: [
      'restart'
    ],


    /**
     * Create the view and load starting events.
     */
    init: function() {
      this.view = new Simile.View({ slug: this.slug });
      this.load();
    },


    /**
     * Load timeline events.
     */
    load: function() {
      this.view.load();
    },


    /**
     * Focus by model, unless the event was triggered by the timeline.
     *
     * @param {Object} args: Event arguments.
     */
    select: function(args) {
      if (args.source !== this.slug) this.view.focusByModel(args.model);
    },


    /**
     * Restart the timeline and re-render the current collection.
     *
     * @param {Object} exhibit: The exhibit model.
     */
    restart: function(exhibit) {
      this.view.start(exhibit);
      this.view.ingest(this.view.records);
    }


  });


}});
