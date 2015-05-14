/**
 * Created by kristian on 09.11.14.
 */

var chrome = {
    firefoxTabCloseFlag: false,
    firefoxWorkers: [],
    firefoxPageMod: undefined,
    firefoxTabs: undefined,
    firefoxData: undefined,
    firefoxButtons: undefined,
    pageModArray: undefined,
    browserAction: {
        onClicked: {
            addListener: function (callBack) {
                var chromeCallBack = (function (cb) {
                    return function () {
                        var tab = chrome.firefoxTabs.activeTab;
                        cb(tab);
                    }
                })(callBack);

                chrome.firefoxButtons.ActionButton({
                    id: "ButtonId",
                    label: "MessageOnHoover",
                    icon: {
                        "16": "./img/nameOfIcon-16x16.png",
                        "32": "./img/nameOfIcon-32x32.png"
                    },
                    onClick: chromeCallBack
                });
            }
        }
    },
    tabs: {
        firefoxUpdateId: function () {
            chrome.firefoxTabsId.forEach(function (id, index, array) {
                if (chrome.firefoxWorkers[index] && chrome.firefoxWorkers[index].tab) {                         // it could be null
                    var workerTab = chrome.firefoxWorkers[index].tab;
                    if (id !== workerTab.id) {
                        chrome.firefoxTabCloseFlag = false;                             // it was a tab move event, not close
                        //console.log("workerTabId: " + workerTab.id);
                        workerTab.once("close", function () {
                            chrome.firefoxTabCloseFlag = true;              // I use this to only send a tab close event if worker is detached and tab is closed,
                                                                            // because if only tab close event is fired it is a move between windows
                            chrome.firefoxTabs.once("activate", function (t) {
                                //console.log("opened after close" + t.id);
                                chrome.tabs.firefoxUpdateId();
                            })

                        });
                        array.forEach(function (oId, i, ar) {                             // replace old tab id with new so onReplaced event is only called once
                            ar[i] = oId === id ? workerTab.id : oId;
                        });
                        chrome.tabs.onReplaced.callBack(workerTab.id, id);           // tabId is changed, so simulate a chrome.tabs.onReplaced event
                    }
                } else {
                    //console.log("tab is closed, not moved");                        // this is called for every worker in tab, i know ;)
                }
            });
        },
        sendMessage: function (id, data, callBack) {

            //chrome.tabs.firefoxUpdateId();

            var worker = chrome.firefoxWorkers.filter(function (w) {
                return w.tab.id === id
            });

            if (worker.length) {
                var name = "messageFromBgNoCallBack";
                if (callBack) {
                    name = "messageFromBgCallBack";
                    worker.forEach(function (w) {
                        w.port.once("messageFromTabCallBack", function callBackFromTab(msg) {
                            callBack(msg);
                        });
                    })
                }
                //console.log("sending msg to tab: " + data.sender || data.message || data.senderId);
                worker.forEach(function (w) {
                    w.port.emit(name, data);
                })
            }
        },
        onReplaced: {
            addListener: function (callBack) {
                chrome.tabs.onReplaced.callBack = function (newId, oldId) {
                    callBack(newId, oldId);
                }
            }
        },
        onRemoved: {
            addListener: function (callBack) {
                chrome.tabs.onRemoved.callBack = callBack;
            },
            callBack: function () {
            }
        },
        create: function (obj, callBack) {
            chrome.firefoxTabs.open({
                url: obj.url,
                inBackground: !obj.active,
                onOpen: function (tab) {
                    tab.once("close", function () {
                        chrome.firefoxTabCloseFlag = true;              // I use this to only send a tab close event if worker is detached and tab is closed,
                                                                        // because if only tab close event is fired it is a move between windows
                        chrome.firefoxTabs.once("activate", function (t) {
                            //console.log("opened after close" + t.id);
                            chrome.tabs.firefoxUpdateId();
                        })

                    });
                    callBack(tab);
                }
            });
        },
        get: function (tabId, callBack) {

            var cTab = {};

            for (var i = 0; i < chrome.firefoxTabs.length; i++) {
                if (chrome.firefoxTabs[i].id === tabId) {
                    cTab.index = chrome.firefoxTabs[i].index;
                    cTab.windowId = chrome.firefoxTabs[i].window;
                    break;
                }
            }
            callBack(cTab);
        },
        highlight: function (obj, callBack) {

            //TODO obj.tabs can be an array

            for (var i = 0; i < chrome.firefoxTabs.length; i++) {
                if (chrome.firefoxTabs[i].index === obj.tabs && chrome.firefoxTabs[i].window === obj.windowId) {
                    chrome.firefoxTabs[i].activate();
                    var window = chrome.firefoxTabs[i].window;
                    break;
                }
            }
            callBack(window);
        }
    },
    windows: {
        update: function (window, updateInfo, callBack) {                       // TODO only implemented focused
            if (updateInfo.focused && updateInfo.focused === true) {

                // No windowId in firefox, so i store the reference in tabs.get
                window.activate();
            }

            if(callBack){
                callBack(window);
            }
        }
    },
    runtime: {
        onUpdateAvailable: {
            addListener: function () {              // TODO dummy function for now

            }
        },
        onMessage: {
            callBack: function () {
            },
            addListener: function (callBack) {
                if (chrome.firefoxPageMod) {        // are we in backgroundScript?

                    chrome.runtime.onMessage.callBack = function (w) {
                        var sender = w;
                        var tabId = sender.tab.id;
                        //console.log("inside onMessage BG tabID: " + tabId);
                        sender.port.on("messageFromTabCallBack", function (message) {
                            //console.log("got message from tab with call back " + tabId);
                            var sendResponse = function (msg) {
                                sender.port.emit("messageFromBgCallBack", msg);      //TODO find out if sendResponse can have call back
                            };
                            callBack(message, sender, sendResponse);    // Simulate a chrome message with call back
                        });

                        sender.port.on("messageFromTabNoCallBack", function (message) {
                            //console.log("got message from tab without call back " + tabId);
                            callBack(message, sender);    // Simulate a chrome message without call back
                        });

                    }

                } else {
                    var sender = {};
                    sender.tab = undefined;   // chrome background have no tab object

                    self.port.on("messageFromBgCallBack", function (message) {
                        var sendResponse = function (msg) {
                            self.port.emit("messageFromTabCallBack", msg);      //TODO find out if sendResponse can have call back
                        };
                        //console.log("got message from background with call back " + message.sender || message.senderId || message.message);
                        callBack(message, sender, sendResponse);    // Simulate a chrome message with call back
                    });

                    self.port.on("messageFromBgNoCallBack", function (message) {
                        var sendResponse = undefined;
                        //console.log("got message from background without call back " + message.sender || message.senderId || message.message);
                        callBack(message, sender, sendResponse);    // Simulate a chrome message without call back
                    });
                }
            }
        },
        sendMessage: function (data, callBack) {
            var name = "messageFromTabNoCallBack";
            if (callBack) {
                name = "messageFromTabCallBack";
                self.port.once("messageFromBgCallBack", function callBackFromBg(msg) {
                    callBack(msg);
                });
            }
            //console.log("sending msg to back ground from tab" + data.sender || data.senderId);
            self.port.emit(name, data);

        }
    },
    extension: {
        getURL: function (url) {
            if (chrome.firefoxData) {
                return chrome.firefoxData.url(url);
            } else {
                return self.options.dataURL + url;
            }
        }
    }
};