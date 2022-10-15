/* eslint-disable wrap-iife */

(function () {
    'use strict';

    RED.nodes.registerType('ccu-poll', {
        category: 'ccu',
        defaults: {
            name: {value: ''},
            script: {value: ''},
            ccuConfig: {value: 'localhost', type: 'ccu-connection', required: true},
        },
        inputs: 1,
        outputs: 0,
        icon: 'ccu.png',
        color: '#8BB9D2',
        paletteLabel: 'poll',
        align: 'right',
        label() {
            return this.name || 'poll';
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
    });
}());
