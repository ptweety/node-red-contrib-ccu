/* eslint-disable wrap-iife */

(function () {
    'use strict';

    RED.nodes.registerType('ccu-set-value', {
        category: 'ccu',
        defaults: {
            name: {value: ''},
            iface: {value: ''},
            ccuConfig: {value: 'localhost', type: 'ccu-connection', required: true},
            rooms: {value: ''},
            roomsRx: {value: 'str'},
            functions: {value: ''},
            functionsRx: {value: 'str'},
            device: {value: ''},
            deviceRx: {value: 'str'},
            deviceName: {value: ''},
            deviceNameRx: {value: 'str'},
            deviceType: {value: ''},
            deviceTypeRx: {value: 'str'},
            channel: {value: ''},
            channelRx: {value: 'str'},
            channelName: {value: ''},
            channelNameRx: {value: 'str'},
            channelType: {value: ''},
            channelTypeRx: {value: 'str'},
            channelIndex: {value: ''},
            channelIndexRx: {value: 'str'},
            datapoint: {value: ''},
            datapointRx: {value: 'str'},
            force: {value: false},
        },
        inputs: 1,
        outputs: 0,
        icon: 'ccu.png',
        color: '#4691BA',
        paletteLabel: 'set value',
        align: 'right',
        label() {
            return this.name || 'set value';
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
        oneditprepare() {
            const that = this;
            const $nodeInputIface = $('#node-input-iface');
            const $nodeInputCcuConfig = $('#node-input-ccuConfig');

            let data;

            let ifacesLoaded = false;
            let ifacesPending = false;

            $('#node-input-force-dropdown').val(String(Boolean(this.force)));

            $('.filter').each(function () {
                const id = $(this).prop('id');
                const $type = $('#' + id + 'Rx');
                const name = id.split('-').pop() + 'Rx';
                $type.val(that[name]);

                const $this = $(this);

                $this.typedInput({
                    typeField: $type,
                    types: ['str', 're'],
                }).typedInput('width', '70%');

                const $input = $this.parent().find('.red-ui-typedInput-input');

                $input.autocomplete({
                    source: [],
                    close() {
                        $input.trigger('change');
                        autocomplete();
                    },
                    delay: 0,
                    minLength: 0,
                });

                $input.on('focus', () => {
                    $input.autocomplete('search');
                });

                $this.on('change', (type, value) => {
                    if (value === 're') {
                        $input.autocomplete('disable');
                    } else {
                        $input.autocomplete('enable');
                    }
                });
            });

            function loadIfaces(iface, cb) {
                if (ifacesPending) {
                    return;
                }

                ifacesPending = true;
                console.log('loadIfaces()');
                $nodeInputIface.html('<option value="">*</option>');
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
                            if (i !== 'ReGaHSS') {
                                $nodeInputIface.append('<option' + (d[i].enabled ? '' : ' disabled') + (i === iface ? ' selected' : '') + '>' + i + '</option>');
                            }
                        });
                        if (typeof cb === 'function') {
                            cb();
                            ifacesPending = false;
                        }
                    });
                }
            }

            $nodeInputCcuConfig.change(() => {
                loadIfaces(this.iface, () => {
                    ifacesLoaded = true;
                    $nodeInputIface.removeAttr('disabled');
                    loadConfig();
                });
            });

            function loadConfig() {
                if (ifacesLoaded) {
                    console.log('loadConfig');
                    const nodeId = $nodeInputCcuConfig.val();
                    const url = 'ccu?config=' + nodeId;
                    $.getJSON(url, d => {
                        data = d;
                        processChannelAssignments();
                        console.log('data', data);
                        autocomplete();
                    });
                }
            }

            function processChannelAssignments() {
                data.roomChannels = {};
                data.roomDevices = {};
                data.functionChannels = {};
                data.functionDevices = {};
                data.nameChannels = {};
                data.nameDevices = {};

                console.log(data);

                Object.keys(data.channelRooms).forEach(channel => {
                    const room = data.channelRooms[channel];
                    const device = channel.split(':')[0];
                    if (data.roomChannels[room]) {
                        data.roomChannels[room].push(channel);
                    } else {
                        data.roomChannels[room] = [channel];
                    }

                    if (!data.roomDevices[room]) {
                        data.roomDevices[room] = [device];
                    } else if (!data.roomDevices[room].includes(device)) {
                        data.roomDevices[room].push(device);
                    }
                });
                Object.keys(data.channelFunctions).forEach(channel => {
                    const func = data.channelFunctions[channel];
                    const device = channel.split(':')[0];
                    if (data.functionChannels[func]) {
                        data.functionChannels[func].push(channel);
                    } else {
                        data.functionChannels[func] = [channel];
                    }

                    if (!data.functionDevices[func]) {
                        data.functionDevices[func] = [device];
                    } else if (!data.functionDevices[func].includes(device)) {
                        data.functionDevices[func].push(device);
                    }
                });
                Object.keys(data.channelNames).forEach(channel => {
                    const name = data.channelNames[channel];
                    if (/:\d+$/.test(channel)) {
                        data.nameChannels[name] = channel;
                    } else {
                        data.nameDevices[name] = channel;
                    }
                });
            }

            $('#node-input-iface').change(autocomplete);
            $('#node-input-room').change(autocomplete);
            $('#node-input-function').change(autocomplete);
            $('#node-input-device').change(autocomplete);
            $('#node-input-deviceName').change(autocomplete);
            $('#node-input-deviceType').change(autocomplete);
            $('#node-input-channel').change(autocomplete);
            $('#node-input-channelName').change(autocomplete);
            $('#node-input-channelType').change(autocomplete);
            $('#node-input-channelIndex').change(autocomplete);
            $('#node-input-datapoint').change(autocomplete);

            function paramsetName(iface, device, paramset) {
                let cType = '';
                let d;
                if (device) {
                    if (device.PARENT) {
                        // channel
                        cType = device.TYPE;
                        d = data.metadata.devices[iface][device.PARENT];
                    } else {
                        // device
                        d = device;
                    }

                    return [iface, d.TYPE, d.FIRMWARE, d.VERSION, cType, paramset].join('/');
                }
            }

            function autocomplete() {
                if (!data) {
                    return;
                }

                const iface = $('#node-input-iface').val();
                const rooms = $('#node-input-rooms').val() ? [$('#node-input-rooms').val()] : [];
                const funcs = $('#node-input-functions').val() ? [$('#node-input-functions').val()] : [];
                const devices = $('#node-input-device').val() ? [$('#node-input-device').val()] : [];
                const deviceNames = $('#node-input-deviceName').val() ? [$('#node-input-deviceName').val()] : [];
                const deviceTypes = $('#node-input-deviceType').val() ? [$('#node-input-deviceType').val()] : [];
                const channels = $('#node-input-channel').val() ? [$('#node-input-channel').val()] : [];
                const channelNames = $('#node-input-channelName').val() ? [$('#node-input-channelName').val()] : [];
                const channelTypes = $('#node-input-channelType').val() ? [$('#node-input-channelType').val()] : [];
                //const channelIndexes = $('#node-input-channelIndex').val() ? [$('#node-input-channelIndex').val()] : [];
                const datapoints = $('#node-input-datapoint').val() ? [$('#node-input-datapoint').val()] : [];

                const lists = {
                    device: [],
                    deviceName: [],
                    deviceType: [],
                    channel: [],
                    channelName: [],
                    channelType: [],
                    channelIndex: [],
                    datapoint: [],
                };

                function composeLists(iface) {
                    if (!data.metadata.devices[iface]) {
                        return;
                    }

                    if (devices.length === 0) {
                        if (deviceNames.length > 0) {
                            deviceNames.forEach(deviceName => {
                                if (deviceName) {
                                    devices.push(data.nameDevices[deviceName]);
                                }
                            });
                        } else if (deviceTypes.length > 0) {
                            deviceTypes.forEach(deviceType => {
                                if (data.metadata.types[iface][deviceType]) {
                                    data.metadata.types[iface][deviceType].forEach(device => {
                                        if (device && !devices.includes(device)) {
                                            devices.push(device);
                                        }
                                    });
                                }
                            });
                        }
                    }

                    if (channels.length === 0) {
                        if (channelNames.length > 0) {
                            channelNames.forEach(channelName => {
                                channels.push(data.nameChannels[channelName]);
                            });
                        } else if (channelTypes.length > 0) {
                            channelTypes.forEach(channelType => {
                                if (data.metadata.types[iface][channelType]) {
                                    data.metadata.types[iface][channelType].forEach(channel => {
                                        if (channel && !channels.includes(channel)) {
                                            channels.push(channel);
                                        }
                                    });
                                }
                            });
                        }
                    }

                    console.log('autocomplete', {iface, rooms, funcs, devices, deviceNames, deviceTypes, channels, channelNames, channelTypes, datapoints});

                    function checkDatapoint(datapoint) {
                        let deviceCheck = false;
                        let channelCheck = false;

                        if (channels && channels.length > 0) {
                            channels.forEach(channel => {
                                if (data.metadata.devices[iface][channel]) {
                                    const psName = paramsetName(iface, data.metadata.devices[iface][channel], 'VALUES');
                                    if (Object.keys(data.paramsetDescriptions[psName]).includes(datapoint)) {
                                        channelCheck = true;
                                    }
                                } else {
                                    channelCheck = true;
                                }
                            });
                            deviceCheck = true;
                        } else {
                            if (devices && devices.length > 0) {
                                devices.forEach(device => {
                                    if (data.metadata.devices[iface][device]) {
                                        data.metadata.devices[iface][device].CHILDREN.forEach(channel => {
                                            const psName = paramsetName(iface, data.metadata.devices[iface][channel], 'VALUES');
                                            if (data.paramsetDescriptions[psName]) {
                                                Object.keys(data.paramsetDescriptions[psName]).forEach(dp => {
                                                    if (datapoint === dp) {
                                                        deviceCheck = true;
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        deviceCheck = true;
                                    }
                                });
                            } else {
                                deviceCheck = true;
                            }

                            channelCheck = true;
                        }

                        return channelCheck && deviceCheck;
                    }

                    function checkChannel(channel) {
                        if (!channel || !data.metadata.devices[iface][channel]) {
                            return true;
                        }

                        let roomCheck = false;
                        let functionCheck = false;
                        let deviceCheck = false;

                        if (rooms.length > 0) {
                            rooms.forEach(room => {
                                if (data.roomChannels[room].includes(channel)) {
                                    roomCheck = true;
                                }
                            });
                        } else {
                            roomCheck = true;
                        }

                        if (funcs.length > 0) {
                            funcs.forEach(func => {
                                if (data.functionChannels[func].includes(channel)) {
                                    functionCheck = true;
                                }
                            });
                        } else {
                            functionCheck = true;
                        }

                        if (devices.length > 0) {
                            devices.forEach(device => {
                                if (channel.startsWith(device)) {
                                    deviceCheck = true;
                                }
                            });
                        } else {
                            deviceCheck = true;
                        }

                        return roomCheck && functionCheck && deviceCheck;
                    }

                    function checkDevice(device) {
                        if (!device || !data.metadata.devices[iface][device]) {
                            return true;
                        }

                        let roomCheck = false;
                        let functionCheck = false;

                        if (rooms.length > 0) {
                            rooms.forEach(room => {
                                if (data.roomDevices[room].includes(device)) {
                                    roomCheck = true;
                                }

                                roomCheck = roomCheck
                                    || data.metadata.devices[iface][device].CHILDREN
                                        .some(v => data.roomDevices[room].includes(v));
                            });
                        } else {
                            roomCheck = true;
                        }

                        if (funcs.length > 0) {
                            funcs.forEach(func => {
                                if (data.functionDevices[func].includes(device)) {
                                    functionCheck = true;
                                }

                                functionCheck = functionCheck
                                    || data.metadata.devices[iface][device].CHILDREN
                                        .some(v => data.functionDevices[func].includes(v));
                            });
                        } else {
                            functionCheck = true;
                        }

                        return roomCheck && functionCheck;
                    }

                    Object.keys(data.metadata.devices[iface]).forEach(dev => {
                        if (/:\d+$/.test(dev)) {
                            if (!checkChannel(dev)) {
                                return;
                            }

                            lists.channel.push(dev);
                            lists.channelName.push(data.channelNames[dev]);
                            if (!lists.channelType.includes(data.metadata.devices[iface][dev].TYPE)) {
                                lists.channelType.push(data.metadata.devices[iface][dev].TYPE);
                            }

                            if (!lists.channelIndex.includes(dev.split(':')[1])) {
                                lists.channelIndex.push(dev.split(':')[1]);
                            }

                            const psName = paramsetName(iface, data.metadata.devices[iface][dev], 'VALUES');
                            if (data.paramsetDescriptions[psName]) {
                                Object.keys(data.paramsetDescriptions[psName]).forEach(dp => {
                                    if (dp && !lists.datapoint.includes(dp) && checkDatapoint(dp)) {
                                        lists.datapoint.push(dp);
                                    }
                                });
                            }
                        } else {
                            if (!checkDevice(dev)) {
                                return;
                            }

                            lists.device.push(dev);
                            lists.deviceName.push(data.channelNames[dev]);
                            if (!lists.deviceType.includes(data.metadata.devices[iface][dev].TYPE)) {
                                lists.deviceType.push(data.metadata.devices[iface][dev].TYPE);

                                data.metadata.devices[iface][dev].CHILDREN.forEach(channel => {
                                    const psName = paramsetName(iface, data.metadata.devices[iface][channel], 'VALUES');
                                    if (data.paramsetDescriptions[psName]) {
                                        Object.keys(data.paramsetDescriptions[psName]).forEach(dp => {
                                            if (!lists.datapoint.includes(dp) && checkDatapoint(dp)) {
                                                lists.datapoint.push(dp);
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                }

                if (iface) {
                    composeLists(iface);
                } else {
                    Object.keys(data.metadata.devices).forEach(iface => {
                        composeLists(iface);
                    });
                }

                console.log('lists', lists);

                Object.keys(lists).forEach(key => {
                    if (key === 'channelIndex') {
                        lists[key].sort((a, b) => Number(a) > Number(b));
                    } else {
                        lists[key].sort((a, b) => a.localeCompare(b));
                    }
                });

                $('#node-input-rooms').parent().find('.red-ui-typedInput-input').autocomplete('option', 'source', data.rooms);
                $('#node-input-functions').parent().find('.red-ui-typedInput-input').autocomplete('option', 'source', data.functions);

                $('#node-input-device').parent().find('.red-ui-typedInput-input').autocomplete('option', 'source', lists.device);
                $('#node-input-deviceName').parent().find('.red-ui-typedInput-input').autocomplete('option', 'source', lists.deviceName);
                $('#node-input-deviceType').parent().find('.red-ui-typedInput-input').autocomplete('option', 'source', lists.deviceType);

                $('#node-input-channel').parent().find('.red-ui-typedInput-input').autocomplete('option', 'source', lists.channel);
                $('#node-input-channelName').parent().find('.red-ui-typedInput-input').autocomplete('option', 'source', lists.channelName);
                $('#node-input-channelType').parent().find('.red-ui-typedInput-input').autocomplete('option', 'source', lists.channelType);
                $('#node-input-channelIndex').parent().find('.red-ui-typedInput-input').autocomplete('option', 'source', lists.channelIndex);

                $('#node-input-datapoint').parent().find('.red-ui-typedInput-input').autocomplete('option', 'source', lists.datapoint);
            }
        },

        oneditsave() {
            this.force = $('#node-input-force-dropdown').val() === 'true';
        },
    });
}());
