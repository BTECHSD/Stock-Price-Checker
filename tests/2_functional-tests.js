// tests/server.test.js
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server'); // <- Pfad zu deinem server.js
const { assert } = chai;

chai.use(chaiHttp);

suite('Functional Tests', () => {

  test('GET one stock without like', (done) => {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: 'MSFT' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.isString(res.body.stockData.stock);
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);
        done();
      });
  });

  test('GET one stock with like', (done) => {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: 'MSFT', like: true })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.isAtLeast(res.body.stockData.likes, 1);
        done();
      });
  });

  test('GET two stocks without like', (done) => {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'] })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.isArray(res.body.stockData);
        assert.lengthOf(res.body.stockData, 2);
        assert.property(res.body.stockData[0], 'rel_likes');
        assert.property(res.body.stockData[1], 'rel_likes');
        done();
      });
  });

});