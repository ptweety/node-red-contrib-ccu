/* eslint-disable wrap-iife */

(function () {
    'use strict';

    RED.nodes.registerType('ccu-rpc', {
        category: 'ccu',
        defaults: {
            name: {value: ''},
            ccuConfig: {value: 'localhost', type: 'ccu-connection', required: true},
            iface: {value: 'BidCos-RF'},
            method: {value: ''},
            params: {value: '[]', validate(p) {
                try {
                    return $.trim(p) === '' || Array.isArray(JSON.parse(p));
                } catch {
                    return false;
                }
            }},
            topic: {value: '${CCU}/${Interface}/${Method}'}, // eslint-disable-line no-template-curly-in-string
        },
        inputs: 1,
        outputs: 1,
        icon: 'ccu.png',
        color: '#4691BA',
        paletteLabel: 'rpc',
        align: 'right',
        label() {
            return this.name || this.method || 'rpc';
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
        oneditprepare() {
            const $nodeInputIface = $('#node-input-iface');
            const $nodeInputCcuConfig = $('#node-input-ccuConfig');

            let ifacesLoaded = false;
            let ifacesPending = false;

            function loadIfaces(iface, cb) {
                if (ifacesPending) {
                    return;
                }

                ifacesPending = true;
                console.log('loadIfaces()');
                $nodeInputIface.html('<option></option>');
                const nodeId = $nodeInputCcuConfig.val();
                if (nodeId === '_ADD_') {
                    if (typeof cb === 'function') {
                        cb();
                        ifacesPending = false;
                    }
                } else {
                    const url = 'ccu?config=' + nodeId + '&type=ifaces';
                    $.getJSON(url, d => {
                        Object.keys(d).forEach(i => {
                            $nodeInputIface.append('<option' + (d[i].enabled ? '' : ' disabled') + (i === iface ? ' selected' : '') + '>' + i + '</option>');
                        });
                        if (typeof cb === 'function') {
                            cb();
                            ifacesPending = false;
                        }
                    });
                }
            }

            $nodeInputCcuConfig.change(() => {
                console.log('$nodeInputCcuConfig change');
                loadIfaces(this.iface, () => {
                    ifacesLoaded = true;
                    $nodeInputIface.removeAttr('disabled');
                    autocompleteMethods();
                });
            });

            $('#node-input-method').autocomplete({
                source: [],
                close() {},
                delay: 0,
                minLength: 0,
            });

            $('#node-input-iface').change(() => {
                if (ifacesLoaded) {
                    console.log('#node-input-iface change');
                    autocompleteMethods();
                }
            });

            function autocompleteMethods() {
                const iface = $('#node-input-iface').val();
                let methods;
                switch (iface) {
                    case 'BidCos-RF':
                        // TODO remove hardcoded methods, use system.listMethods...
                        methods = ['abortDeleteDevice', 'activateLinkParamset', 'addDevice', 'addLink', 'addVirtualDeviceInstance', 'changeKey', 'clearConfigCache', 'deleteDevice', 'deleteVolatileMetadata', 'determineParameter', 'exit', 'getAllMetadata', 'getDeviceDescription', 'getInstallMode', 'getKeyMismatchDevice', 'getLinkInfo', 'getLinkPeers', 'getLinks', 'getMetadata', 'getParamset', 'getParamsetDescription', 'getParamsetId', 'getServiceMessages', 'getValue', 'getVersion', 'getVolatileMetadata', 'hasVolatileMetadata', 'init', 'listBidcosInterfaces', 'listDevices', 'listReplaceableDevices', 'listTeams', 'logLevel', 'ping', 'putParamset', 'refreshDeployedDeviceFirmwareList', 'removeLink', 'replaceDevice', 'reportValueUsage', 'restoreConfigToDevice', 'rssiInfo', 'setBidcosInterface', 'setInstallMode', 'setInterfaceClock', 'setLinkInfo', 'setRFLGWInfoLED', 'setTeam', 'setTempKey', 'setValue', 'setVolatileMetadata', 'system.listMethods', 'system.methodHelp', 'updateFirmware', 'system.multicall'];
                        break;
                    case 'BidCos-Wired':
                        methods = ['addLink', 'clearConfigCache', 'deleteDevice', 'getDeviceDescription', 'getLGWStatus', 'getLinkInfo', 'getLinkPeers', 'getLinks', 'getParamset', 'getParamsetDescription', 'getParamsetId', 'getValue', 'init', 'listDevices', 'listReplaceableDevices', 'logLevel', 'ping', 'putParamset', 'removeLink', 'replaceDevice', 'reportValueUsage', 'searchDevices', 'setLinkInfo', 'setValue', 'system.listMethods', 'system.methodHelp', 'updateFirmware', 'system.multicall'];
                        break;
                    case 'VirtualDevices':
                        methods = ['init', 'getParamsetDescription', 'getLinks', 'getDeviceDescription', 'getParamsetId', 'getParamset', 'putParamset', 'system.listMethods', 'listDevices', 'getValue', 'setValue', 'listReplaceableDevices', 'deleteDevice'];
                        break;
                    case 'ReGaHSS':
                        methods = ['deleteDevices', 'event', 'listDevices', 'newDevices', 'replaceDevice', 'reportValueUsage', 'setReadyConfig', 'system.listMethods', 'system.methodHelp', 'updateDevice', 'system.multicall'];
                        break;
                    case 'HmIP-RF':
                        // https://github.com/eq-3/occu/issues/53
                        methods = ['system.methodHelp', 'getLinks', 'ping', 'getParamset', 'getDeviceDescription', 'listDevices', 'setInstallModeWithWhitelist', 'getParamsetDescription', 'getServiceMessages', 'installFirmware', 'getVersion', 'setInstallMode', 'init', 'system.multicall', 'removeLink', 'deleteDevice', 'putParamset', 'reportValueUsage', 'refreshDeployedDeviceFirmwareList', 'setLinkInfo', 'getParamsetId', 'getValue', 'setValue', 'system.listMethods', 'listBidcosInterfaces', 'addLink', 'getLinkInfo', 'getInstallMode'];
                        break;
                    case 'CUxD':
                        methods = ['system.listMethods', 'system.multicall', 'init', 'listDevices', 'deleteDevice', 'getDeviceDescription', 'getParamsetDescription', 'getParamset', 'putParamset', 'getValue', 'setValue'];
                        break;
                    default:
                        methods = [];
                }

                console.log('autocompleteMethods', iface, methods.length);
                $('#node-input-method').autocomplete('option', 'source', methods);
            }
        },
    });
}());
