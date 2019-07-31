var assert = require("assert");
var webdriver = require("selenium-webdriver");
var fs = require("fs");
const ffdriver = require('geckodriver');

let PATH_TO_FF;
// Used by Travis
if (process.env.FIREFOX_BINARY) {
  PATH_TO_FF = process.env.FIREFOX_BINARY;
}
else {
  throw "You can set FIREFOX_BINARY to the path to your Firefox install if this path isn't for your machine work";
}

let leave_open = process.env.LEAVE_OPEN === "true" || false;

let args = [];

const ffCapabilities = webdriver.Capabilities.firefox();
ffCapabilities.set('moz:firefoxOptions', {
  binary: PATH_TO_FF,
  'args': args
});

const INPUT_ID = "program";
const COMPILE_RUN_BUTTON = "compileRun";

function setup() {
  let driver = new webdriver.Builder()
    .forBrowser("firefox")
    .setProxy(null)
    .withCapabilities(ffCapabilities).build();

  let url = process.env.BASE_URL;

  return {
    driver: driver,
    baseURL: url
  };
}

function beginSetInputText(driver, unquotedInput) {
  return driver.executeScript(
    "document.getElementById(\"" + INPUT_ID + "\").value = \"" + unquotedInput + "\";"
  );
}

async function compileRun(driver) {
  let runButton = await driver.findElement({ id: COMPILE_RUN_BUTTON });
  await runButton.click();
}

async function pyretCompilerLoaded(driver) {
  let cl = await driver.findElement({ id: "consoleList" });

  let result = await driver.wait(async () => {
    let innerHTML = await cl.getAttribute("innerHTML");
    let index = innerHTML.search(/Worker setup done/);
    return index !== -1;
  }, 5000);

  return result;
}

function prepareExpectedOutput(rawExpectedOutput) {
  // TODO(alex): Remove leading '###' and trim
  return rawExpectedOutput;
}

function teardown(browser, done) {
  if(!leave_open) {
    return browser.quit().then(done);
  }

  return done;
}

module.exports = {
  pyretCompilerLoaded: pyretCompilerLoaded,
  setup: setup,
  teardown: teardown,
  beginSetInputText: beginSetInputText,
  compileRun: compileRun,
};
