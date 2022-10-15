/* eslint-disable wrap-iife */

(function () {
    'use strict';

    RED.nodes.registerType('ccu-alexa', {
        category: 'ccu',
        defaults: {
            name: {value: ''},
            iface: {value: ''},
            channel: {value: ''},
            ccuConfig: {value: 'localhost', type: 'ccu-connection', required: true},
        },
        inputs: 1,
        outputs: 1,
        icon: 'ccu.png',
        color: '#c2d5e4',
        paletteLabel: 'alexa',
        align: 'right',
        label() {
            return this.name || this.channel || 'alexa';
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
        oneditprepare() {
            console.log(this);

            const $nodeInputIface = $('#node-input-iface');
            const $nodeInputCcuConfig = $('#node-input-ccuConfig');
            const $nodeInputChannel = $('#node-input-channel');

            let data;
            let ifacesLoaded = false;
            let ifacesPending = false;

            function loadIfaces(iface, cb) {
                if (ifacesPending) {
                    return;
                }

                ifacesPending = true;
                console.log('loadIfaces()');
                $nodeInputIface.html('<option value=""></option>');
                const nodeId = $nodeInputCcuConfig.val();
                if (nodeId === '_ADD_') {
                    if (typeof cb === 'function') {
                        cb();
                        ifacesPending = false;
                    }
                } else {
                    const url = 'ccu?config=' + nodeId + '&type=ifaces';
                    $.getJSON(url, d => {
                        for (const i of Object.keys(d)) {
                            if (i !== 'ReGaHSS') {
                                $nodeInputIface.append('<option' + (d[i].enabled ? '' : ' disabled') + (i === iface ? ' selected' : '') + '>' + i + '</option>');
                            }
                        }

                        if (typeof cb === 'function') {
                            cb();
                            ifacesPending = false;
                        }
                    });
                }
            }

            function loadConfig() {
                if (!ifacesLoaded) {
                    return;
                }

                console.log('loadConfig()');
                const nodeId = $nodeInputCcuConfig.val();
                const url = 'ccu?config=' + nodeId + '&type=channels&iface=' + $nodeInputIface.val();
                $.getJSON(url, d => {
                    data = d;
                    console.log(d);
                    autocompleteChannel();
                });
            }

            $nodeInputCcuConfig.on('change', () => {
                console.log('$nodeInputCcuConfig change');
                loadIfaces(this.iface, () => {
                    ifacesLoaded = true;
                    $nodeInputIface.removeAttr('disabled');
                    loadConfig();
                });
            });

            $nodeInputChannel.autocomplete({
                source: [],
                close() {
                    // autocompleteDatapoint();
                },
                delay: 0,
                minLength: 0,
            });

            $nodeInputChannel.on('focus', () => {
                $nodeInputChannel.autocomplete('search');
            });

            function autocompleteChannel() {
                if (!data) {
                    return;
                }

                const channels = [];
                for (let addr of Object.keys(data)) {
                    if (/:\d+$/.test(addr)) {
                        if (data[addr].name) {
                            addr += ' ' + data[addr].name;
                        }

                        channels.push(addr);
                    }
                }

                channels.sort((a, b) => a.localeCompare(b));
                $nodeInputChannel.autocomplete('option', 'source', channels);

                if (!data[$nodeInputChannel.val().split(' ')[0]]) {
                    $nodeInputChannel.val('');
                }
            }

            $nodeInputIface.on('change', () => {
                console.log('$nodeInputIface change');
                loadConfig();
            });
        },

        oneditsave() {},
    });
}());
