# NeatlineSimile

Neatline Simile makes it possible to add the [SIMILE Timeline][simile] widget to Neatline exhibits. Once the timeline has been added, records can be plotted as points and spans on the timeline, and the timeline can be used to control the _visibility_ of records on the map (and in other viewports added by sub-plugins, like the [Waypoints][waypoints] list).

For example, if a record is plotted as a point on the map and has a "After Date" of 1500 and an "Before Date" of 1600, the record will be visible when only the timeline is between those two dates, and will be automatically hidden as soon as it is dragged before 1500 or after 1600. This makes it possible to string together complex time-series sequences and animations that show how things change over time.

## Installation

  1. Download the latest version of the plugin from the Omeka add-ons repository.

  1. Uncompress the `.zip` archive.

  2. Move the `NeatlineSimile` into the `/plugins` folder in you Omeka installation.

  3. In the Omeka administrative interface, click on **Plugins** in the top navigation bar and find the listing for "Neatline Widget ~ SIMILE Timeline". Click on "Install."

  **Note**: Since NeatlineSimile is a "sub-plugin" that extends the core functionality of Neatline (itself a plugin), Neatline has to be installed in order to install NeatlineSimile.

## Usage

### Enabling the widget

NeatlineSimile adds a "widget" to your installation of Neatline that can be turned on and off for each individual exhibit. Widgets can be activated when an exhibit is first created or by clicking on the "Exhibit Settings" link for an exhibit in the main browse view, which opens the same form that is dispalyed when the exhibit is created. In either case:

  1. Scroll down to the "Widgets" field. Click on the input box to display a list of available widgets.

  2. Click on the listing for "SIMILE Timeline." Once selected, the listing will be displayed as a box in the input.

  3. To lock in the change, click "Save Exhibit" at the bottom of the form.

Now, when you open the editor for the exhibit, you'll see the timeline at the bottom right of the screen.

### Plotting points and spans

  1. Open the edit form for the record that you want to plot on the timeline (or create a new record).

  2. Open the **Style** tab and scroll down to the the "Dates" field set.

  3. Mark the record as being active on the timeline by clicking the listing for "SIMILE Timeline" in the list of options in the "Widgets" field.

  4. Enter a date in the "Start Date" field. **Important**: All dates must be entered in a portable, standards-compliant format called [ISO 8601][iso-8601]. For more detail, see the [Neatline documentation][date-docs]. If you just enter a value for "Start Date" and leave "End Date" empty, the record will be rendered as a single point (an instant) on the timeline.

  5. Optionally, enter an "End Date." If an end date is provided, the record will be rendered as a "duration" on the timeline - a line that runs between two dates.

  5. Click **Save** at the bottom of the form. The timeline will automatically update to display the new point.

### Setting visibility intervals

In addition to directly plotting records on the timeline, the timeline can also be used as a control mechanism that hides and displays records according to the "After Date" and "Before Date" fields, which define an interval of time within which records should be rendered in the exhibit. Records are filtered according to these rules:

  - If an "After Date" is defined, the record will be displayed whenever the timeline is centered on a date that falls after that date. For example, if "After Date" is 2000, the record will be visible when the timeline is at 2001, but invisible when it is at 1999.

  - Likewise, if a "Before Date" is defined, the record will be displayed whenever the timeline is centered on a date that falls before that date. For example, if "Before Date" is 2000, the record will be visible when the timeline is at 1999, but invisible when it is at 2001.

  - If both an "After Date" and a "Before Date" are provided, the record will only be visible when the timeline is inside of the interval defined by the two dates.

Once the timeline is enabled for an exhibit, this filtering is applied automatically to all records, regardless of whether or not they are plotted on the timeline itself.

### Editing timeline defaults

To adjust the default appearance, focus date, and zoom of the timeline:, click on the **Plugins** tab (to the right of "Records" and "Styles") and select the **SIMILE Timeline** option from the drop-down list.

#### Default Date

The date where the timeline is initially centered when the user first arrives at the exhibit. Like the date fields in the record edit form, this field takes any [ISO 8601][iso-8601] date.

#### Interval Unit

The unit of time represented by the tick marks on the timeline. In conjunction with the "Interval Pixels" setting, this is effectively the "zoom level" for the timeline - larger units will be more zoomed-out than smaller units.

#### Interval Pixels

The amount of space between the individual tick marks. This determines how zoomed-in the timeline is within the context of a given "Interval Unit." Click on the input and drag the cursor up and down on the page to change the value smoothly. As the value changes, the new setting will be automatically previewed on the timeline.

#### Track Height

When lots of records are plotted in close proximity on the timeline, the plottings will be stacked up vertically to prevent them from overlapping. This setting determines the amount of vertical space between the horizontal "tracks" on which events are positioned. Bump up this value to increase the amount of vertical "padding" between events.

#### Tape Height

The height of the horizontal "tapes" used to represent duration events on the timeline (events that have both a "Start Date" and an "End Date."

  
[simile]: http://www.simile-widgets.org/timeline/
[waypoints]: https://github.com/scholarslab/nl-widget-Waypoints
[iso-8601]: https://en.wikipedia.org/wiki/ISO_8601
[date-docs]: https://github.com/scholarslab/Neatline/blob/develop/docs/style-tab-dates.md
