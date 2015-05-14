/**
 * Created by kristian on 10.11.14.
 * ****************************************************************************
 * Since Firefox have no manifest, I made a chrome manifest parser who use the
 * PageMod to achieve the same result.
 * *********************************************************************
 */
let {Cc, Ci} = require('chrome');
const {components} = require('chrome');

// we are in back ground script
var instance = Cc["@mozilla.org/moz/jssubscript-loader;1"];
var loader = instance.getService(Ci.mozIJSSubScriptLoader);
var firefoxData = require("sdk/self").data;

function loadScript(url) {
    loader.loadSubScript(url);
}

loadScript(firefoxData.url("chromeAPIFirefox/chromeAPIForFirefox.js"));

chrome.firefoxPageMod = require("sdk/page-mod");
chrome.firefoxTabs = require("sdk/tabs");
chrome.firefoxButtons = require('sdk/ui/button/action');
//const {XMLHttpRequest} = require('sdk/net/xhr');
//const XMLHttpRequest  = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"];
const {XMLHttpRequest} = require('sdk/net/xhr');
chrome.firefoxData = firefoxData;
chrome.firefoxTabsId = [];
chrome.firefoxTabsOldId = [];

loadScript(firefoxData.url("js/background.js"));
var manifest = JSON.parse(chrome.firefoxData.load("manifest.json"));

function addWorker(worker) {
    if (chrome.firefoxWorkers.indexOf(worker) === -1) {
        chrome.runtime.onMessage.callBack(worker);
        chrome.firefoxWorkers.push(worker);
        chrome.firefoxTabsId.push(worker.tab.id);
        chrome.firefoxTabsOldId.push(worker.tab.id);            // this is used when removing worker
    }
}

manifest.content_scripts.forEach(function (obj) {

    var pageObject = {
        include: obj.matches,
        contentScriptWhen: (obj.run_at || undefined) === "document_start" ? "start" : (obj.run_at || undefined) === "document_end" ? "ready" : "end",
        attachTo: "top",
        contentScriptOptions: {
            dataURL: chrome.firefoxData.url("")
        },
        onAttach: function (worker) {

            addWorker(worker);
            var tabId = worker.tab.id;

            worker.on("detach", function () {
                var newTabId = tabId;                                   // for safety if id is not updated. I think it is bulletproof
                chrome.firefoxTabsOldId.forEach(function(id, index){
                    if (id === tabId) {
                        newTabId = chrome.firefoxTabsId[index];          // get the new id from index of old id
                        chrome.firefoxWorkers.splice(index, 1);          // removing work
                        chrome.firefoxTabsId.splice(index, 1);
                        chrome.firefoxTabsOldId.splice(index, 1);
                        //console.log("firefox workers: " + chrome.firefoxWorkers.length);
                    }
                });

                if(chrome.firefoxTabCloseFlag){
                    //console.log("calling onremoved");
                    chrome.firefoxTabCloseFlag = false;                 // reset, this also fix the problem with more than one worker
                    chrome.tabs.onRemoved.callBack(newTabId);          // Only send/simulate a tab close event if worker detach follows a tab close
                }
            });
        }
    };

    if (obj.js) {
        obj.js.unshift(chrome.firefoxData.url("chromeAPIFirefox/chromeAPIForFirefox.js"));
        pageObject.contentScriptFile = (function (scripts) {
            return scripts.map(function (script) {
                return chrome.firefoxData.url(script);
            })
        })(obj.js);
    }

    if (obj.css) {
        pageObject.contentStyleFile = (function (styles) {
            return styles.map(function (style) {
                return chrome.firefoxData.url(style);
            })
        })(obj.css);
    }

    chrome.firefoxPageMod.PageMod(pageObject);
});
