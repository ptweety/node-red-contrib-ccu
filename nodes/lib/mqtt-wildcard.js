/**
 * Based on https://github.com/hobbyquaker/mqtt-wildcard by Sebastian Raff (Hobbyquaker)
 */

'use strict';

const mqttWildcard = (topic, wildcard) => {
    if (topic === wildcard) {
        return [];
    }

    if (wildcard === '#') {
        return [topic];
    }

    const result = [];

    const t = String(topic).split('/');
    const w = String(wildcard).split('/');

    let index = 0;
    for (let lt = t.length; index < lt; index++) {
        if (w[index] === '+') {
            result.push(t[index]);
        } else if (w[index] === '#') {
            result.push(t.slice(index).join('/'));
            return result;
        } else if (w[index] !== t[index]) {
            return null;
        }
    }

    if (w[index] === '#') {
        index += 1;
    }

    return (index === w.length) ? result : null;
};

module.exports = mqttWildcard;
