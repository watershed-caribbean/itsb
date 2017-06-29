<?php

/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4 cc=80; */

/**
 * @package     omeka
 * @subpackage  neatline-Simile
 * @copyright   2012 Rector and Board of Visitors, University of Virginia
 * @license     http://www.apache.org/licenses/LICENSE-2.0.html
 */


class NeatlineSimilePlugin extends Omeka_Plugin_AbstractPlugin
{


    const NAME  = 'SIMILE Timeline';
    const ID    = 'Simile';


    protected $_hooks = array(
        'install',
        'uninstall',
        'neatline_editor_templates',
        'neatline_public_static',
        'neatline_editor_static'
    );


    protected $_filters = array(
        'neatline_exhibit_expansions',
        'neatline_exhibit_widgets',
        'neatline_record_widgets',
        'neatline_exhibit_tabs',
        'neatline_globals'
    );


    /**
     * Create exhibit expansion table.
     */
    public function hookInstall()
    {

        $this->_db->query(<<<SQL
        CREATE TABLE IF NOT EXISTS

            {$this->_db->prefix}neatline_simile_exhibit_expansions (

            id                      INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
            parent_id               INT(10) UNSIGNED NULL,
            simile_default_date     VARCHAR(100) NULL,
            simile_interval_unit    VARCHAR(100) NULL ,
            simile_interval_pixels  INT(10) UNSIGNED NULL,
            simile_tape_height      INT(10) UNSIGNED NULL,
            simile_track_height     INT(10) UNSIGNED NULL,

            PRIMARY KEY             (id)

        ) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
SQL
);

    }


    /**
     * Drop exhibit expansion table.
     */
    public function hookUninstall()
    {
        $this->_db->query(<<<SQL
        DROP TABLE {$this->_db->prefix}neatline_simile_exhibit_expansions
SQL
);
    }


    /**
     * Queue editor templates.
     *
     * @param array $args Array of arguments, with `exhibit`.
     */
    public function hookNeatlineEditorTemplates($args)
    {
        if ($args['exhibit']->hasWidget(self::ID)) {
            echo get_view()->partial('simile/editor/form.php');
        }
    }


    /**
     * Queue public payloads.
     *
     * @param array $args Array of arguments, with `exhibit`.
     */
    public function hookNeatlinePublicStatic($args)
    {
        if ($args['exhibit']->hasWidget(self::ID)) {
            simile_queueSimileApi();
            queue_css_file('payloads/simile-public');
            queue_js_file('payloads/simile-public');
        }
    }


    /**
     * Queue editor payloads.
     *
     * @param array $args Array of arguments, with `exhibit`.
     */
    public function hookNeatlineEditorStatic($args)
    {
        if ($args['exhibit']->hasWidget(self::ID)) {
            simile_queueSimileApi();
            queue_css_file('payloads/simile-public');
            queue_js_file('payloads/simile-editor');
        }
    }


    /**
     * Register the exhibit expansion.
     *
     * @param array $tables Exhibit expansions.
     * @return array The modified array.
     */
    public function filterNeatlineExhibitExpansions($tables)
    {
        $tables[] = $this->_db->getTable('NeatlineSimileExhibitExpansion');
        return $tables;
    }


    /**
     * Register the exhibit widget.
     *
     * @param array $widgets Widgets, <NAME> => <ID>.
     * @return array The modified array.
     */
    public function filterNeatlineExhibitWidgets($widgets)
    {
        return array_merge($widgets, array(self::NAME => self::ID));
    }


    /**
     * Register the record widget.
     *
     * @param array $widgets Widgets, <NAME> => <ID>.
     * @return array The modified array.
     */
    public function filterNeatlineRecordWidgets($widgets)
    {
        return array_merge($widgets, array(self::NAME => self::ID));
    }


    /**
     * Register the exhibit widget tab.
     *
     * @param array $tabs Tabs, <LABEL> => <ID>.
     * @return array The modified array.
     */
    public function filterNeatlineExhibitTabs($tabs, $args)
    {
        if ($args['exhibit']->hasWidget(self::ID)) {
            $tabs[self::NAME] = 'simile';
        }
        return $tabs;
    }


    /**
     * Register ordering API endpoint on `Neatline.g`.
     *
     * @param array $globals The array of global properties.
     * @param array $args Array of arguments, with `exhibit`.
     * @return array The modified array.
     */
    public function filterNeatlineGlobals($globals, $args)
    {
        return array_merge($globals, array('simile' => array(
            'strings' => nl_getStrings(NL_SIMILE_DIR.'/strings.json')
        )));
    }


}
