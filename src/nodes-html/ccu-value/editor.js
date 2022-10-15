/* eslint-disable wrap-iife */

(function () {
    'use strict';

    function clipValueLength(v, l) {
        return (v.length > l) ? v.slice(0, Math.max(0, (l - 3))) + '...' : v;
    }

    RED.nodes.registerType('ccu-value', {
        category: 'ccu',
        defaults: {
            name: {value: ''},
            iface: {value: ''},
            channel: {value: ''},
            datapoint: {value: ''},
            mode: {value: ''},
            start: {value: true},
            change: {value: true},
            cache: {value: false},
            queue: {value: false},
            on: {value: ''},
            onType: {value: 'undefined'},
            ramp: {value: ''},
            rampType: {value: 'undefined'},
            working: {value: false},
            ccuConfig: {value: 'localhost', type: 'ccu-connection', required: true},
            topic: {value: '${CCU}/${Interface}/${channel}/${datapoint}'}, // eslint-disable-line no-template-curly-in-string
        },
        inputs: 1,
        outputs: 1,
        icon: 'ccu.png',
        color: '#4691BA',
        paletteLabel: 'value',
        align: 'right',
        label() {
            if (this.name) {
                return this.name;
            }

            const dp = String(this.datapoint).replace(/PRESS_|_STATE|_MODE|ERROR_|OPERATING_|ACTUAL_|^STATE$|^LEVEL$/, '');

            return clipValueLength(String(this.channel).replace(/^[A-Za-z\d-]+:\d+ /, ''), 30) + ((dp.length > 1 && dp.length < 10) ? ' ' + dp : '') || 'value';
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
        oneditprepare() {
            console.log(this);

            const $nodeInputIface = $('#node-input-iface');
            const $nodeInputCcuConfig = $('#node-input-ccuConfig');
            const $nodeInputChannel = $('#node-input-channel');
            const $nodeInputDatapoint = $('#node-input-datapoint');
            const $configLookupBtn = $('#config-lookup-btn');
            const $configLookupTree = $('#config-lookup-tree');

            let data;
            let channelList;
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
                    autocompleteDatapoint();
                });
            }

            $nodeInputCcuConfig.on('change', () => {
                console.log('$nodeInputCcuConfig change');
                loadIfaces(this.iface, () => {
                    ifacesLoaded = true;
                    $nodeInputIface.removeAttr('disabled');
                    $configLookupBtn.removeAttr('disabled');
                    loadConfig();
                });
            });

            $('#node-input-onEnabled').on('change', () => {
                if ($('#node-input-onEnabled').is(':checked')) {
                    $('#node-input-on').removeAttr('disabled');
                } else {
                    $('#node-input-on').attr('disabled', true);
                }
            });
            $('#node-input-rampEnabled').on('change', () => {
                if ($('#node-input-rampEnabled').is(':checked')) {
                    $('#node-input-ramp').removeAttr('disabled');
                } else {
                    $('#node-input-ramp').attr('disabled', true);
                }
            });
            $nodeInputChannel.autocomplete({
                source: [],
                close() {
                    autocompleteDatapoint();
                },
                delay: 0,
                minLength: 0,
            });

            $nodeInputChannel.on('focus', () => {
                $nodeInputChannel.autocomplete('search');
            });

            $nodeInputDatapoint.autocomplete({
                source: [],
                delay: 0,
                minLength: 0,
            });

            $nodeInputDatapoint.on('focus', () => {
                $nodeInputDatapoint.autocomplete('search');
            });

            $nodeInputChannel.on('blur', autocompleteDatapoint);

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
                    $nodeInputDatapoint.val('');
                }
            }

            function autocompleteDatapoint() {
                const chName = $nodeInputChannel.val().split(' ')[0];
                const c = data[chName];
                $('.RAMP_TIME').hide();
                $('.ON_TIME').hide();
                if (c) {
                    c.datapoints.sort((a, b) => a.localeCompare(b));
                    $nodeInputDatapoint.autocomplete('option', 'source', c.datapoints);
                    if (!c.datapoints.includes($nodeInputDatapoint.val())) {
                        $nodeInputDatapoint.val('').autocomplete('search');
                    }

                    if (c.datapoints.includes('RAMP_TIME')) {
                        $('.RAMP_TIME').show();
                    } else {
                        $('#node-input-ramp').typedInput('type', 'undefined');
                        $('#node-input-ramp').val('');
                    }

                    if (c.datapoints.includes('ON_TIME')) {
                        $('.ON_TIME').show();
                    } else {
                        $('#node-input-on').typedInput('type', 'undefined');
                        $('#node-input-on').val('');
                    }

                    if (c.rxMode & 0x02) {
                        $('.BURST').show();
                    } else {
                        $('.BURST').hide();
                    }
                }
            }

            $nodeInputIface.on('change', () => {
                console.log('$nodeInputIface change');
                $('.BURST').hide();
                loadConfig();
            });

            const typeUndefined = {
                value: 'undefined',
                label: 'undefined',
                hasValue: false,
            };

            $('#node-input-on').typedInput({
                default: 'undefined',
                typeField: '#node-input-onType',
                types: [
                    'msg',
                    'flow',
                    'global',
                    'num',
                    typeUndefined,
                ],
            });

            // $('#node-input-on').val(this.on);

            $('#node-input-ramp').typedInput({
                default: 'undefined',
                typeField: '#node-input-rampType',
                types: [
                    'msg',
                    'flow',
                    'global',
                    'num',
                    typeUndefined,
                ],
            });

            const $dialog = $('#dialog-select-datapoint').dialog({
                autoOpen: false,
                height: 400,
                width: 600,
                modal: true,
            });

            if (typeof $().treeList === 'undefined') {
                // maybe wrong node-red version
                $configLookupBtn.hide();
            } else {
                $configLookupTree.css({width: '100%', height: '100%'}).treeList({
                    data: [{
                        id: 'rooms',
                        label: this._('node-red-contrib-ccu/ccu-connection:common.label.rooms'),
                        icon: 'fa fa-home fa-fw',
                        children: (done, item) => loadTreeData('rooms', done, item),
                    }, {
                        id: 'functions',
                        label: this._('node-red-contrib-ccu/ccu-connection:common.label.functions'),
                        icon: 'fa fa-cogs fa-fw',
                        children: (done, item) => loadTreeData('functions', done, item),
                    }, {
                        id: 'all',
                        label: this._('node-red-contrib-ccu/ccu-connection:common.label.allDevices'),
                        icon: 'fa fa-slack fa-fw',
                        children(done) {
                            const nodeId = $nodeInputCcuConfig.val();
                            const url = 'ccu?config=' + nodeId + '&type=ifaces';
                            $.getJSON(url, d => {
                                const enabledInterfaces = [];
                                for (const ifId of Object.keys(d)) {
                                    const iface = d[ifId];
                                    if (ifId !== 'ReGaHSS' && iface.enabled) {
                                        enabledInterfaces.push({
                                            id: ifId,
                                            label: ifId,
                                            icon: 'fa fa-empire fa-fw',
                                            children: (done, item) => loadTreeData('tree', done, item, ifId),
                                        });
                                    }
                                }

                                done(enabledInterfaces);
                            });
                        },
                    }],
                });
            }

            $configLookupTree.on('treelistselect', (event, item) => {
                if (item && item.iface && item.channel && item.label) {
                    $nodeInputIface.val(item.iface);
                    $nodeInputChannel.val(item.channel);
                    $nodeInputDatapoint.val(item.label);
                    $dialog.dialog('close');
                    loadConfig();
                }
            });

            $configLookupBtn.click(() => {
                $dialog.dialog('open');
                if (!channelList) {
                    const url = 'ccu?config=' + $nodeInputCcuConfig.val() + '&type=tree';
                    $.getJSON(url, data => {
                        channelList = data;
                    });
                }
            });

            function loadTreeData(type, done, item, ifId) {
                const nodeId = $nodeInputCcuConfig.val();
                if (nodeId === '_ADD_') {
                    return;
                }

                let url = 'ccu?config=' + nodeId + '&type=' + type;
                if (type === 'tree') {
                    url += '&iface=' + ifId + '&classCh=tree-channel&classDp=tree-dp';
                    $.getJSON(url, devices => {
                        const deviceIDs = [];
                        for (const id of Object.keys(devices)) {
                            deviceIDs.push(devices[id]);
                        }

                        deviceIDs.sort((a, b) => a.label.localeCompare(b.label));
                        for (const ch of deviceIDs) {
                            if (ch.children) {
                                ch.children.sort((a, b) => a.label.localeCompare(b.label));
                            }
                        }

                        done(deviceIDs);
                    });
                } else {
                    const url = 'ccu?config=' + nodeId + '&type=' + type;
                    $.getJSON(url, r => {
                        const types = [];
                        if (r && r[type]) {
                            for (let index = 0; index < r[type].length; index++) {
                                const lbl = r[type][index];
                                types.push({
                                    label: lbl,
                                    children(done) {
                                        const channels = [];
                                        if (channelList) {
                                            for (const addr of Object.keys(channelList)) {
                                                if (channelList[addr][type] && channelList[addr][type].includes(lbl)) {
                                                    channels.push(channelList[addr]);
                                                }
                                            }
                                        }

                                        channels.sort((a, b) => a.label.localeCompare(b.label));
                                        done(channels);
                                    },
                                });
                            }
                        }

                        done(types);
                    });
                }
            }
        },

        oneditsave() {
            if ($('#ON_TIME').is(':hidden')) {
                this.onType = 'undefined';
            }

            if ($('#RAMP_TIME').is(':hidden')) {
                this.rampType = 'undefined';
            }

            if (this.onType === 'undefined') {
                this.on = 0;
            }

            if (this.rampType === 'undefined') {
                this.ramp = 0;
            }
        },
    });
}());
