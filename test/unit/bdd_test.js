const assert = require('assert');
const { Parser } = require('gherkin');
const {
  Given,
  When,
  Then,
  matchStep,
  clearSteps,
} = require('../../lib/interfaces/context');
const run = require('../../lib/interfaces/gherkin');
const recorder = require('../../lib/recorder');
const container = require('../../lib/container');
const actor = require('../../lib/actor');

const text = `
  Feature: checkout process
  In order to buy products
  As a customer
  I want to be able to buy several products

  Scenario:
    Given I have product with 600 price
    And I have product with 1000 price
    When I go to checkout process
`;

describe('BDD', () => {
  beforeEach(() => {
    clearSteps();
    recorder.start();
    container.create({});
  });

  afterEach(() => {
    container.clear();
    recorder.stop();
  });

  it('should parse gherkin input', () => {
    const parser = new Parser();
    parser.stopAtFirstError = false;
    const ast = parser.parse(text);
    // console.log('Feature', ast.feature);
    // console.log('Scenario', ast.feature.children);
    // console.log('Steps', ast.feature.children[0].steps[0]);
    assert.ok(ast.feature);
    assert.ok(ast.feature.children);
    assert.ok(ast.feature.children[0].steps);
  });

  it('should load step definitions', () => {
    Given('I am a bird', () => 1);
    When('I fly over ocean', () => 2);
    Then(/I see (.*?)/, () => 3);
    assert.equal(1, matchStep('I am a bird')());
    assert.equal(3, matchStep('I see ocean')());
    assert.equal(3, matchStep('I see world')());
  });

  it('should load step definitions', () => {
    let sum = 0;
    Given(/I have product with (\d+) price/, param => sum += parseInt(param, 10));
    When('I go to checkout process', () => sum += 10);
    const suite = run(text);
    assert.equal('checkout process', suite.title);
    suite.tests[0].fn(() => {});
    assert.ok(suite.tests[0].steps);
    assert.equal(1610, sum);
  });

  it('should execute scenarios step-by-step ', () => {
    printed = [];
    container.append({
      helpers: {
        simple: {
          do(...args) {
            return Promise.resolve().then(() => printed.push(args.join(' ')));
          },
        },
      },
    });
    I = actor();
    let sum = 0;
    Given(/I have product with (\d+) price/, (price) => {
      I.do('add', sum += parseInt(price, 10));
    });
    When('I go to checkout process', () => {
      I.do('add finish checkout');
    });
    const suite = run(text);
    suite.tests[0].fn(() => {});
    return recorder.promise().then(() => {
      printed.should.include.members([
        'add 600',
        'add 1600',
        'add finish checkout',
      ]);
      const lines = recorder.scheduled().split('\n');
      lines.should.include.members([
        'do: "add", 600',
        'step passed',
        'return result',
        'do: "add", 1600',
        'step passed',
        'return result',
        'do: "add finish checkout"',
        'step passed',
        'return result',
        'fire test.passed',
        'finish test',
      ]);
    });
  });

  it('should match step with params', () => {
    Given('I am a {word}', param => param);
    const fn = matchStep('I am a bird');
    assert.equal('bird', fn.params[0]);
  });

  it('should use shortened form for step definitions', () => {
    let fn;
    Given('I am a {word}', params => params[0]);
    When('I have {int} wings and {int} eyes', params => params[0] + params[1]);
    Given('I have ${int} in my pocket', params => params[0]); // eslint-disable no-template-curly-in-string
    Given('I have also ${float} in my pocket', params => params[0]); // eslint-disable no-template-curly-in-string
    fn = matchStep('I am a bird');
    assert.equal('bird', fn(fn.params));
    fn = matchStep('I have 2 wings and 2 eyes');
    assert.equal(4, fn(fn.params));
    fn = matchStep('I have $500 in my pocket');
    assert.equal(500, fn(fn.params));
    fn = matchStep('I have also $500.30 in my pocket');
    assert.equal(500.30, fn(fn.params));
  });

  it('should execute scenario outlines', () => {

  });
});
