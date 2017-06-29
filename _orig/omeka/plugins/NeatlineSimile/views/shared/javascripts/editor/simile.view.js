
/* vim: set expandtab tabstop=2 shiftwidth=2 softtabstop=2 cc=80; */

/**
 * @package     omeka
 * @subpackage  neatline-Simile
 * @copyright   2012 Rector and Board of Visitors, University of Virginia
 * @license     http://www.apache.org/licenses/LICENSE-2.0.html
 */

Neatline.module('Editor.Exhibit.Simile', function(Simile) {


  Simile.View = Neatline.Shared.View.extend({


    template:   '#simile-form-template',
    className:  'form-stacked simile',
    tagName:    'form',

    events: {
      'click a[name="save"]': 'save'
    },


    /**
     * Construct the exhibit model and bind to form.
     */
    init: function() {

      // Create exhibit, bind to form.
      this.model = new Neatline.Shared.Exhibit.Model();
      rivets.bind(this.$el, { exhibit: this.model });

      // Update simile on model change.
      this.listenTo(this.model, 'change', _.bind(function() {
        Neatline.execute('SIMILE:restart', this.model);
      }, this));

    },


    /**
     * Instantiate integer draggers.
     */
    buildWidgets: function() {

      // INTEGERS
      this.$('input.integer').draggableInput({
        type: 'integer', min: 0, max: 500
      });

    },


    /**
     * When the "Save" button is clicked.
     */
    save: function() {

      // Save the settings.
      this.model.save(null, {
        success:  _.bind(this.onSaveSuccess, this),
        error:    _.bind(this.onSaveError, this)
      });

    },


    /**
     * When a save succeeds.
     */
    onSaveSuccess: function() {

      // Flash success message.
      Neatline.execute('EDITOR:notifySuccess',
        Neatline.g.simile.strings.settings.save.success
      );

    },


    /**
     * When a save fails.
     */
    onSaveError: function() {

      // Flash error message.
      Neatline.execute('EDITOR:notifyError',
        Neatline.g.simile.strings.settings.save.error
      );

    }


  });


});
