/* eslint-disable wrap-iife */

(function () {
    'use strict';

    RED.nodes.registerType('ccu-display', {
        category: 'ccu',
        defaults: {
            name: {value: ''},
            iface: {value: 'BidCos-RF', required: true},
            channel: {value: '', required: true},
            disable1: {value: false},
            line1: {value: ''},
            icon1: {value: ''},
            color1: {value: '0x80'},
            disable2: {value: false},
            line2: {value: ''},
            icon2: {value: ''},
            color2: {value: '0x80'},
            disable3: {value: false},
            line3: {value: ''},
            icon3: {value: ''},
            color3: {value: '0x80'},
            disable4: {value: false},
            line4: {value: ''},
            icon4: {value: ''},
            color4: {value: '0x80'},
            disable5: {value: false},
            line5: {value: ''},
            icon5: {value: ''},
            color5: {value: '0x80'},
            disable6: {value: false},
            line6: {value: ''},
            icon6: {value: ''},
            color6: {value: '0x80'},
            channelType: {value: ''},
            signal: {value: '0xF0'},
            repeat: {value: '0xD0'},
            pause: {value: '0xE0'},
            sound: {value: '0xC0'},
            ccuConfig: {value: 'localhost', type: 'ccu-connection', required: true},
        },
        inputs: 1,
        outputs: 0,
        icon: 'ccu.png',
        color: '#4691BA',
        paletteLabel: 'display',
        align: 'right',
        label() {
            return this.name || 'display';
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
        oneditprepare() {
            // get templates for line, color & icon
            const $nodeLineX = $('#node-line-X')[0];
            const $nodeColorX = $('#node-color-X')[0];
            const $nodeIconX = $('#node-icon-X')[0];
            const $nodeDisableI = $('#node-disable-X')[0];

            // replace X -> number and insert templates
            for (let i = 6; i > 0; i--) {
                let extraClass = 'HM-Dis-EP-WM55';
                if (i >= 4) {
                    extraClass = '';
                }

                const nodeIconI = $nodeIconX.innerHTML.replaceAll('X', i);
                $nodeLineX.insertAdjacentHTML('afterend', '<div class="form-row SUBMIT HM-Dis-WM55 ' + extraClass + '">' + nodeIconI + '</div>');
                $('#node-input-icon' + i)[0].value = this['icon' + i];

                const nodeColorI = $nodeColorX.innerHTML.replaceAll('X', i);
                $nodeLineX.insertAdjacentHTML('afterend', '<div class="form-row SUBMIT HM-Dis-WM55">' + nodeColorI + '</div>');
                $('#node-input-color' + i)[0].value = this['color' + i];

                const nodeLineI = $nodeLineX.innerHTML.replaceAll('X', i);
                $nodeLineX.insertAdjacentHTML('afterend', '<div class="form-row SUBMIT HM-Dis-WM55 ' + extraClass + '">' + nodeLineI + '</div>');
                $('#node-input-line' + i)[0].value = this['line' + i];

                const nodeDisableI = $nodeDisableI.innerHTML.replaceAll('X', i);
                $nodeLineX.insertAdjacentHTML('afterend', '<div class="form-row SUBMIT HM-Dis-WM55 ' + extraClass + '">' + nodeDisableI + '</div>');
                $('#node-input-disable' + i).on('change', () => {
                    const dis = $('#node-input-disable' + i)[0].checked;
                    $('#node-input-icon' + i).prop('disabled', dis);
                    $('#node-input-color' + i).prop('disabled', dis);
                    $('#node-input-line' + i).prop('disabled', dis);
                });

                $('#node-input-disable' + i)[0].checked = this['disable' + i];
            }

            // remove templates
            $nodeLineX.remove();
            $nodeColorX.remove();
            $nodeIconX.remove();
            $nodeDisableI.remove();

            const $nodeInputName = $('#node-input-name');
            const $nodeInputChannel = $('#node-input-channel');
            const $nodeInputChannelType = $('#node-input-channelType');
            const $nodeInputCcuConfig = $('#node-input-ccuConfig');
            const $nodeInputIface = $('#node-input-iface');

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

            function loadConfig() {
                if (ifacesLoaded) {
                    const nodeId = $nodeInputCcuConfig.val();
                    if (nodeId && nodeId !== '__ADD__') {
                        console.log('loadConfig()');
                        $.getJSON('ccu?type=display&config=' + nodeId + '&iface=' + $nodeInputIface.val(), d => {
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

            $nodeInputChannel.autocomplete({
                source: [],
                close() {
                    const n = $nodeInputChannel.val().split(' ');
                    const channel = n.shift();
                    $nodeInputChannel.val(channel);
                    if (data && data[channel]) {
                        $nodeInputChannelType.val(data[channel].type).trigger('change');
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
                    Object.keys(data).forEach(addr => {
                        if (/:\d+$/.test(addr)) {
                            if (data[addr].name) {
                                addr += ' ' + data[addr].name;
                            }

                            channels.push(addr);
                        }
                    });
                }

                console.log('autoCompleteChannel()', channels.length);
                $nodeInputChannel.autocomplete('option', 'source', channels);
            }

            $nodeInputChannel.change(() => {
                const channel = $nodeInputChannel.val();
                if (data && data[channel]) {
                    $nodeInputChannelType.val(data[channel]);
                }
            });

            $('.SUBMIT').hide();
            $('.SUBMIT.' + $nodeInputChannelType.val()).show();
            $nodeInputChannelType.change(() => {
                $('.SUBMIT').hide();
                $('.SUBMIT.' + $nodeInputChannelType.val()).show();
            });
        },
    });
}());
