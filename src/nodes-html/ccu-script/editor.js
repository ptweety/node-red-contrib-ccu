/* eslint-disable wrap-iife */

(function () {
    'use strict';

    RED.nodes.registerType('ccu-script', {
        category: 'ccu',
        defaults: {
            name: {value: ''},
            script: {value: ''},
            ccuConfig: {value: 'localhost', type: 'ccu-connection', required: true},
            topic: {value: '${CCU}/${Interface}'}, // eslint-disable-line no-template-curly-in-string
        },
        inputs: 1,
        outputs: 1,
        icon: 'ccu.png',
        align: 'right',
        color: '#8BB9D2',
        paletteLabel: 'script',
        label() {
            return this.name || 'script';
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
    });
}());
