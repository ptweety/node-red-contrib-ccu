/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {
    'use strict';

    const {Buffer} = require('buffer');

    const operators = {
        eq(a, b) {
            return a == b; // eslint-disable-line eqeqeq
        },
        neq(a, b) {
            return a != b; // eslint-disable-line eqeqeq
        },
        lt(a, b) {
            return a < b;
        },
        lte(a, b) {
            return a <= b;
        },
        gt(a, b) {
            return a > b;
        },
        gte(a, b) {
            return a >= b;
        },
        btwn(a, b, c) {
            return a >= b && a <= c;
        },
        cont(a, b) {
            return (String(a)).includes(b);
        },
        regex(a, b, c, d) {
            return (String(a)).match(new RegExp(b, d ? 'i' : ''));
        },
        true(a) {
            return a === true;
        },
        false(a) {
            return a === false;
        },
        null(a) {
            return (typeof a === 'undefined' || a === null);
        },
        nnull(a) {
            return (typeof a !== 'undefined' && a !== null);
        },
        empty(a) {
            if (typeof a === 'string' || Array.isArray(a) || Buffer.isBuffer(a)) {
                return a.length === 0;
            }

            if (typeof a === 'object' && a !== null) {
                return Object.keys(a).length === 0;
            }

            return false;
        },
        nempty(a) {
            if (typeof a === 'string' || Array.isArray(a) || Buffer.isBuffer(a)) {
                return a.length > 0;
            }

            if (typeof a === 'object' && a !== null) {
                return Object.keys(a).length > 0;
            }

            return false;
        },
        istype(a, b) {
            if (b === 'array') {
                return Array.isArray(a);
            }

            if (b === 'buffer') {
                return Buffer.isBuffer(a);
            }

            if (b === 'json') {
                try {
                    JSON.parse(a);
                    return true;
                } /* or maybe ??? a !== null; } */ catch {
                    return false;
                }
            } else if (b === 'null') {
                return a === null;
            } else {
                return typeof a === b && !Array.isArray(a) && !Buffer.isBuffer(a) && a !== null;
            }
        },
        head(a, b, c, d, parts) {
            const count = Number(b);
            return (parts.index < count);
        },
        tail(a, b, c, d, parts) {
            const count = Number(b);
            return (parts.count - count <= parts.index);
        },
        index(a, b, c, d, parts) {
            const min = Number(b);
            const max = Number(c);
            const {index} = parts;
            return ((min <= index) && (index <= max));
        },
        jsonata_exp(a, b) {
            return (b === true);
        },
        else(a) {
            return a === true;
        },
    };

    let _maxKeptCount;

    /**
     * Helper function to test an object has a property
     * @param {object} object Object to test
     * @param {string} propertyName Name of property to find
     * @returns true if object has property `propName`
     */
    function hasProperty(object, propertyName) {
        return Object.prototype.hasOwnProperty.call(object, propertyName);
    }

    function getMaxKeptCount() {
        if (_maxKeptCount === undefined) {
            const name = 'nodeMessageBufferMaxLength';
            _maxKeptCount = hasProperty(RED.settings, name) ? RED.settings[name] : 0;
        }

        return _maxKeptCount;
    }

    function getProperty(node, _) {
        return new Promise((resolve, _) => {
            if (node.iface === 'ReGaHSS') {
                resolve(node.ccu.sysvar[node.sysvar] && node.ccu.sysvar[node.sysvar][node.sysvarProperty]);
            } else {
                const address = node.iface + '.' + String(node.channel).split(' ')[0] + '.' + node.datapoint;
                resolve(node.ccu.values[address] && node.ccu.values[address][node.datapointProperty]);
            }
        });
    }

    function getV1(node, message, rule, hasParts) {
        return new Promise((resolve, reject) => {
            switch (rule.vt) {
                case 'prev': {
                    resolve(node.previousValue);

                    break;
                }

                case 'jsonata': {
                    const exp = rule.v;
                    if (rule.t === 'jsonata_exp' && hasParts) {
                        exp.assign('I', message.parts.index);
                        exp.assign('N', message.parts.count);
                    }

                    RED.util.evaluateJSONataExpression(exp, message, (error, value) => {
                        if (error) {
                            reject(RED._('switch.errors.invalid-expr', {error: error.message}));
                        } else {
                            resolve(value);
                        }
                    });

                    break;
                }

                case 'json': {
                    resolve('json');

                    break;
                }

                case 'null': {
                    resolve('null');

                    break;
                }

                default: {
                    RED.util.evaluateNodeProperty(rule.v, rule.vt, node, message, (error, value) => {
                        if (error) {
                            resolve(undefined);
                        } else {
                            resolve(value);
                        }
                    });
                }
            }
        });
    }

    function getV2(node, message, rule) {
        return new Promise((resolve, reject) => {
            const {v2} = rule;
            if (rule.v2t === 'prev') {
                resolve(node.previousValue);
            } else if (rule.v2t === 'jsonata') {
                RED.util.evaluateJSONataExpression(rule.v2, message, (error, value) => {
                    if (error) {
                        reject(RED._('switch.errors.invalid-expr', {error: error.message}));
                    } else {
                        resolve(value);
                    }
                });
            } else if (typeof v2 !== 'undefined') { // eslint-disable-line no-negated-condition
                RED.util.evaluateNodeProperty(rule.v2, rule.v2t, node, message, (error, value) => {
                    if (error) {
                        resolve(undefined);
                    } else {
                        resolve(value);
                    }
                });
            } else {
                resolve(v2);
            }
        });
    }

    function applyRule(node, message, property, state) {
        return new Promise((resolve, _) => {
            const rule = node.rules[state.currentRule];
            let v1;
            let v2;

            getV1(node, message, rule, state.hasParts).then(value => {
                v1 = value;
            }).then(() => getV2(node, message, rule)).then(value => {
                v2 = value;
            }).then(() => {
                if (rule.t == 'else') { // eslint-disable-line eqeqeq
                    property = state.elseflag;
                    state.elseflag = true;
                }

                if (operators[rule.t](property, v1, v2, rule.case, message.parts)) {
                    state.onward.push(message);
                    state.elseflag = false;
                    if (node.checkall == 'false') { // eslint-disable-line eqeqeq
                        return resolve(false);
                    }
                } else {
                    state.onward.push(null);
                }

                resolve(state.currentRule < node.rules.length - 1);
            });
        });
    }

    function applyRules(node, message, property, state) {
        if (!state) {
            state = {
                currentRule: 0,
                elseflag: true,
                onward: [],
                hasParts: hasProperty(message, 'parts')
                && hasProperty(message.parts, 'id')
                && hasProperty(message.parts, 'index'),
            };
        }

        return applyRule(node, message, property, state).then(hasMore => {
            if (hasMore) {
                state.currentRule++;
                return applyRules(node, message, property, state);
            }

            node.previousValue = property;
            return state.onward;
        });
    }

    function CcuSwitchNode(n) {
        RED.nodes.createNode(this, n);
        this.ccu = RED.nodes.getNode(n.ccuConfig);
        this.iface = n.iface;
        this.channel = n.channel;
        this.datapoint = n.datapoint;
        this.datapointProperty = n.datapointProperty;
        this.sysvar = n.sysvar;
        this.sysvarProperty = n.sysvarProperty;
        this.rules = n.rules || [];
        this.property = n.property;
        this.propertyType = n.propertyType || 'msg';

        if (this.propertyType === 'jsonata') {
            try {
                this.property = RED.util.prepareJSONataExpression(this.property, this);
            } catch (error) {
                this.error(RED._('switch.errors.invalid-expr', {error: error.message}));
                return;
            }
        }

        this.checkall = n.checkall || 'true';
        this.previousValue = null;
        // eslint-disable-next-line unicorn/no-this-assignment
        const node = this;
        let valid = true;
        const {repair} = n;
        let needsCount = repair;
        for (let i = 0; i < this.rules.length; i += 1) {
            const rule = this.rules[i];
            needsCount = needsCount || ((rule.t === 'tail') || (rule.t === 'jsonata_exp'));
            if (!rule.vt) {
                rule.vt = (Number.isNaN(rule.v)) ? 'str' : 'num';
            }

            if (rule.vt === 'num') {
                if (!(Number.isNaN(rule.v))) {
                    rule.v = Number(rule.v);
                }
            } else if (rule.vt === 'jsonata') {
                try {
                    rule.v = RED.util.prepareJSONataExpression(rule.v, node);
                } catch (error) {
                    this.error(RED._('switch.errors.invalid-expr', {error: error.message}));
                    valid = false;
                }
            }

            if (typeof rule.v2 !== 'undefined') {
                if (!rule.v2t) {
                    rule.v2t = (Number.isNaN(rule.v2)) ? 'str' : 'num';
                }

                if (rule.v2t === 'num') {
                    rule.v2 = Number(rule.v2);
                } else if (rule.v2t === 'jsonata') {
                    try {
                        rule.v2 = RED.util.prepareJSONataExpression(rule.v2, node);
                    } catch (error) {
                        this.error(RED._('switch.errors.invalid-expr', {error: error.message}));
                        valid = false;
                    }
                }
            }
        }

        if (!valid) {
            return;
        }

        let pendingCount = 0;
        let pendingId = 0;
        let pendingIn = {};
        let pendingOut = {};
        let received = {};

        function addMessageToGroup(id, message, parts) {
            if (!(id in pendingIn)) {
                pendingIn[id] = {
                    count: undefined,
                    msgs: [],
                    seq_no: pendingId++,
                };
            }

            const group = pendingIn[id];
            group.msgs.push(message);
            pendingCount++;
            const maxMessages = getMaxKeptCount();
            if ((maxMessages > 0) && (pendingCount > maxMessages)) {
                clearPending();
                node.error(RED._('switch.errors.too-many'), message);
            }

            if (hasProperty(parts, 'count')) {
                group.count = parts.count;
            }

            return group;
        }

        function addMessageToPending(message) {
            const {parts} = message;
            // We've already checked the msg.parts has the require bits
            const group = addMessageToGroup(parts.id, message, parts);
            const {msgs} = group;
            const {count} = group;
            if (count === msgs.length) {
                // We have a complete group - send the individual parts
                return msgs.reduce((promise, message) => promise.then(() => {
                    message.parts.count = count;
                    return processMessage(message, false);
                })
                , Promise.resolve()).then(() => {
                    pendingCount -= group.msgs.length;
                    delete pendingIn[parts.id];
                });
            }

            return Promise.resolve();
        }

        function sendGroup(onwards, portCount) {
            const counts = [...portCount].fill(0);
            for (const onward of onwards) {
                for (let j = 0; j < portCount; j++) {
                    counts[j] += (onward[j] === null) ? 0 : 1;
                }
            }

            const ids = [...portCount];
            for (let j = 0; j < portCount; j++) {
                ids[j] = RED.util.generateId();
            }

            const ports = [...portCount];
            const indexes = [...portCount].fill(0);
            for (const onward of onwards) {
                for (let j = 0; j < portCount; j++) {
                    const message = onward[j];
                    if (message) {
                        const newMessage = RED.util.cloneMessage(message);
                        const {parts} = newMessage;
                        parts.id = ids[j];
                        parts.index = indexes[j];
                        parts.count = counts[j];
                        ports[j] = newMessage;
                        indexes[j]++;
                    } else {
                        ports[j] = null;
                    }
                }

                node.send(ports);
            }
        }

        function sendGroupMessages(onward, message) {
            const {parts} = message;
            const gid = parts.id;
            received[gid] = ((gid in received) ? received[gid] : 0) + 1;
            const sendOk = (received[gid] === parts.count);

            if (!(gid in pendingOut)) {
                pendingOut[gid] = {
                    onwards: [],
                };
            }

            const group = pendingOut[gid];
            const {onwards} = group;
            onwards.push(onward);
            pendingCount++;
            if (sendOk) {
                sendGroup(onwards, onward.length, message);
                pendingCount -= onward.length;
                delete pendingOut[gid];
                delete received[gid];
            }

            const maxMessages = getMaxKeptCount();
            if ((maxMessages > 0) && (pendingCount > maxMessages)) {
                clearPending();
                node.error(RED._('switch.errors.too-many'), message);
            }
        }

        function processMessage(message, checkParts) {
            const hasParts = hasProperty(message, 'parts')
                && hasProperty(message.parts, 'id')
                && hasProperty(message.parts, 'index');

            if (needsCount && checkParts && hasParts) {
                return addMessageToPending(message);
            }

            return getProperty(node, message)
                .then(property => {
                    node.statusVal = String(property);
                    node.status({text: node.statusVal});
                    return applyRules(node, message, property);
                })
                .then(onward => {
                    // eslint-disable-next-line unicorn/prevent-abbreviations, unicorn/prefer-native-coercion-functions
                    node.status({text: node.statusVal + ' (' + onward.map((e, i) => e ? (i + 1) : null).filter(e => e).join(',') + ')'});
                    if (!repair || !hasParts) {
                        node.send(onward);
                    } else {
                        sendGroupMessages(onward, message);
                    }
                }).catch(error => {
                    node.warn(error);
                });
        }

        function clearPending() {
            pendingCount = 0;
            pendingId = 0;
            pendingIn = {};
            pendingOut = {};
            received = {};
        }

        const pendingMessages = [];
        let activeMessagePromise = null;
        const processMessageQueue = function (message) {
            if (message) {
                // A new message has arrived - add it to the message queue
                pendingMessages.push(message);
                if (activeMessagePromise !== null) {
                    // The node is currently processing a message, so do nothing
                    // more with this message
                    return;
                }
            }

            if (pendingMessages.length === 0) {
                // There are no more messages to process, clear the active flag
                // and return
                activeMessagePromise = null;
                return;
            }

            // There are more messages to process. Get the next message and
            // start processing it. Recurse back in to check for any more
            const nextMessage = pendingMessages.shift();
            activeMessagePromise = processMessage(nextMessage, true)
                .then(processMessageQueue)
                .catch(error => {
                    node.error(error, nextMessage);
                    return processMessageQueue();
                });
        };

        this.on('input', message => {
            processMessageQueue(message);
        });

        this.on('close', () => {
            clearPending();
        });
    }

    RED.nodes.registerType('ccu-switch', CcuSwitchNode);
};
