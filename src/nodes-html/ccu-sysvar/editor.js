/* eslint-disable wrap-iife */

(function () {
    'use strict';

    RED.nodes.registerType('ccu-sysvar', {
        category: 'ccu',
        defaults: {
            name: {value: ''},
            ccuConfig: {value: 'localhost', type: 'ccu-connection', required: true},
            topic: {value: 'ReGaHSS/${Name}'}, // eslint-disable-line no-template-curly-in-string
            change: {value: true},
            cache: {value: true},
        },
        inputs: 1,
        outputs: 1,
        icon: 'ccu.png',
        color: '#8BB9D2',
        paletteLabel: 'sysvar',
        align: 'right',
        label() {
            return this.name || 'sysvar';
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
        oneditprepare() {
            const cname = this.name;

            // Migration
            if (typeof this.change === 'undefined') {
                $('#node-input-change').attr('checked', true);
            }

            if (typeof this.cache === 'undefined') {
                $('#node-input-cache').attr('checked', true);
            }

            function getConf(nodeId) {
                $('#select-input-name').html('').hide();
                $('#node-input-name').val('').show();

                if (nodeId && nodeId !== '_ADD_') {
                    $.getJSON('ccu?type=sysvar&config=' + nodeId, data => {
                        $('#select-input-name').html('<option value=""></option>');
                        if (data) {
                            for (const name of Object.keys(data)) {
                                $('#select-input-name').append('<option value="' + name + '"' + (name === cname ? ' selected' : '') + '>' + name + '</option>');
                            }

                            $('#node-input-name').hide();
                            $('#select-input-name').show();
                        } else {
                            $('#select-input-name').hide();
                            $('#node-input-name').show();
                        }
                    });
                }
            }

            getConf(this.ccuConfig);

            $('#node-input-ccuConfig').on('change', () => {
                getConf($('#node-input-ccuConfig').val());
            });
        },
        oneditsave() {
            if ($('#select-input-name').is(':visible')) {
                $('#node-input-name').val($('#select-input-name').val());
            }
        },
    });
}());
