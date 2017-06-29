<?php

/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4 cc=80; */

/**
 * @package     omeka
 * @subpackage  neatline-Simile
 * @copyright   2012 Rector and Board of Visitors, University of Virginia
 * @license     http://www.apache.org/licenses/LICENSE-2.0.html
 */

class NeatlineSimileExhibitExpansion extends Neatline_Row_Expansion
{


    public $simile_default_date;                // VARCHAR(100) NULL
    public $simile_interval_unit   = 'YEAR';    // VARCHAR(100) NULL
    public $simile_interval_pixels = 100;       // INT(10) UNSIGNED NULL
    public $simile_tape_height     = 10;        // INT(10) UNSIGNED NULL
    public $simile_track_height    = 30;        // INT(10) UNSIGNED NULL


}
