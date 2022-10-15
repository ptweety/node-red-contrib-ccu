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
        {v: 'else', t: 'ccu-switch.rules.else', kind: 'O'},
    ];

    function clipValueLength(v) {
        if (v.length > 15) {
            return v.slice(0, 15) + '...';
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

    /**
     * Helper function to test an object has a property
     * @param {object} object Object to test
     * @param {string} propertyName Name of property to find
     * @returns true if object has property `propName`
     */
    function hasProperty(object, propertyName) {
        return Object.prototype.hasOwnProperty.call(object, propertyName);
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
            outputs: {value: 1},
        },
        inputs: 1,
        outputs: 1,
        outputLabels(index) {
            const rule = this.rules[index];
            let label = '';
            if (rule) {
                for (const operator of operators) {
                    if (operator.v === rule.t) {
                        label = this._(operator.t);
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
            // eslint-disable-next-line unicorn/no-this-assignment
            const node = this;
            const previousValueType = {value: 'prev', label: this._('inject.previous'), hasValue: false};

            const $nodeInputIface = $('#node-input-iface');
            // const $nodeInputMode = $('#node-input-mode');
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

            for (const value of sysvarPropertys) {
                $nodeInputSysvarProperty.append(
                    $('<option></option>').val(value).text(node._('node-red-contrib-ccu/ccu-connection:common.label.' + value)),
                );
            }

            for (const value of datapointPropertys) {
                $nodeInputDatapointProperty.append(
                    $('<option></option>').val(value).text(node._('node-red-contrib-ccu/ccu-connection:common.label.' + value)),
                );
            }

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
                    $.getJSON(url, data => {
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
                        $nodeInputSysvar.html('');
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

            // const andLabel = this._('and');
            const caseLabel = this._('ignorecase');

            function resizeRule(rule) {
                const newWidth = rule.width();
                const selectField = rule.find('select');
                const type = selectField.val() || '';
                const valueField = rule.find('.node-input-rule-value');
                const typeField = rule.find('.node-input-rule-type-value');
                const ruleNumberField = rule.find('.node-input-rule-num-value');
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
                switch (type) {
                    case 'btwn':
                    case 'index': {
                        btwnField1.typedInput('width', (newWidth - selectWidth - 70));
                        btwnField2.typedInput('width', (newWidth - selectWidth - 70));

                        break;
                    }

                    case 'head':
                    case 'tail': {
                        ruleNumberField.typedInput('width', (newWidth - selectWidth - 70));

                        break;
                    }

                    case 'jsonata_exp': {
                        expField.typedInput('width', (newWidth - selectWidth - 70));

                        break;
                    }

                    case 'istype': {
                        typeField.typedInput('width', (newWidth - selectWidth - 70));

                        break;
                    }

                    case 'true':
                    case 'false':
                    case 'null':
                    case 'nnull':
                    case 'empty':
                    case 'nempty':
                    case 'else': {
                        // valueField.hide();

                        break;
                    }

                    default: {
                        valueField.typedInput('width', (newWidth - selectWidth - 70));
                    }
                }
            }

            $('#node-input-rule-container').css('min-height', '250px').css('min-width', '450px').editableList({
                addItem(container, i, opt) {
                    if (!hasProperty(opt, 'r')) {
                        opt.r = {};
                    }

                    const rule = opt.r;
                    if (!hasProperty(rule, 't')) {
                        rule.t = 'eq';
                    }

                    if (!hasProperty(opt, 'i')) {
                        opt._i = Math.floor((0x9_99_99 - 0x1_00_00) * Math.random()).toString();
                    }

                    container.css({
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                    });

                    const row = $('<div/>').appendTo(container);
                    const row2 = $('<div/>', {style: 'padding-top: 5px; padding-left: 175px;'}).appendTo(container);
                    const row3 = $('<div/>', {style: 'padding-top: 5px; padding-left: 102px;'}).appendTo(container);
                    const selectField = $('<select/>', {style: 'width:120px; margin-left: 5px; text-align: center;'}).appendTo(row);
                    const group0 = $('<optgroup/>', {label: 'value rules'}).appendTo(selectField);
                    for (const d in operators) {
                        if (operators[d].kind === 'V') {
                            group0.append($('<option></option>').val(operators[d].v).text(node._(operators[d].t)));
                        }
                    }

                    const group1 = $('<optgroup/>', {label: 'sequence rules'}).appendTo(selectField);
                    for (const d in operators) {
                        if (operators[d].kind === 'S') {
                            group1.append($('<option></option>').val(operators[d].v).text(node._(operators[d].t)));
                        }
                    }

                    for (const d in operators) {
                        if (operators[d].kind === 'O') {
                            selectField.append($('<option></option>').val(operators[d].v).text(node._(operators[d].t)));
                        }
                    }

                    const valueField = $('<input/>', {class: 'node-input-rule-value', type: 'text', style: 'margin-left: 5px;'}).appendTo(row).typedInput({default: 'str', types: ['msg', 'flow', 'global', 'str', 'num', 'jsonata', 'env', previousValueType]});
                    const numberValueField = $('<input/>', {class: 'node-input-rule-num-value', type: 'text', style: 'margin-left: 5px;'}).appendTo(row).typedInput({default: 'num', types: ['flow', 'global', 'num', 'jsonata', 'env']});
                    const expValueField = $('<input/>', {class: 'node-input-rule-exp-value', type: 'text', style: 'margin-left: 5px;'}).appendTo(row).typedInput({default: 'jsonata', types: ['jsonata']});
                    const btwnValueField = $('<input/>', {class: 'node-input-rule-btwn-value', type: 'text', style: 'margin-left: 5px;'}).appendTo(row).typedInput({default: 'num', types: ['msg', 'flow', 'global', 'str', 'num', 'jsonata', 'env', previousValueType]});
                    // const btwnAndLabel = $('<span/>', {class: 'node-input-rule-btwn-label'}).text(' ' + andLabel + ' ').appendTo(row3);
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
                                {value: 'null', label: 'null', hasValue: false},
                            ]});
                    const finalspan = $('<span/>', {style: 'float: right;margin-top: 6px;'}).appendTo(row);
                    finalspan.append(' &#8594; <span class="node-input-rule-index">' + (i + 1) + '</span> ');
                    const caseSensitive = $('<input/>', {id: 'node-input-rule-case-' + i, class: 'node-input-rule-case', type: 'checkbox', style: 'width:auto;vertical-align:top'}).appendTo(row2);
                    $('<label/>', {for: 'node-input-rule-case-' + i, style: 'margin-left: 3px;'}).text(caseLabel).appendTo(row2);
                    selectField.change(() => {
                        const type = selectField.val();
                        switch (type) {
                            case 'btwn':
                            case 'index': {
                                valueField.typedInput('hide');
                                expValueField.typedInput('hide');
                                numberValueField.typedInput('hide');
                                typeValueField.typedInput('hide');
                                btwnValueField.typedInput('show');

                                break;
                            }

                            case 'head':
                            case 'tail': {
                                btwnValueField.typedInput('hide');
                                btwnValue2Field.typedInput('hide');
                                expValueField.typedInput('hide');
                                numberValueField.typedInput('show');
                                typeValueField.typedInput('hide');
                                valueField.typedInput('hide');

                                break;
                            }

                            case 'jsonata_exp': {
                                btwnValueField.typedInput('hide');
                                btwnValue2Field.typedInput('hide');
                                expValueField.typedInput('show');
                                numberValueField.typedInput('hide');
                                typeValueField.typedInput('hide');
                                valueField.typedInput('hide');

                                break;
                            }

                            default: {
                                btwnValueField.typedInput('hide');
                                expValueField.typedInput('hide');
                                numberValueField.typedInput('hide');
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
                    switch (rule.t) {
                        case 'btwn':
                        case 'index': {
                            btwnValueField.typedInput('value', rule.v);
                            btwnValueField.typedInput('type', rule.vt || 'num');
                            btwnValue2Field.typedInput('value', rule.v2);
                            btwnValue2Field.typedInput('type', rule.v2t || 'num');

                            break;
                        }

                        case 'head':
                        case 'tail': {
                            numberValueField.typedInput('value', rule.v);
                            numberValueField.typedInput('type', rule.vt || 'num');

                            break;
                        }

                        case 'istype': {
                            typeValueField.typedInput('value', rule.vt);
                            typeValueField.typedInput('type', rule.vt);

                            break;
                        }

                        case 'jsonata_exp': {
                            expValueField.typedInput('value', rule.v);
                            expValueField.typedInput('type', rule.vt || 'jsonata');

                            break;
                        }

                        default: if (typeof rule.v !== 'undefined') {
                            valueField.typedInput('value', rule.v);
                            valueField.typedInput('type', rule.vt || 'str');
                        }
                    }

                    if (rule.case) {
                        caseSensitive.prop('checked', true);
                    } else {
                        caseSensitive.prop('checked', false);
                    }

                    selectField.change();

                    const currentOutputs = JSON.parse(outputCount.val() || '{}');
                    currentOutputs[hasProperty(opt, 'i') ? opt.i : opt._i] = i;
                    outputCount.val(JSON.stringify(currentOutputs));
                },
                removeItem(opt) {
                    const currentOutputs = JSON.parse(outputCount.val() || '{}');
                    if (hasProperty(opt, 'i')) {
                        currentOutputs[opt.i] = -1;
                    } else {
                        delete currentOutputs[opt._i];
                    }

                    const rules = $('#node-input-rule-container').editableList('items');
                    rules.each(function (i) {
                        $(this).find('.node-input-rule-index').html(i + 1);
                        const data = $(this).data('data');
                        currentOutputs[hasProperty(data, 'i') ? data.i : data._i] = i;
                    });
                    outputCount.val(JSON.stringify(currentOutputs));
                },
                resizeItem: resizeRule,
                sortItems(items) {
                    const currentOutputs = JSON.parse(outputCount.val() || '{}');
                    // var rules = $('#node-input-rule-container').editableList('items');
                    items.each(function (i) {
                        $(this).find('.node-input-rule-index').html(i + 1);
                        const data = $(this).data('data');
                        currentOutputs[hasProperty(data, 'i') ? data.i : data._i] = i;
                    });
                    outputCount.val(JSON.stringify(currentOutputs));
                },
                sortable: true,
                removable: true,
            });

            for (let i = 0; i < this.rules.length; i++) {
                const rule = this.rules[i];
                $('#node-input-rule-container').editableList('addItem', {r: rule, i});
            }

            const $dialog = $('#dialog-select-datapoint').dialog({
                autoOpen: false,
                height: 400,
                width: 600,
                modal: true,
            });

            try {
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
                        children(done, _) {
                            const nodeId = $nodeInputCcuConfig.val();
                            const url = 'ccu?config=' + nodeId + '&type=ifaces';
                            $.getJSON(url, d => {
                                const interfaces = [];
                                for (const ifId of Object.keys(d)) {
                                    const iface = d[ifId];
                                    if (ifId !== 'ReGaHSS' && iface.enabled) {
                                        interfaces.push({
                                            id: ifId,
                                            label: ifId,
                                            icon: 'fa fa-empire fa-fw',
                                            children: (done, item) => loadTreeData('tree', done, item, ifId),
                                        });
                                    }
                                }

                                done(interfaces);
                            });
                        },
                    }, {
                        id: 'sysVars',
                        label: node._('node-red-contrib-ccu/ccu-connection:common.label.sysVars'),
                        icon: 'fa fa-cog fa-fw',
                        children: (done, item) => loadTreeData('sysvar', done, item),
                    }],
                });
            } catch {
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

                for (const property of datapointPropertys) {
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
                        const sysvars = [];
                        for (const id of Object.keys(d)) {
                            sysvars.push({
                                id,
                                label: id,
                                icon: 'fa fa-tags fa-fw',
                                children(done, _) {
                                    const result = [];
                                    for (const property of sysvarPropertys) {
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

                        done(sysvars);
                    });
                } else {
                    const url = 'ccu?config=' + nodeId + '&type=' + type;
                    $.getJSON(url, r => {
                        const tpes = [];
                        if (r && r[type]) {
                            for (let index = 0; index < r[type].length; index++) {
                                const lbl = r[type][index];
                                tpes.push({
                                    label: lbl,
                                    children(done, _) {
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

                        done(tpes);
                    });
                }
            }
        },
        oneditsave() {
            const rules = $('#node-input-rule-container').editableList('items');
            // let ruleset;
            // eslint-disable-next-line unicorn/no-this-assignment
            const node = this;
            node.rules = [];
            rules.each(function () {
                // const ruleData = $(this).data('data');
                const rule = $(this);
                const type = rule.find('select').val();
                const r = {t: type};
                if (!(type === 'true' || type === 'false' || type === 'null' || type === 'nnull' || type === 'empty' || type === 'nempty' || type === 'else')) {
                    switch (type) {
                        case 'btwn':
                        case 'index': {
                            r.v = rule.find('.node-input-rule-btwn-value').typedInput('value');
                            r.vt = rule.find('.node-input-rule-btwn-value').typedInput('type');
                            r.v2 = rule.find('.node-input-rule-btwn-value2').typedInput('value');
                            r.v2t = rule.find('.node-input-rule-btwn-value2').typedInput('type');

                            break;
                        }

                        case 'head':
                        case 'tail': {
                            r.v = rule.find('.node-input-rule-num-value').typedInput('value');
                            r.vt = rule.find('.node-input-rule-num-value').typedInput('type');

                            break;
                        }

                        case 'istype': {
                            r.v = rule.find('.node-input-rule-type-value').typedInput('type');
                            r.vt = rule.find('.node-input-rule-type-value').typedInput('type');

                            break;
                        }

                        case 'jsonata_exp': {
                            r.v = rule.find('.node-input-rule-exp-value').typedInput('value');
                            r.vt = rule.find('.node-input-rule-exp-value').typedInput('type');

                            break;
                        }

                        default: {
                            r.v = rule.find('.node-input-rule-value').typedInput('value');
                            r.vt = rule.find('.node-input-rule-value').typedInput('type');
                        }
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
            const rows = $('#dialog-form>div:not(.node-input-rule-container-row)');
            let {height} = size;
            for (const row of rows) {
                height -= $(row).outerHeight(true);
            }

            const editorRow = $('#dialog-form>div.node-input-rule-container-row');
            height -= (Number.parseInt(editorRow.css('marginTop'), 10) + Number.parseInt(editorRow.css('marginBottom'), 10));
            height += 16;
            $('#node-input-rule-container').editableList('height', height);
        },
    });
}());
