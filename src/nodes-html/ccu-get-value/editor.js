/* eslint-disable wrap-iife */

(function () {
    'use strict';

    RED.nodes.registerType('ccu-get-value', {
        color: '#c2d5e4',
        category: 'ccu',
        defaults: {
            name: {value: ''},
            ccuConfig: {value: 'localhost', type: 'ccu-connection', required: true},
            iface: {value: 'ReGaHSS'},
            channel: {value: ''},
            sysvar: {value: ''},
            sysvarProperty: {value: 'value'},
            datapoint: {value: ''},
            datapointProperty: {value: 'value'},
            setProp: {value: 'payload'},
            setPropType: {value: 'msg'},
        },
        inputs: 1,
        outputs: 1,
        icon: 'ccu.png',
        paletteLabel() {
            return 'get value';
        },
        label() {
            return this.name || 'get value';
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
        oneditprepare() {
            // eslint-disable-next-line unicorn/no-this-assignment
            const node = this;

            const $nodeSetProp = $('#node-input-setProp');
            const $nodeSetPropType = $('#node-input-setPropType');
            const $nodeInputIface = $('#node-input-iface');
            const $nodeInputCcuConfig = $('#node-input-ccuConfig');
            const $nodeInputChannel = $('#node-input-channel');
            const $nodeInputSysvar = $('#node-input-sysvar');
            const $nodeInputSysvarProperty = $('#node-input-sysvarProperty');
            const $nodeInputDatapoint = $('#node-input-datapoint');
            const $nodeInputDatapointProperty = $('#node-input-datapointProperty');
            const $configLookupBtn = $('#config-lookup-btn');
            const $configLookupTree = $('#config-lookup-tree');

            let data;
            let channelArray;

            let ifacesLoaded = false;
            let ifacesPending = false;

            if (!this.setProp) {
                this.setProp = 'payload';
                $nodeSetProp.val('payload');
            }

            if (!this.setPropType) {
                this.setPropType = 'msg';
            }

            $nodeSetProp.typedInput({
                default: this.setPropType,
                types: [{
                    value: 'cmsg',
                    label: 'msg',
                    hasValue: false,
                }, 'msg', 'flow', 'global'],
                typeField: $nodeSetPropType,
            });

            $('.form-row.datapoint').hide();
            $('.form-row.sysvar').hide();

            const sysvarProperties = ['value', 'valueEnum', 'ts', 'lc'];
            const datapointProperties = ['value', 'ts', 'lc', 'working', 'direction', 'all'];

            for (const value of sysvarProperties) {
                $nodeInputSysvarProperty.append(
                    $('<option></option>').val(value).text(node._('node-red-contrib-ccu/ccu-connection:common.label.' + value)),
                );
            }

            for (const value of datapointProperties) {
                $nodeInputDatapointProperty.append(
                    $('<option></option>').val(value).text(node._('node-red-contrib-ccu/ccu-connection:common.label.' + value)),
                );
            }

            $nodeInputSysvarProperty.val(node.sysvarProperty || sysvarProperties[0]);
            $nodeInputDatapointProperty.val(node.datapointProperty || datapointProperties[0]);

            function loadIfaces(iface, cb) {
                if (ifacesPending) {
                    return;
                }

                ifacesPending = true;
                console.log('loadIfaces()');

                $nodeInputIface.html('');

                const nodeId = $nodeInputCcuConfig.val();
                if (nodeId !== '_ADD_') {
                    const url = 'ccu?config=' + nodeId + '&type=ifaces';
                    $.getJSON(url, data => {
                        $nodeInputIface.append('<option></option>');
                        for (const iFace of Object.keys(data)) {
                            $nodeInputIface.append('<option' + (data[iFace].enabled ? '' : ' disabled') + (iFace === node.iface ? ' selected' : '') + '>' + iFace + '</option>');
                        }

                        $nodeInputIface.removeAttr('disabled');
                        $configLookupBtn.removeAttr('disabled');

                        $nodeInputIface.trigger('change');
                        if (typeof cb === 'function') {
                            cb();
                            ifacesPending = false;
                        }
                    });
                    $.getJSON('ccu?type=sysvar&config=' + nodeId, data => {
                        $nodeInputSysvar.html('<option></option>');
                        if (data) {
                            for (const name of Object.keys(data)) {
                                $nodeInputSysvar.append('<option value="' + name + '"' + (name === node.sysvar ? ' selected' : '') + '>' + name + '</option>');
                            }
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
                    autocompleteChannel();
                    autocompleteDatapoint();
                });
            }

            $nodeInputCcuConfig.on('change', () => {
                console.log('$nodeInputCcuConfig change');
                loadIfaces(this.iface, () => {
                    ifacesLoaded = true;
                    loadConfig();
                });
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
                const c = data[$nodeInputChannel.val().split(' ')[0]];
                if (c) {
                    c.datapoints.sort((a, b) => a.localeCompare(b));
                    $nodeInputDatapoint.autocomplete('option', 'source', c.datapoints);
                    if (!c.datapoints.includes($nodeInputDatapoint.val())) {
                        $nodeInputDatapoint.val('').autocomplete('search');
                    }
                }
            }

            $nodeInputIface.on('change', () => {
                console.log('$nodeInputIface change');
                if ($nodeInputIface.val() === 'ReGaHSS') {
                    $('.form-row.datapoint').hide();
                    $('.form-row.sysvar').show();
                } else if ($nodeInputIface.val()) {
                    $('.form-row.sysvar').hide();
                    $('.form-row.datapoint').show();
                }

                loadConfig();
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
                        label: node._('node-red-contrib-ccu/ccu-connection:common.label.rooms'),
                        icon: 'fa fa-home fa-fw',
                        children: (done, item) => loadTreeData('rooms', done, item),
                    }, {
                        id: 'functions',
                        label: node._('node-red-contrib-ccu/ccu-connection:common.label.functions'),
                        icon: 'fa fa-cogs fa-fw',
                        children: (done, item) => loadTreeData('functions', done, item),
                    }, {
                        id: 'all',
                        label: node._('node-red-contrib-ccu/ccu-connection:common.label.allDevices'),
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
                    }, {
                        id: 'sysVars',
                        label: node._('node-red-contrib-ccu/ccu-connection:common.label.sysVars'),
                        icon: 'fa fa-cog fa-fw',
                        children: (done, item) => loadTreeData('sysvar', done, item),
                    }],
                });
            }

            $configLookupTree.on('treelistselect', (event, item) => {
                if (item && item.iface && item.channel && item.datapoint && item.property) {
                    $('.form-row.sysvar').hide();
                    $('.form-row.datapoint').show();
                    $nodeInputIface.val(item.iface);
                    $nodeInputChannel.val(item.channel);
                    $nodeInputDatapoint.val(item.datapoint);
                    $nodeInputDatapointProperty.val(item.property);
                    $dialog.dialog('close');
                    loadConfig();
                } else if (item && item.sysvar && item.property) {
                    $('.form-row.datapoint').hide();
                    $('.form-row.sysvar').show();
                    $nodeInputIface.val('ReGaHSS');
                    $nodeInputSysvar.val(item.sysvar);
                    $nodeInputSysvarProperty.val(item.property);
                    $dialog.dialog('close');
                    loadConfig();
                }
            });

            $configLookupBtn.click(() => {
                $dialog.dialog('open');
                if (!channelArray) {
                    channelArray = [];
                    const url = 'ccu?config=' + $nodeInputCcuConfig.val() + '&type=tree';
                    $.getJSON(url, data => {
                        for (const addr of Object.keys(data)) {
                            channelArray.push(data[addr]);
                            if (data[addr].children) {
                                for (const dp of data[addr].children) {
                                    if (!dp.children) {
                                        dp.children = getDPProp(dp);
                                    }
                                }
                            }
                        }
                    });
                }
            });

            function getDPProp(dp) {
                const result = [];

                for (const property of datapointProperties) {
                    result.push({
                        id: dp.id + '.' + property,
                        label: node._('node-red-contrib-ccu/ccu-connection:common.label.' + property),
                        icon: 'fa fa-tasks fa-fw',
                        iface: dp.iface,
                        channel: dp.channel,
                        datapoint: dp.label,
                        property,
                    });
                }

                return result;
            }

            function loadTreeData(type, done, item, ifId) {
                const nodeId = $nodeInputCcuConfig.val();
                if (nodeId === '_ADD_') {
                    return;
                }

                let url = 'ccu?config=' + nodeId + '&type=' + type;

                if (type === 'tree') {
                    url += '&iface=' + ifId;
                    $.getJSON(url, devices => {
                        const deviceIDs = [];
                        for (const id of Object.keys(devices)) {
                            const dev = devices[id];
                            for (const ch of dev.children) {
                                if (ch.children) {
                                    ch.children.sort((a, b) => a.label.localeCompare(b.label));
                                    for (const dp of ch.children) {
                                        // eslint-disable-next-line max-depth
                                        if (!dp.children) {
                                            dp.children = getDPProp(dp);
                                        }
                                    }
                                }
                            }

                            deviceIDs.push(dev);
                        }

                        deviceIDs.sort((a, b) => a.label.localeCompare(b.label));
                        done(deviceIDs);
                    });
                } else if (type === 'sysvar') {
                    $.getJSON(url, d => {
                        const sysVars = [];
                        for (const id of Object.keys(d)) {
                            sysVars.push({
                                id,
                                label: id,
                                icon: 'fa fa-tags fa-fw',
                                children(done) {
                                    const result = [];
                                    for (const property of sysvarProperties) {
                                        result.push({
                                            label: node._('node-red-contrib-ccu/ccu-connection:common.label.' + property),
                                            icon: 'fa fa-tag fa-fw',
                                            sysvar: id,
                                            property,
                                        });
                                    }

                                    done(result);
                                },
                            });
                        }

                        done(sysVars);
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
                                        if (channelArray) {
                                            for (const ch of channelArray) {
                                                if (ch[type] && ch[type].includes(lbl)) {
                                                    channels.push(ch);
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
    });
}());
