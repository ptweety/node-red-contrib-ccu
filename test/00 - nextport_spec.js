/* eslint-disable no-unused-vars, unicorn/filename-case */

const should = require('should');
const HmSim = require('hm-simulator/sim');

const nextport = require('../nodes/lib/nextport.js');

const {hmSimOptions} = require('./utils.js');

function findNextport(start) {
    return new Promise((resolve, reject) => {
        nextport(start, '127.0.0.1', port => {
            if (port) {
                resolve(port);
            } else {
                reject();
            }
        });
    });
}

describe('nextport', () => {
    let hmSim;

    afterEach(function (done) {
        this.timeout(3000);
        setTimeout(() => {
            done();
        }, 2000);
    });

    before(function (done) {
        this.timeout(12_000);
        hmSim = new HmSim(hmSimOptions());
        done();
    });

    after(function (done) {
        this.timeout(7000);
        hmSim.close();
        done();
    });

    describe('check with hmSim', () => {
        it('should return 2000 when port equals 2000', async () => {
            const port = await findNextport(2000);
            port.should.equal(2000);
        });

        it('should return 2002 when port equals 2001', async () => {
            const port = await findNextport(2001);
            port.should.equal(2002);
        });

        it('should return 65_535 when port equals 65_535', async () => {
            const port = await findNextport(65_535);
            port.should.equal(65_535);
        });

        it('should return RangeError when port equals 65_536', async () => {
            const testRangeError = async () => {
                await findNextport(65_536);
            };

            // 'RangeError [ERR_SOCKET_BAD_PORT]: options.port should be >= 0 and < 65536. Received 65536.'
            testRangeError().should.be.rejectedWith(RangeError);
        });
    });
});
