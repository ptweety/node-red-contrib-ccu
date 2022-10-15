/* eslint-disable wrap-iife */

(function () {
    'use strict';

    RED.nodes.registerType('ccu-connection', {
        category: 'config',
        defaults: {
            name: {value: ''},
            host: {value: '', required: true},

            regaEnabled: {value: true},
            bcrfEnabled: {value: true},
            iprfEnabled: {value: true},
            virtEnabled: {value: true},
            bcwiEnabled: {value: false},
            jackEnabled: {value: false},
            cuxdEnabled: {value: false},

            regaPoll: {value: true},
            regaInterval: {value: 30},

            rpcPingTimeout: {value: 60},
            rpcInitAddress: {value: ''},
            rpcServerHost: {value: '', required: true},
            rpcBinPort: {value: '', required: true},
            rpcXmlPort: {value: '', required: true},

            tls: {value: false},
            inSecure: {value: false},
            authentication: {value: false},
            username: {value: ''},
            password: {value: ''},

            queueTimeout: {value: 5000, required: true},
            queuePause: {value: 250, required: true},

            contextStore: {value: ''},
        },
        label() {
            return this.name || this.host;
        },

        oneditprepare() {
            const $nodeConfigInputHost = $('#node-config-input-host');
            const $nodeConfigInputName = $('#node-config-input-name');
            const $nodeConfigInputRpcServerHost = $('#node-config-input-rpcServerHost');
            const $nodeInputContextStore = $('#node-config-input-contextStore');

            if (typeof this.queueTimeout === 'undefined') {
                $('#node-config-input-queueTimeout').val(5000);
            }

            if (typeof this.queuePause === 'undefined') {
                $('#node-config-input-queuePause').val(250);
            }

            for (const store of RED.settings.context.stores) {
                $nodeInputContextStore.append('<option value="' + store + '"' + (this.contextStore === store ? ' selected' : '') + '>' + store + '</option>');
            }

            $nodeConfigInputHost.on('focus', () => $nodeConfigInputHost.autocomplete('search', ''));

            $.getJSON('ccu', data => {
                const discovered = [];
                for (const ccu of data.discover) {
                    discovered.push(ccu.address + ' ' + ccu.serial);
                }

                $nodeConfigInputHost.autocomplete({
                    source: discovered,
                    select(_, ui) {
                        const name = ui.item.label;
                        const address = name.split(' ').shift();
                        const serial = name.split(' ').pop();

                        $nodeConfigInputHost.val(address);
                        $nodeConfigInputName.val(serial);

                        for (const ccu of data.discover) {
                            if (ccu.address === address) {
                                $('#node-config-input-regaEnabled').prop('checked', ccu.interfaces.ReGaHSS);
                                $('#node-config-input-bcrfEnabled').prop('checked', ccu.interfaces['BidCos-RF']);
                                $('#node-config-input-iprfEnabled').prop('checked', ccu.interfaces['HmIP-RF']);
                                $('#node-config-input-virtEnabled').prop('checked', ccu.interfaces.VirtualDevices);
                                $('#node-config-input-bcwiEnabled').prop('checked', ccu.interfaces['BidCos-Wired']);
                                $('#node-config-input-jackEnabled').prop('checked', ccu.interfaces['CCU-Jack']);
                                $('#node-config-input-cuxdEnabled').prop('checked', ccu.interfaces.CuXD);
                            }
                        }
                    },
                    delay: 0,
                    minLength: 0,
                });

                $nodeConfigInputHost.on('change', () => {
                    if (!$nodeConfigInputHost.val().endsWith($nodeConfigInputName.val())) {
                        $nodeConfigInputName.val($nodeConfigInputHost.val());
                    }
                });

                for (const addr of data.listen) {
                    $nodeConfigInputRpcServerHost.append('<option>' + addr + '</option>');
                }

                $nodeConfigInputRpcServerHost.val(this.rpcServerHost || data.listen[1]);

                if (!this.rpcBinPort) {
                    $('#node-config-input-rpcBinPort').val(data.ports[0]);
                }

                if (!this.rpcXmlPort) {
                    $('#node-config-input-rpcXmlPort').val(data.ports[1]);
                }
            });

            setTimeout(() => {
                if (!this.host) {
                    $nodeConfigInputHost.focus();
                }
            }, 250);
        },
    });

    /* eslint-disable no-unused-vars, no-undef, no-alert */
    function TLSSSL() {
        if (document.querySelector('#node-config-input-authentication').checked && !document.querySelector('#node-config-input-tls').checked) {
            document.querySelector('#node-config-input-tls').checked = true;
            alert('Authentication activated. \nWithout TLS/SSL your credentials would be sent unencrypted!');
        }
    }
    /* eslint-enable no-unused-vars, no-undef, no-alert */
}());
