
/* vim: set expandtab tabstop=2 shiftwidth=2 softtabstop=2 cc=80; */

/**
 * @package     omeka
 * @subpackage  neatline-Simile
 * @copyright   2012 Rector and Board of Visitors, University of Virginia
 * @license     http://www.apache.org/licenses/LICENSE-2.0.html
 */

Neatline.module('Simile', { startWithParent: false,
  define: function(Simile) {


  Simile.View = Neatline.Shared.Widget.View.extend({


    id: 'simile',


    // INITIALIZERS
    // ------------------------------------------------------------------------


    /**
     * Start SIMILE.
     *
     * @param {Object} options
     */
    init: function(options) {

      this.slug = options.slug;

      // Initialize the collection of records.
      this.records = new Neatline.Shared.Record.Collection();

      // Start SIMILE with the templated exhibit.
      this.start(new Neatline.Shared.Exhibit.Model());

    },


    /**
     * Start SIMILE.
     */
    start: function(exhibit) {
      this.__initSimile(exhibit);
      this.__initResize();
      this.__initSelect();
      this.__initFilter();
    },


    /**
     * Instantiate SIMILE.
     *
     * @param {Object} exhibit: An exhibit model.
     */
    __initSimile: function(exhibit) {

      // Destroy existing timeline.
      if (this.timeline) this.timeline.dispose();

      // Reference the event source.
      this.eventSource = new Timeline.DefaultEventSource();

      // Alias default settings.
      var track   = exhibit.get('simile_track_height');
      var tape    = exhibit.get('simile_tape_height');
      var pixels  = exhibit.get('simile_interval_pixels');
      var unit    = exhibit.get('simile_interval_unit');
      var date    = exhibit.get('simile_default_date');

      // Set theme properties.
      this.theme = Timeline.ClassicTheme.create();
      this.theme.event.track.height = parseInt(track);
      this.theme.event.tape.height  = parseInt(tape);

      // Create the timeline.
      this.timeline = Timeline.create(this.el, [
        Timeline.createBandInfo({

          intervalUnit:   Timeline.DateTime[unit],
          intervalPixels: parseInt(pixels),
          timeZone:       SimileAjax.DateTime.getTimezone(),
          eventSource:    this.eventSource,

          theme: this.theme,
          width: '100%',

        })
      ]);

      // Reference band, set date.
      this.band = this.timeline.getBand(0);
      this.setCenterDate(date);

    },


    /**
     * When the window is resized, resize the timeline.
     */
    __initResize: function() {
      $(window).resize(_.bind(function() {
        this.timeline.layout()
      }, this));
    },


    /**
     * Publish `select` on event click.
     */
    __initSelect: function() {
      this.band._eventPainter._showBubble = _.bind(function(x, y, evt) {
        Neatline.vent.trigger('select', {
          model: evt.nModel, source: this.slug
        });
      }, this);
    },


    /**
     * Bind timeline scrolling to the filter.
     */
    __initFilter: function() {
      this.band.addOnScrollListener(_.bind(this.setFilter, this));
      this.setFilter();
    },


    // RECORDS
    // ------------------------------------------------------------------------


    /**
     * Load timeline events.
     */
    load: function() {
      this.records.update({ widget: 'Simile' }, _.bind(this.ingest, this));
    },


    /**
     * Render the collection of records.
     */
    ingest: function() {
      this.eventSource.clear();
      this.records.each(_.bind(this.buildEvent, this));
      this.setEventColors();
    },


    /**
     * Render a record on the timeline.
     *
     * @param {Object} record: The record.
     */
    buildEvent: function(record) {

      // Pass if no start date.
      if (!record.get('start_date')) return;

      // Default fields.
      var data = {
        text:   record.get('title'),
        start:  new Date(record.get('start_date')),
        color:  record.get('fill_color')
      };

      // If present, add end date.
      var end = record.get('end_date');
      if (end) data['end'] = new Date(end);

      // Construct event, set model reference.
      var event = new Timeline.DefaultEventSource.Event(data);
      event.nModel = record;

      // Add to timeline.
      this.eventSource._events.add(event);
      this.eventSource._fire('onAddMany', []);
      this.timeline.layout();

    },


    // VIEWPORT
    // ------------------------------------------------------------------------


    /**
     * Center the timeline on a date.
     *
     * @param {String} date: The date.
     */
    setCenterDate: function(date) {
      if (moment(String(date)).isValid()) {
        this.band.setCenterVisibleDate(new Date(date));
      }
    },


    /**
     * Manifest the fill color on an event.
     *
     * @param {Object} model: The record model.
     */
    focusByModel: function(model) {

      // Parse start and end dates.
      var d1 = moment(String(model.get('start_date')));
      var d2 = moment(String(model.get('end_date')));

      // If both a start date and an end date are defined, focus on the
      // middle point between the two on the timeline.

      if (d1.isValid() && d2.isValid()) {
        var middle = d1.add('milliseconds', (d2-d1) / 2);
        this.setCenterDate(middle.toDate().toISOString());
      }

      // If just a start date is defined, focus on it.

      else if (d1.isValid()) {
        this.setCenterDate(d1.toDate().toISOString());
      }

    },


    /**
     * Filter records by visibility dates.
     */
    setFilter: function() {
      Neatline.vent.trigger('setFilter', {
        source: this.slug, key: 'simile',
        evaluator: _.bind(function(record) {

          // Hide the record if it either:
          //  - Has a `after_date` that is after the current date.
          //  - Has a `before_date` that is before the current date.

          var center = this.band.getCenterVisibleDate();
          var v1 = record.get('after_date');
          var v2 = record.get('before_date');

          var visible = true;
          if (v1) visible &= new Date(v1) < center;
          if (v2) visible &= new Date(v2) > center;
          return Boolean(visible);

        }, this)
      });
    },


    /**
     * Manifest the fill color on an event.
     */
    setEventColors: function() {
      _.each(this.getEvents(), _.bind(function(event) {
        $(this.getEventElement(event)).css(
          'background', event.nModel.get('fill_color')
        );
      }, this));
    },


    // HELPERS
    // ------------------------------------------------------------------------


    /**
     * Get an array of all events on the timeline.
     */
    getEvents: function() {
      return this.eventSource._events._events._a;
    },


    /**
     * Get an event's DOM element on the timeline.
     *
     * @param {Object} event: The event.
     * @return {Object}: The DOM element.
     */
    getEventElement: function(event) {
      return this.band._eventPainter._eventIdToElmt[event._id];
    },


    /**
     * Clear all timeline events.
     */
    clear: function() {
      this.eventSource.clear();
    }


  });


}});
