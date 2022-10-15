/* eslint-disable wrap-iife */

(function () {
    'use strict';

    const operators = [
        {v: 'eq', t: '==', kind: 'V'},
        {v: 'neq', t: '!=', kind: 'V'},
        {v: 'lt', t: '<', kind: 'V'},
        {v: 'lte', t: '<=', kind: 'V'},
        {v: 'gt', t: '>', kind: 'V'},
        {v: 'gte', t: '>=', kind: 'V'},
        {v: 'btwn', t: 'ccu-switch.rules.btwn', kind: 'V'},
        {v: 'cont', t: 'ccu-switch.rules.cont', kind: 'V'},
        {v: 'regex', t: 'ccu-switch.rules.regex', kind: 'V'},
        {v: 'true', t: 'ccu-switch.rules.true', kind: 'V'},
        {v: 'false', t: 'ccu-switch.rules.false', kind: 'V'},
        {v: 'null', t: 'ccu-switch.rules.null', kind: 'V'},
        {v: 'nnull', t: 'ccu-switch.rules.nnull', kind: 'V'},
        {v: 'istype', t: 'ccu-switch.rules.istype', kind: 'V'},
        {v: 'empty', t: 'ccu-switch.rules.empty', kind: 'V'},
        {v: 'nempty', t: 'ccu-switch.rules.nempty', kind: 'V'},
        {v: 'head', t: 'ccu-switch.rules.head', kind: 'S'},
        {v: 'index', t: 'ccu-switch.rules.index', kind: 'S'},
        {v: 'tail', t: 'ccu-switch.rules.tail', kind: 'S'},
        {v: 'jsonata_exp', t: 'ccu-switch.rules.exp', kind: 'O'},
        {v: 'else', t: 'ccu-switch.rules.else', kind: 'O'}
    ];

    function clipValueLength(v) {
        if (v.length > 15) {
            return v.substring(0, 15) + '...';
        }

        return v;
    }

    function prop2name(key) {
        const result = RED.utils.parseContextKey(key);
        return result.key;
    }

    function getValueLabel(t, v) {
        if (t === 'str') {
            return '"' + clipValueLength(v) + '"';
        }

        if (t === 'msg') {
            return t + '.' + clipValueLength(v);
        }

        if (t === 'flow' || t === 'global') {
            return t + '.' + clipValueLength(prop2name(v));
        }

        return clipValueLength(v);
    }

    RED.nodes.registerType('ccu-switch', {
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
            property: {value: 'payload', required: true, validate: RED.validators.typedInput('propertyType')},
            propertyType: {value: 'msg'},
            rules: {value: [{t: 'eq', v: '', vt: 'str'}]},
            checkall: {value: 'true', required: true},
            repair: {value: false},
            outputs: {value: 1}
        },
        inputs: 1,
        outputs: 1,
        outputLabels(index) {
            const rule = this.rules[index];
            let label = '';
            if (rule) {
                for (let i = 0; i < operators.length; i++) {
                    if (operators[i].v === rule.t) {
                        label = this._(operators[i].t);
                        break;
                    }
                }
                if ((rule.t === 'btwn') || (rule.t === 'index')) {
                    label += ' ' + getValueLabel(rule.vt, rule.v) + ' & ' + getValueLabel(rule.v2t, rule.v2);
                } else if (rule.t !== 'true' && rule.t !== 'false' && rule.t !== 'null' && rule.t !== 'nnull' && rule.t !== 'empty' && rule.t !== 'nempty' && rule.t !== 'else') {
                    label += ' ' + getValueLabel(rule.vt, rule.v);
                }
                return label;
            }
        },
        icon: 'ccu.png',
        paletteLabel() {
            return this._('switch');
        },
        label() {
            return this.name || this._('switch');
        },
        labelStyle() {
            return this.name ? 'node_label_italic' : '';
        },
        oneditprepare() {
            const node = this;
            const previousValueType = {value: 'prev', label: this._('inject.previous'), hasValue: false};

            const $nodeInputIface = $('#node-input-iface');
            const $nodeInputMode = $('#node-input-mode');
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

            $('.form-row.datapoint').hide();
            $('.form-row.sysvar').hide();

            const sysvarPropertys = ['value', 'valueEnum', 'ts', 'lc'];
            const datapointPropertys = ['value', 'ts', 'lc', 'working', 'direction'];

            sysvarPropertys.forEach(val => $nodeInputSysvarProperty.append(
                $('<option></option>').val(val).text(node._('node-red-contrib-ccu/ccu-connection:common.label.' + val))
            ));
            datapointPropertys.forEach(val => $nodeInputDatapointProperty.append(
                $('<option></option>').val(val).text(node._('node-red-contrib-ccu/ccu-connection:common.label.' + val))
            ));
            $nodeInputSysvarProperty.val(node.sysvarProperty || sysvarPropertys[0]);
            $nodeInputDatapointProperty.val(node.datapointProperty || datapointPropertys[0]);

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
                    $.getJSON(url, d => {
                        Object.keys(d).forEach(i => {
                            $nodeInputIface.append('<option' + (d[i].enabled ? '' : ' disabled') + (i === node.iface ? ' selected' : '') + '>' + i + '</option>');
                        });

                        $nodeInputIface.removeAttr('disabled');
                        $configLookupBtn.removeAttr('disabled');

                        $nodeInputIface.trigger('change');
                        if (typeof cb === 'function') {
                            cb();
                            ifacesPending = false;
                        }
                    });
                    $.getJSON('ccu?type=sysvar&config=' + nodeId, data => {
                        $nodeInputSysvar.html('');
                        if (data) {
                            Object.keys(data).forEach(name => {
                                $nodeInputSysvar.append('<option value="' + name + '"' + (name === node.sysvar ? ' selected' : '') + '>' + name + '</option>');
                            });
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

            $nodeInputCcuConfig.change(() => {
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
                minLength: 0
            });

            $nodeInputDatapoint.on('focus', () => {
                $nodeInputDatapoint.autocomplete('search');
            });

            $nodeInputChannel.on('blur', autocompleteDatapoint);

            function autocompleteChannel() {
                if (!data) {
                    return;
                }

                const arr = [];
                Object.keys(data).forEach(addr => {
                    if (addr.match(/:\d+$/)) {
                        if (data[addr].name) {
                            addr += ' ' + data[addr].name;
                        }
                        arr.push(addr);
                    }
                });
                arr.sort((a, b) => a.localeCompare(b));
                $nodeInputChannel.autocomplete('option', 'source', arr);

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
                    if (c.datapoints.indexOf($nodeInputDatapoint.val()) === -1) {
                        $nodeInputDatapoint.val('').autocomplete('search');
                    }
                }
            }

            $nodeInputIface.change(() => {
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

            // $("#node-input-property").typedInput({default:this.propertyType||'msg',types:['msg','flow','global','jsonata']});
            const outputCount = $('#node-input-outputs').val('{}');

            const andLabel = this._('and');
            const caseLabel = this._('ignorecase');

            function resizeRule(rule) {
                const newWidth = rule.width();
                const selectField = rule.find('select');
                const type = selectField.val() || '';
                const valueField = rule.find('.node-input-rule-value');
                const typeField = rule.find('.node-input-rule-type-value');
                const numField = rule.find('.node-input-rule-num-value');
                const expField = rule.find('.node-input-rule-exp-value');
                const btwnField1 = rule.find('.node-input-rule-btwn-value');
                const btwnField2 = rule.find('.node-input-rule-btwn-value2');

                let selectWidth;
                if (type.length < 4) {
                    selectWidth = 60;
                } else if (type === 'regex') {
                    selectWidth = 147;
                } else {
                    selectWidth = 120;
                }

                selectField.width(selectWidth);
                if ((type === 'btwn') || (type === 'index')) {
                    btwnField1.typedInput('width', (newWidth - selectWidth - 70));
                    btwnField2.typedInput('width', (newWidth - selectWidth - 70));
                } else if ((type === 'head') || (type === 'tail')) {
                    numField.typedInput('width', (newWidth - selectWidth - 70));
                } else if (type === 'jsonata_exp') {
                    expField.typedInput('width', (newWidth - selectWidth - 70));
                } else if (type === 'istype') {
                    typeField.typedInput('width', (newWidth - selectWidth - 70));
                } else if (type === 'true' || type === 'false' || type === 'null' || type === 'nnull' || type === 'empty' || type === 'nempty' || type === 'else') {
                    // valueField.hide();
                } else {
                    valueField.typedInput('width', (newWidth - selectWidth - 70));
                }
            }

            $('#node-input-rule-container').css('min-height', '250px').css('min-width', '450px').editableList({
                addItem(container, i, opt) {
                    if (!opt.hasOwnProperty('r')) {
                        opt.r = {};
                    }

                    const rule = opt.r;
                    if (!rule.hasOwnProperty('t')) {
                        rule.t = 'eq';
                    }

                    if (!opt.hasOwnProperty('i')) {
                        opt._i = Math.floor((0x99999 - 0x10000) * Math.random()).toString();
                    }

                    container.css({
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                    });

                    const row = $('<div/>').appendTo(container);
                    const row2 = $('<div/>', {style: 'padding-top: 5px; padding-left: 175px;'}).appendTo(container);
                    const row3 = $('<div/>', {style: 'padding-top: 5px; padding-left: 102px;'}).appendTo(container);
                    const selectField = $('<select/>', {style: 'width:120px; margin-left: 5px; text-align: center;'}).appendTo(row);
                    const group0 = $('<optgroup/>', {label: 'value rules'}).appendTo(selectField);
                    for (var d in operators) {
                        if (operators[d].kind === 'V') {
                            group0.append($('<option></option>').val(operators[d].v).text(node._(operators[d].t)));
                        }
                    }

                    const group1 = $('<optgroup/>', {label: 'sequence rules'}).appendTo(selectField);
                    for (var d in operators) {
                        if (operators[d].kind === 'S') {
                            group1.append($('<option></option>').val(operators[d].v).text(node._(operators[d].t)));
                        }
                    }

                    for (var d in operators) {
                        if (operators[d].kind === 'O') {
                            selectField.append($('<option></option>').val(operators[d].v).text(node._(operators[d].t)));
                        }
                    }

                    const valueField = $('<input/>', {class: 'node-input-rule-value', type: 'text', style: 'margin-left: 5px;'}).appendTo(row).typedInput({default: 'str', types: ['msg', 'flow', 'global', 'str', 'num', 'jsonata', 'env', previousValueType]});
                    const numValueField = $('<input/>', {class: 'node-input-rule-num-value', type: 'text', style: 'margin-left: 5px;'}).appendTo(row).typedInput({default: 'num', types: ['flow', 'global', 'num', 'jsonata', 'env']});
                    const expValueField = $('<input/>', {class: 'node-input-rule-exp-value', type: 'text', style: 'margin-left: 5px;'}).appendTo(row).typedInput({default: 'jsonata', types: ['jsonata']});
                    const btwnValueField = $('<input/>', {class: 'node-input-rule-btwn-value', type: 'text', style: 'margin-left: 5px;'}).appendTo(row).typedInput({default: 'num', types: ['msg', 'flow', 'global', 'str', 'num', 'jsonata', 'env', previousValueType]});
                    const btwnAndLabel = $('<span/>', {class: 'node-input-rule-btwn-label'}).text(' ' + andLabel + ' ').appendTo(row3);
                    const btwnValue2Field = $('<input/>', {class: 'node-input-rule-btwn-value2', type: 'text', style: 'margin-left:2px;'}).appendTo(row3).typedInput({default: 'num', types: ['msg', 'flow', 'global', 'str', 'num', 'jsonata', 'env', previousValueType]});
                    const typeValueField = $('<input/>', {class: 'node-input-rule-type-value', type: 'text', style: 'margin-left: 5px;'}).appendTo(row)
                        .typedInput({
                            default: 'string', types: [
                                {value: 'string', label: 'string', hasValue: false},
                                {value: 'number', label: 'number', hasValue: false},
                                {value: 'boolean', label: 'boolean', hasValue: false},
                                {value: 'array', label: 'array', hasValue: false},
                                {value: 'buffer', label: 'buffer', hasValue: false},
                                {value: 'object', label: 'object', hasValue: false},
                                {value: 'json', label: 'JSON string', hasValue: false},
                                {value: 'undefined', label: 'undefined', hasValue: false},
                                {value: 'null', label: 'null', hasValue: false}
                            ]});
                    const finalspan = $('<span/>', {style: 'float: right;margin-top: 6px;'}).appendTo(row);
                    finalspan.append(' &#8594; <span class="node-input-rule-index">' + (i + 1) + '</span> ');
                    const caseSensitive = $('<input/>', {id: 'node-input-rule-case-' + i, class: 'node-input-rule-case', type: 'checkbox', style: 'width:auto;vertical-align:top'}).appendTo(row2);
                    $('<label/>', {for: 'node-input-rule-case-' + i, style: 'margin-left: 3px;'}).text(caseLabel).appendTo(row2);
                    selectField.change(() => {
                        const type = selectField.val();
                        if ((type === 'btwn') || (type === 'index')) {
                            valueField.typedInput('hide');
                            expValueField.typedInput('hide');
                            numValueField.typedInput('hide');
                            typeValueField.typedInput('hide');
                            btwnValueField.typedInput('show');
                        } else if ((type === 'head') || (type === 'tail')) {
                            btwnValueField.typedInput('hide');
                            btwnValue2Field.typedInput('hide');
                            expValueField.typedInput('hide');
                            numValueField.typedInput('show');
                            typeValueField.typedInput('hide');
                            valueField.typedInput('hide');
                        } else if (type === 'jsonata_exp') {
                            btwnValueField.typedInput('hide');
                            btwnValue2Field.typedInput('hide');
                            expValueField.typedInput('show');
                            numValueField.typedInput('hide');
                            typeValueField.typedInput('hide');
                            valueField.typedInput('hide');
                        } else {
                            btwnValueField.typedInput('hide');
                            expValueField.typedInput('hide');
                            numValueField.typedInput('hide');
                            typeValueField.typedInput('hide');
                            valueField.typedInput('hide');
                            if (type === 'true' || type === 'false' || type === 'null' || type === 'nnull' || type === 'empty' || type === 'nempty' || type === 'else') {
                                valueField.typedInput('hide');
                                typeValueField.typedInput('hide');
                            } else
                            if (type === 'istype') {
                                valueField.typedInput('hide');
                                typeValueField.typedInput('show');
                            } else {
                                typeValueField.typedInput('hide');
                                valueField.typedInput('show');
                            }
                        }

                        if (type === 'regex') {
                            row2.show();
                            row3.hide();
                        } else if ((type === 'btwn') || (type === 'index')) {
                            row2.hide();
                            row3.show();
                            btwnValue2Field.typedInput('show');
                        } else {
                            row2.hide();
                            row3.hide();
                        }

                        resizeRule(container);
                    });
                    selectField.val(rule.t);
                    if ((rule.t == 'btwn') || (rule.t == 'index')) {
                        btwnValueField.typedInput('value', rule.v);
                        btwnValueField.typedInput('type', rule.vt || 'num');
                        btwnValue2Field.typedInput('value', rule.v2);
                        btwnValue2Field.typedInput('type', rule.v2t || 'num');
                    } else if ((rule.t === 'head') || (rule.t === 'tail')) {
                        numValueField.typedInput('value', rule.v);
                        numValueField.typedInput('type', rule.vt || 'num');
                    } else if (rule.t === 'istype') {
                        typeValueField.typedInput('value', rule.vt);
                        typeValueField.typedInput('type', rule.vt);
                    } else if (rule.t === 'jsonata_exp') {
                        expValueField.typedInput('value', rule.v);
                        expValueField.typedInput('type', rule.vt || 'jsonata');
                    } else if (typeof rule.v !== 'undefined') {
                        valueField.typedInput('value', rule.v);
                        valueField.typedInput('type', rule.vt || 'str');
                    }

                    if (rule.case) {
                        caseSensitive.prop('checked', true);
                    } else {
                        caseSensitive.prop('checked', false);
                    }

                    selectField.change();

                    const currentOutputs = JSON.parse(outputCount.val() || '{}');
                    currentOutputs[opt.hasOwnProperty('i') ? opt.i : opt._i] = i;
                    outputCount.val(JSON.stringify(currentOutputs));
                },
                removeItem(opt) {
                    const currentOutputs = JSON.parse(outputCount.val() || '{}');
                    if (opt.hasOwnProperty('i')) {
                        currentOutputs[opt.i] = -1;
                    } else {
                        delete currentOutputs[opt._i];
                    }

                    const rules = $('#node-input-rule-container').editableList('items');
                    rules.each(function (i) {
                        $(this).find('.node-input-rule-index').html(i + 1);
                        const data = $(this).data('data');
                        currentOutputs[data.hasOwnProperty('i') ? data.i : data._i] = i;
                    });
                    outputCount.val(JSON.stringify(currentOutputs));
                },
                resizeItem: resizeRule,
                sortItems(rules) {
                    const currentOutputs = JSON.parse(outputCount.val() || '{}');
                    var rules = $('#node-input-rule-container').editableList('items');
                    rules.each(function (i) {
                        $(this).find('.node-input-rule-index').html(i + 1);
                        const data = $(this).data('data');
                        currentOutputs[data.hasOwnProperty('i') ? data.i : data._i] = i;
                    });
                    outputCount.val(JSON.stringify(currentOutputs));
                },
                sortable: true,
                removable: true
            });

            for (let i = 0; i < this.rules.length; i++) {
                const rule = this.rules[i];
                $('#node-input-rule-container').editableList('addItem', {r: rule, i});
            }

            const $dialog = $('#dialog-select-datapoint').dialog({
                autoOpen: false,
                height: 400,
                width: 600,
                modal: true
            });

            try {
                $configLookupTree.css({width: '100%', height: '100%'}).treeList({
                    data: [{
                        id: 'rooms',
                        label: node._('node-red-contrib-ccu/ccu-connection:common.label.rooms'),
                        icon: 'fa fa-home fa-fw',
                        children: (done, item) => loadTreeData('rooms', done, item)
                    }, {
                        id: 'functions',
                        label: node._('node-red-contrib-ccu/ccu-connection:common.label.functions'),
                        icon: 'fa fa-cogs fa-fw',
                        children: (done, item) => loadTreeData('functions', done, item)
                    }, {
                        id: 'all',
                        label: node._('node-red-contrib-ccu/ccu-connection:common.label.allDevices'),
                        icon: 'fa fa-slack fa-fw',
                        children(done, item) {
                            const nodeId = $nodeInputCcuConfig.val();
                            const url = 'ccu?config=' + nodeId + '&type=ifaces';
                            $.getJSON(url, d => {
                                const arrIface = [];
                                Object.keys(d).forEach(ifId => {
                                    const iface = d[ifId];
                                    if (ifId !== 'ReGaHSS' && iface.enabled) {
                                        arrIface.push({
                                            id: ifId,
                                            label: ifId,
                                            icon: 'fa fa-empire fa-fw',
                                            children: (done, item) => loadTreeData('tree', done, item, ifId)
                                        });
                                    }
                                });
                                done(arrIface);
                            });
                        },
                    }, {
                        id: 'sysVars',
                        label: node._('node-red-contrib-ccu/ccu-connection:common.label.sysVars'),
                        icon: 'fa fa-cog fa-fw',
                        children: (done, item) => loadTreeData('sysvar', done, item)
                    }],
                });
            } catch (ex) {
                // maybe wrong node-red version
                $configLookupBtn.hide();
            }

            $configLookupTree.on('treelistselect', (event, item) => {
                console.log(item);
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
                        Object.keys(data).forEach(addr => {
                            channelArray.push(data[addr]);
                            if (data[addr].children) {
                                data[addr].children.forEach(dp => {
                                    if (!dp.children) {
                                        dp.children = getDPProp(dp);
                                    }
                                });
                            }
                        });
                    });
                }
            });

            function getDPProp(dp) {
                const retVal = [];

                datapointPropertys.forEach(val => {
                    retVal.push({
                        id: dp.id + '.' + val,
                        label: node._('node-red-contrib-ccu/ccu-connection:common.label.' + val),
                        icon: 'fa fa-tasks fa-fw',
                        iface: dp.iface,
                        channel: dp.channel,
                        datapoint: dp.label,
                        property: val
                    });
                });

                return retVal;
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
                        const arrDev = [];
                        Object.keys(devices).forEach(id => {
                            const dev = devices[id];
                            dev.children.forEach(ch => {
                                if (ch.children) {
                                    ch.children.sort((a, b) => a.label.localeCompare(b.label));
                                    ch.children.forEach(dp => {
                                        if (!dp.children) {
                                            dp.children = getDPProp(dp);
                                        }
                                    });
                                }
                            });
                            arrDev.push(dev);
                        });
                        arrDev.sort((a, b) => a.label.localeCompare(b.label));
                        done(arrDev);
                    });
                } else if (type === 'sysvar') {
                    $.getJSON(url, d => {
                        const arrSysVar = [];
                        Object.keys(d).forEach(id => {
                            arrSysVar.push({
                                id,
                                label: id,
                                icon: 'fa fa-tags fa-fw',
                                children(done, item) {
                                    const retVal = [];
                                    sysvarPropertys.forEach(val => {
                                        retVal.push({
                                            label: node._('node-red-contrib-ccu/ccu-connection:common.label.' + val),
                                            icon: 'fa fa-tag fa-fw',
                                            sysvar: id,
                                            property: val
                                        });
                                    });
                                    done(retVal);
                                },
                            });
                        });
                        done(arrSysVar);
                    });
                } else {
                    const url = 'ccu?config=' + nodeId + '&type=' + type;
                    $.getJSON(url, r => {
                        const arr = [];
                        if (r && r[type]) {
                            for (let index = 0; index < r[type].length; index++) {
                                const lbl = r[type][index];
                                arr.push({
                                    label: lbl,
                                    children(done, item) {
                                        const arrCh = [];
                                        if (channelArray) {
                                            channelArray.forEach(ch => {
                                                if (ch[type] && ch[type].includes(lbl)) {
                                                    arrCh.push(ch);
                                                }
                                            });
                                        }

                                        arrCh.sort((a, b) => a.label.localeCompare(b.label));
                                        done(arrCh);
                                    },
                                });
                            }
                        }

                        done(arr);
                    });
                }
            }
        },
        oneditsave() {
            const rules = $('#node-input-rule-container').editableList('items');
            let ruleset;
            const node = this;
            node.rules = [];
            rules.each(function (i) {
                const ruleData = $(this).data('data');
                const rule = $(this);
                const type = rule.find('select').val();
                const r = {t: type};
                if (!(type === 'true' || type === 'false' || type === 'null' || type === 'nnull' || type === 'empty' || type === 'nempty' || type === 'else')) {
                    if ((type === 'btwn') || (type === 'index')) {
                        r.v = rule.find('.node-input-rule-btwn-value').typedInput('value');
                        r.vt = rule.find('.node-input-rule-btwn-value').typedInput('type');
                        r.v2 = rule.find('.node-input-rule-btwn-value2').typedInput('value');
                        r.v2t = rule.find('.node-input-rule-btwn-value2').typedInput('type');
                    } else if ((type === 'head') || (type === 'tail')) {
                        r.v = rule.find('.node-input-rule-num-value').typedInput('value');
                        r.vt = rule.find('.node-input-rule-num-value').typedInput('type');
                    } else if (type === 'istype') {
                        r.v = rule.find('.node-input-rule-type-value').typedInput('type');
                        r.vt = rule.find('.node-input-rule-type-value').typedInput('type');
                    } else if (type === 'jsonata_exp') {
                        r.v = rule.find('.node-input-rule-exp-value').typedInput('value');
                        r.vt = rule.find('.node-input-rule-exp-value').typedInput('type');
                    } else {
                        r.v = rule.find('.node-input-rule-value').typedInput('value');
                        r.vt = rule.find('.node-input-rule-value').typedInput('type');
                    }

                    if (type === 'regex') {
                        r.case = rule.find('.node-input-rule-case').prop('checked');
                    }
                }

                node.rules.push(r);
            });
            // this.propertyType = $("#node-input-property").typedInput('type');
        },
        oneditresize(size) {
            var rows = $("#dialog-form>div:not(.node-input-rule-container-row)");
            var height = size.height;
            for (var i=0;i<rows.length;i++) {
                height -= $(rows[i]).outerHeight(true);
            }

            var editorRow = $("#dialog-form>div.node-input-rule-container-row");
            height -= (parseInt(editorRow.css("marginTop"))+parseInt(editorRow.css("marginBottom")));
            height += 16;
            $("#node-input-rule-container").editableList('height',height);
        },
    });
}());
