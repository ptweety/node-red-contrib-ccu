/* eslint-disable wrap-iife */

(function () {
    'use strict';

    RED.nodes.registerType('ccu-mqtt', {
        category: 'ccu',
        defaults: {
            name: {value: ''},
            ccuConfig: {value: 'localhost', type: 'ccu-connection', required: true},

            cache: {value: false},

            topicOutputEvent: {value: 'hm/status/${channelName}/${datapoint}'}, // eslint-disable-line no-template-curly-in-string
            topicInputSetValue: {value: 'hm/set/${channelNameOrAddress}/${datapoint}'}, // eslint-disable-line no-template-curly-in-string

            topicOutputSysvar: {value: 'hm/status/${name}'}, // eslint-disable-line no-template-curly-in-string
            topicInputSysvar: {value: 'hm/set/${name}'}, // eslint-disable-line no-template-curly-in-string

            topicInputPutParam: {value: 'hm/paramset/${channelNameOrAddress}/${paramset}/${param}'}, // eslint-disable-line no-template-curly-in-string
            topicInputPutParamset: {value: 'hm/paramset/${channelNameOrAddress}/${paramset}'}, // eslint-disable-line no-template-curly-in-string

            topicInputRpc: {value: 'hm/rpc/${iface}/${method}/${command}/${callid}'}, // eslint-disable-line no-template-curly-in-string
            topicOutputRpc: {value: 'hm/response/${callid}'}, // eslint-disable-line no-template-curly-in-string

            topicCounters: {value: 'hm/status/counter/${iface}/${rxtx}'}, // eslint-disable-line no-template-curly-in-string

            payloadOutput: {value: 'mqsh-extended'},
        },
        inputs: 1,
        outputs: 1,
        icon: 'ccu.png',
        color: '#c2d5e4',
        paletteLabel: 'mqtt',
        align: 'right',
        label() {
            return this.name || 'mqtt';
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
        oneditsave() {
            console.log(this);
        },
    });
}());
