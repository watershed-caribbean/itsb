<?php

/* vim: set expandtab tabstop=2 shiftwidth=2 softtabstop=2 cc=80; */

/**
 * @package     omeka
 * @subpackage  neatline-Simile
 * @copyright   2012 Rector and Board of Visitors, University of Virginia
 * @license     http://www.apache.org/licenses/LICENSE-2.0.html
 */

?>

<script id="simile-form-template" type="text/templates">

  <div class="control-group">

    <?php echo common('neatline/input', array(
        'name'  => 'simile-default-date',
        'label' => 'Default Date',
        'bind'  => 'exhibit:simile_default_date'
    )); ?>

    <?php echo common('neatline/select', array(
        'name'  => 'simile-interval-unit',
        'label' => 'Interval Unit',
        'bind'  => 'exhibit:simile_interval_unit',
        'options' => array(
            'Second'      => 'SECOND',
            'Minute'      => 'MINUTE',
            'Hour'        => 'HOUR',
            'Day'         => 'DAY',
            'Week'        => 'WEEK',
            'Month'       => 'MONTH',
            'Year'        => 'YEAR',
            'Decade'      => 'DECADE',
            'Century'     => 'CENTURY',
            'Millennium'  => 'MILLENNIUM'
        )
    )); ?>

    <?php echo common('neatline/input', array(
        'name'  => 'simile-interval-pixels',
        'label' => 'Interval Pixels',
        'bind'  => 'exhibit:simile_interval_pixels',
        'class' => 'integer'
    )); ?>

    <?php echo common('neatline/input', array(
        'name'  => 'simile-track-height',
        'label' => 'Track Height',
        'bind'  => 'exhibit:simile_track_height',
        'class' => 'integer'
    )); ?>

    <?php echo common('neatline/input', array(
        'name'  => 'simile-tape-height',
        'label' => 'Tape Height',
        'bind'  => 'exhibit:simile_tape_height',
        'class' => 'integer'
    )); ?>

  </div>

  <?php echo common('neatline/save'); ?>

</script>
