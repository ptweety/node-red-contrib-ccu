/* eslint-disable wrap-iife */

(function () {
    'use strict';

    const ccuSignalColors = {
        Pause: 2,
        Rot: 17,
        'Rot lang': 18,
        Grün: 33,
        'Grün lang': 34,
        Orange: 49,
        'Orange lang': 50,
        Blau: 65,
        'Blau lang': 66,
        Violett: 81,
        'Violett lang': 82,
        Cyan: 97,
        'Cyan lang': 98,
        Weiss: 113,
        'Weiss lang': 114,
    };

    const ccuDimmerColors = {
        Aus: 0,
        Blau: 1,
        Grün: 2,
        Türkis: 3,
        Rot: 4,
        Violett: 5,
        Gelb: 6,
        Weiss: 7,
    };

    const ccuOnTime = {
        '100ms': 0,
        '200ms': 1,
        '300ms': 2,
        '400ms': 3,
        '500ms': 4,
        '700ms': 5,
        '1s': 6,
        '2s': 7,
        '3s': 8,
        '5s': 9,
        '7s': 10,
        '10s': 11,
        '20s': 12,
        '40s': 13,
        '60s': 14,
        Permanent: 15,
    };

    const ccuSound = {
        'Interner Sound': 0,
    };

    for (let i = 1; i < 253; i++) {
        ccuSound['Datei ' + ('00' + i).slice(-3)] = i;
    }

    ccuSound['Zufällig'] = 253;
    ccuSound.Vorherig = 254;
    ccuSound.Egal = 255;

    RED.nodes.registerType('ccu-signal', {

        category: 'ccu',
        defaults: {
            name: {value: ''},
            iface: {value: 'BidCos-RF', required: true},
            channel: {value: '', required: true},
            chime: {value: ''},
            length: {value: 108_000},
            repeat: {value: 1},
            repeatType: {value: 'num'},
            volume: {value: 100},
            volumeType: {value: 'num'},
            line1: {value: ''},
            icon1: {value: ''},
            line2: {value: ''},
            icon2: {value: ''},
            line3: {value: ''},
            icon3: {value: ''},
            signal: {value: ''},
            channelType: {value: ''},
            led: {value: ''},
            acousticAlarmSelection: {value: 'DISABLE_ACOUSTIC_SIGNAL'},
            durationUnit: {value: 'S'},
            durationValue: {value: 0},
            durationValueType: {value: 'num'},
            rampTimeUnit: {value: 'S'},
            rampTimeValue: {value: 0},
            rampTimeValueType: {value: 'num'},
            repetitions: {value: 0},
            dimmerColor: {value: 0},
            dimmerLevel: {value: 100},
            dimmerList: {value: []},
            soundLevel: {value: 50},
            soundLevelType: {value: 'num'},
            soundList: {value: []},
            opticalAlarmSelection: {value: 'DISABLE_OPTICAL_SIGNAL'},
            ccuConfig: {value: 'localhost', type: 'ccu-connection', required: true},
        },
        inputs: 1,
        outputs: 0,
        icon: 'ccu.png',
        color: '#4691BA',
        paletteLabel: 'signal',
        align: 'right',
        label() {
            return this.name || 'signal';
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
        oneditprepare() {
            const $nodeInputChannel = $('#node-input-channel');
            const $nodeInputChannelType = $('#node-input-channelType');
            const $nodeInputCcuConfig = $('#node-input-ccuConfig');
            const $nodeInputIface = $('#node-input-iface');
            const $nodeInputName = $('#node-input-name');

            $('#node-input-repeat').typedInput({
                default: 'num',
                types: ['num', 'msg', 'flow', 'global', 'env'],
                typeField: '#node-input-repeatType',
            });

            $('#node-input-volume').typedInput({
                default: 'num',
                types: ['num', 'msg', 'flow', 'global', 'env'],
                typeField: '#node-input-volumeType',
            });

            $('#node-input-durationValue').typedInput({
                default: 'num',
                types: ['num', 'msg', 'flow', 'global', 'env'],
                typeField: '#node-input-durationValueType',
            });

            $('#node-input-rampTimeValue').typedInput({
                default: 'num',
                types: ['num', 'msg', 'flow', 'global', 'env'],
                typeField: '#node-input-rampTimeValueType',
            });

            $('#node-input-soundLevel').typedInput({
                default: 'num',
                types: ['num', 'msg', 'flow', 'global', 'env'],
                typeField: '#node-input-soundLevelType',
            });

            let data;

            let ifacesLoaded = false;
            let ifacesPending = false;

            function loadIfaces(iface, cb) {
                if (ifacesPending) {
                    return;
                }

                ifacesPending = true;
                console.log('loadIfaces()');
                $nodeInputIface.html('');
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
                if (ifacesLoaded) {
                    const nodeId = $nodeInputCcuConfig.val();
                    if (nodeId && nodeId !== '__ADD__') {
                        console.log('loadConfig()');
                        $.getJSON('ccu?type=signal&config=' + nodeId + '&iface=' + $nodeInputIface.val(), d => {
                            data = d;
                            autoCompleteChannel();
                        });
                    } else {
                        autoCompleteChannel();
                    }
                }
            }

            $nodeInputCcuConfig.change(() => {
                console.log('$nodeInputCcuConfig change');
                loadIfaces(this.iface, () => {
                    ifacesLoaded = true;
                    $nodeInputIface.removeAttr('disabled');
                    loadConfig();
                });
            });

            $nodeInputIface.change(() => {
                if (ifacesLoaded) {
                    loadConfig();
                }
            });

            $nodeInputChannelType.change(() => {
                $('.SUBMIT').hide();
                $('.SUBMIT.' + $nodeInputChannelType.val()).show();
            });

            $nodeInputChannel.autocomplete({
                source: [],
                close() {
                    const n = $nodeInputChannel.val().split(' ');
                    const channel = n.shift();
                    $nodeInputChannel.val(channel);
                    if (data && data[channel]) {
                        let {type, deviceType} = data[channel];
                        if (deviceType === 'HmIP-BSL') {
                            type = 'BSL_' + type;
                        }

                        $nodeInputChannelType.val(type).trigger('change');
                    }

                    if (!$nodeInputName.val()) {
                        $nodeInputName.val(n.join(' '));
                    }
                },
                delay: 0,
                minLength: 0,
            });

            $nodeInputChannel.on('focus', () => {
                $nodeInputChannel.autocomplete('search');
            });

            function autoCompleteChannel() {
                const channels = [];
                if (data) {
                    for (let addr of Object.keys(data)) {
                        if (/:\d+$/.test(addr)) {
                            if (data[addr].name) {
                                addr += ' ' + data[addr].name;
                            }

                            channels.push(addr);
                        }
                    }
                }

                console.log('autoCompleteChannel()', channels.length);
                $nodeInputChannel.autocomplete('option', 'source', channels);

                if (!data[$nodeInputChannel.val().split(' ')[0]]) {
                    $nodeInputChannel.val('');
                }
            }

            $nodeInputChannel.change(() => {
                const channel = $nodeInputChannel.val();
                if (data && data[channel]) {
                    $nodeInputChannelType.val(data[channel]);
                }
            });

            $('#node-input-chime-container').css('min-height', '300px').css('min-width', '450px').editableList({
                sortable: true,
                removable: true,
                addItem(container, i, data) {
                    if ($('#node-input-chime-container').editableList('length') > 10) {
                        $('#node-input-chime-container').editableList('removeItem', data);
                    } else {
                        let html = '<select class="number mp3" style="width: 80px;"><option value="">default</option>';
                        for (let i = 1; i < 256; i++) {
                            html += '<option value="' + i + '"' + (data.cmd === String(i) ? ' selected' : '') + '>' + ('00' + i).slice(-3) + '</option>';
                        }

                        html += '</select>';
                        $(html).appendTo(container);
                        container.find('input:last').focus();
                    }
                },
            });

            $('#node-input-led-container').css('min-height', '300px').css('min-width', '450px').editableList({
                sortable: true,
                removable: true,
                addItem(container, i, data) {
                    if ($('#node-input-led-container').editableList('length') > 10) {
                        $('#node-input-led-container').editableList('removeItem', data);
                        return false;
                    }

                    const select = $('<select class="number led" value="' + data.cmd + '"/>').appendTo(container);
                    for (const name of Object.keys(ccuSignalColors)) {
                        $('<option value="' + ccuSignalColors[name] + '"' + (ccuSignalColors[name] === Number.parseInt(data.cmd, 10) ? ' selected' : '')
                            + '>' + name + '</option>').appendTo(select);
                    }
                },
            });

            $('#node-input-dimmer-container').css('min-height', '300px').css('min-width', '450px').editableList({
                sortable: true,
                removable: true,
                addItem(container, i, data) {
                    if ($('#node-input-dimmer-container').editableList('length') > 12) {
                        $('#node-input-dimmer-container').editableList('removeItem', data);
                        return false;
                    }

                    const select = $('<select class="number color" style="width: calc(50% - 8px);" value="' + data.color + '"/>').appendTo(container);
                    for (const name of Object.keys(ccuDimmerColors)) {
                        $('<option value="' + ccuDimmerColors[name] + '"' + (ccuDimmerColors[name] === Number.parseInt(data.color, 10) ? ' selected' : '')
                            + '>' + name + '</option>').appendTo(select);
                    }

                    const ontime = $(`<select class="number ontime" style="width: calc(50% - 8px); margin-left: 6px;" value="${data.ontime}"></select>`).appendTo(container);
                    for (const name of Object.keys(ccuOnTime)) {
                        $('<option value="' + ccuOnTime[name] + '"' + (ccuOnTime[name] === Number.parseInt(data.ontime, 10) ? ' selected' : '')
                            + '>' + name + '</option>').appendTo(ontime);
                    }
                },
            });

            $('#node-input-acoustic-container').css('min-height', '300px').css('min-width', '450px').editableList({
                sortable: true,
                removable: true,
                addItem(container, i, data) {
                    if ($('#node-input-acoustic-container').editableList('length') > 12) {
                        $('#node-input-acoustic-container').editableList('removeItem', data);
                        return false;
                    }

                    const select = $('<select class="number sound" value="' + data.sound + '"/>').appendTo(container);
                    for (const name of Object.keys(ccuSound)) {
                        $('<option value="' + ccuSound[name] + '"' + (ccuSound[name] === Number.parseInt(data.sound, 10) ? ' selected' : '')
                            + '>' + name + '</option>').appendTo(select);
                    }
                },
            });

            $('#node-input-key-container').css('min-height', '300px').css('min-width', '450px').editableList({});

            switch (this.channelType) {
                case 'SIGNAL_CHIME': {
                    /*
                    const [volume, repeat, length, ...commands] = this.chime.split(',');
                    $('#node-input-volume').val(Math.round(volume * 100));
                    $('#node-input-repeat').val(repeat);
                    $('#node-input-length').val(length);
                    */

                    for (const cmd of this.chime.split(',')) {
                        $('#node-input-chime-container').editableList('addItem', {cmd});
                    }

                    break;
                }

                case 'SIGNAL_LED': {
                    /*
                    const [, repeat, length, ...commands] = this.led.split(',');
                    $('#node-input-repeat').val(repeat);
                    $('#node-input-length').val(length);
                    */
                    for (const cmd of this.led.split(',')) {
                        $('#node-input-led-container').editableList('addItem', {cmd});
                    }

                    break;
                }

                case 'ALARM_SWITCH_VIRTUAL_RECEIVER': {
                    // ...

                    break;
                }

                case 'ACOUSTIC_SIGNAL_VIRTUAL_RECEIVER': {
                    for (const item of this.soundList) {
                        $('#node-input-acoustic-container').editableList('addItem', item);
                    }

                    break;
                }

                case 'DIMMER_VIRTUAL_RECEIVER': {
                    for (const item of this.dimmerList) {
                        $('#node-input-dimmer-container').editableList('addItem', item);
                    }

                    break;
                }

                case 'BSL_DIMMER_VIRTUAL_RECEIVER': {
                    // ...

                    break;
                }

                default: {
                    console.error('unknown channelType', this.channelType);
                }
            }

            $('.SUBMIT').hide();
            $('.SUBMIT.' + $nodeInputChannelType.val()).show();
        },
        oneditsave() {
            const $nodeInputChannelType = $('#node-input-channelType');
            switch ($nodeInputChannelType.val()) {
                case 'SIGNAL_CHIME': {
                    const chime = [];
                    $('#node-input-chime-container').editableList('items').each(function () {
                        chime.push($(this).find('select.number.mp3').val());
                    });
                    this.chime = chime.join(',');

                    break;
                }

                case 'SIGNAL_LED': {
                    const led = [];
                    $('#node-input-led-container').editableList('items').each(function () {
                        led.push($(this).find('select').val());
                    });
                    this.led = led.join(',');

                    break;
                }

                case 'DIMMER_VIRTUAL_RECEIVER': {
                    const dimmerList = [];
                    $('#node-input-dimmer-container').editableList('items').each(function () {
                        dimmerList.push({color: $(this).find('select.color').val(), ontime: $(this).find('select.ontime').val()});
                    });
                    console.log(dimmerList);
                    this.dimmerList = dimmerList;
                    break;
                }

                case 'ACOUSTIC_SIGNAL_VIRTUAL_RECEIVER': {
                    const soundList = [];
                    $('#node-input-acoustic-container').editableList('items').each(function () {
                        soundList.push({sound: $(this).find('select.sound').val()});
                    });
                    this.soundList = soundList;
                    break;
                }

                case 'KEY':
                    break;

                default:
            }

            this.icon1 = $('#node-input-icon1').val();
            this.icon2 = $('#node-input-icon2').val();
            this.icon3 = $('#node-input-icon3').val();

            this.repetitions = Number.parseInt(this.repetitions, 10);
        },
    });
}());
