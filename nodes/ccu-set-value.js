const path = require('path');

const statusHelper = require(path.join(__dirname, '/lib/status.js'));

module.exports = function (RED) {
    class CcuSetValue {
        constructor(config) {
            RED.nodes.createNode(this, config);

            this.ccu = RED.nodes.getNode(config.ccuConfig);

            if (!this.ccu) {
                return;
            }

            this.ccu.register(this);

            this.config = {
                iface: config.iface,
                rooms: config.rooms,
                functions: config.functions,
                device: config.device,
                deviceType: config.deviceType,
                deviceName: config.deviceName,
                channel: config.channel,
                channelType: config.channelType,
                channelIndex: config.channelIndex,
                channelName: config.channelName,
                datapoint: config.datapoint,
                roomsRx: config.roomsRx,
                functionsRx: config.functionsRx,
                deviceRx: config.deviceRx,
                deviceTypeRx: config.deviceTypeRx,
                deviceNameRx: config.deviceNameRx,
                channelRx: config.channelRx,
                channelTypeRx: config.channelTypeRx,
                channelIndexRx: config.channelIndexRx,
                channelNameRx: config.channelNameRx,
                datapointRx: config.datapointRx,
                force: config.force,
            };

            this.blacklist = new Set();
            this.whitelist = new Set();

            this.on('input', message => {
                this.setValues(message);
            });

            this.on('close', this._destructor);
        }

        _destructor(done) {
            if (this.idSubscription) {
                this.debug('ccu-set-value close');
                this.ccu.unsubscribe(this.idSubscription);
            }

            done();
        }

        setStatus(data) {
            statusHelper(this, data);
        }

        // eslint-disable-next-line complexity
        setValues(message) {
            const {config} = this;
            let dynamicConfig = false;
            for (const key of Object.keys(config)) {
                if (!config[key] && key in message) {
                    dynamicConfig = true;
                    config[key] = message[key];
                }
            }

            if (dynamicConfig) {
                this.whitelist.clear();
                this.blacklist.clear();
            }

            let count = 0;
            for (const iface of Object.keys(this.ccu.metadata.devices)) {
                if (config.iface && iface !== config.iface) {
                    continue;
                }

                for (const address of Object.keys(this.ccu.metadata.devices[iface])) {
                    if (this.blacklist.has(address)) {
                        continue;
                    }

                    const channel = this.ccu.metadata.devices[iface][address];

                    if (!channel.PARENT) {
                        this.blacklist.add(address);
                        continue;
                    }

                    /* eslint-disable max-depth */
                    if (!this.whitelist.has(address)) {
                        const device = this.ccu.metadata.devices[iface][channel.PARENT];
                        if (config.device) {
                            if (config.deviceRx === 'str' && config.device !== channel.PARENT) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.deviceRx === 're' && !(new RegExp(config.device).test(channel.PARENT))) {
                                this.blacklist.add(address);
                                continue;
                            }
                        }

                        if (config.deviceType) {
                            if (config.deviceTypeRx === 'str' && config.deviceType !== device.TYPE) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.deviceTypeRx === 're' && !(new RegExp(config.deviceType).test(device.TYPE))) {
                                this.blacklist.add(address);
                                continue;
                            }
                        }

                        if (config.deviceName) {
                            if (!this.ccu.channelNames[address]) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.deviceNameRx === 'str' && this.ccu.channelNames[channel.PARENT] !== config.deviceName) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.deviceNameRx === 're' && !(new RegExp(config.deviceName).test(this.ccu.channelNames[channel.PARENT]))) {
                                this.blacklist.add(address);
                                continue;
                            }
                        }

                        if (config.channel) {
                            if (config.channelRx === 'str' && config.channel !== address) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.channelRx === 're' && !(new RegExp(config.channel).test(address))) {
                                this.blacklist.add(address);
                                continue;
                            }
                        }

                        if (config.channelType) {
                            if (config.channelTypeRx === 'str' && config.channelType !== channel.TYPE) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.channelTypeRx === 're' && !(new RegExp(config.channelType).test(channel.TYPE))) {
                                this.blacklist.add(address);
                                continue;
                            }
                        }

                        if (config.channelIndex) {
                            if (config.channelIndexRx === 'str' && !address.endsWith(':' + config.channelIndex)) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.channelIndexRx === 're' && !(new RegExp(String(config.channelIndex)).test(address.split(':')[1]))) {
                                this.blacklist.add(address);
                                continue;
                            }
                        }

                        if (config.channelName) {
                            if (!this.ccu.channelNames[address]) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.channelNameRx === 'str' && this.ccu.channelNames[address] !== config.channelName) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.channelNameRx === 're' && !(new RegExp(config.channelName).test(this.ccu.channelNames[address]))) {
                                this.blacklist.add(address);
                                continue;
                            }
                        }

                        if (config.rooms) {
                            if (!this.ccu.channelRooms[address]) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.roomsRx === 'str' && !this.ccu.channelRooms[address].includes(config.rooms)) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.roomsRx === 're') {
                                let match = false;
                                for (const room of this.ccu.channelRooms[address]) {
                                    if (new RegExp(config.rooms).test(room)) {
                                        match = true;
                                    }
                                }

                                if (!match) {
                                    this.blacklist.add(address);
                                    continue;
                                }
                            }
                        }

                        if (config.functions) {
                            if (!this.ccu.channelFunctions[address]) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.functionsRx === 'str' && !this.ccu.channelFunctions[address].includes(config.functions)) {
                                this.blacklist.add(address);
                                continue;
                            }

                            if (config.functionsRx === 're') {
                                let match = false;
                                for (const func of this.ccu.channelFunctions[address]) {
                                    if (new RegExp(config.functions).test(func)) {
                                        match = true;
                                    }
                                }

                                if (!match) {
                                    this.blacklist.add(address);
                                    continue;
                                }
                            }
                        }

                        this.whitelist.add(address);
                    }

                    const psKey = this.ccu.paramsetName(iface, channel, 'VALUES');
                    if (this.ccu.paramsetDescriptions[psKey]) {
                        const rx = new RegExp(config.datapoint);
                        for (const dp of Object.keys(this.ccu.paramsetDescriptions[psKey])) {
                            if (config.datapointRx === 'str' && dp !== config.datapoint) {
                                continue;
                            }

                            if (config.datapointRx === 're' && !rx.test(dp)) {
                                continue;
                            }

                            const datapointName = iface + '.' + address + '.' + dp;
                            const currentValue = this.ccu.values[datapointName] && this.ccu.values[datapointName].value;
                            count += 1;
                            if (dp.startsWith('PRESS_') || typeof currentValue === 'undefined' || currentValue !== message.payload) {
                                this.ccu.setValueQueued(iface, address, dp, message.payload, false, config.force).catch(() => {});
                            }
                        }
                    }
                    /* eslint-enable max-depth */
                }
            }

            this.status({fill: 'green', shape: 'ring', text: String(count) + ' datapoints'});
        }
    }

    RED.nodes.registerType('ccu-set-value', CcuSetValue);
};
