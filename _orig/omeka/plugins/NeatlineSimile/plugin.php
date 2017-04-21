<?php

/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4 cc=80; */

/**
 * @package     omeka
 * @subpackage  neatline-Simile
 * @copyright   2012 Rector and Board of Visitors, University of Virginia
 * @license     http://www.apache.org/licenses/LICENSE-2.0.html
 */


if (!defined('NL_SIMILE_DIR')) {
    define('NL_SIMILE_DIR', dirname(__FILE__));
}

require_once NL_SIMILE_DIR . '/NeatlineSimilePlugin.php';
require_once NL_SIMILE_DIR . '/helpers/Assets.php';

$simile = new NeatlineSimilePlugin();
$simile->setUp();
