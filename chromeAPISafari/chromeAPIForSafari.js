/**
 * Created by kristian on 09.11.14.
 */


var chrome = {
    browserAction: {
        onClicked: {
            addListener: function (callBack) {
                var chromeCallBack = (function (cb) {
                    return function (event) {
                        if (event.command === "browserAction") {
                            tab = event.target.browserWindow.activeTab;
                            //tab.id = tab.url;
                            cb(tab);
                        }
                    }

                })(callBack);

                safari.application.addEventListener("command", chromeCallBack, false);

            }

        }
    },
    tabs: {
        sendMessage: function (id, data, callBack) {

            chrome.tabs.get(id, function (tab) {
                var name = "noCallBack";
                if (callBack) {
                    name = "callBack" + new Date();
                    tab.page.addEventListener('message', function respondToMsg(msg) {
                        if (msg.name === name) {
                            tab.page.removeEventListener('message', respondToMsg, false);
                            callBack(msg.message);
                        }
                    }, false);
                }

                tab.page.dispatchMessage(name, data);

            });
        }
        ,
        onReplaced: {
            addListener: function () {                    // TODO dummy function for now.

            }
        },
        onRemoved: {
            addListener: function (callBack) {
                safari.application.addEventListener("close", function (event) {

                    //var tabId = event.target.url;
                    var tabId = event.target.id;
                    if (tabId) {
                        callBack(tabId);
                    }

                }, true);
            }
        },
        create: function (obj, callBack) {                             // TODO i only have implemented the url property
            var newTab = safari.application.activeBrowserWindow.openTab(obj.active === true ? "foreground" : "background");
            newTab.url = obj.url;
            newTab.id = obj.url + new Date();
            callBack(newTab);
            //console.log(newTab);

        },
        get: function (tabId, callBack) {

            var tabIndex, winIndex, tab;
            safari.application.browserWindows.some(function (brWindow, wI) {
                winIndex = wI;
                return brWindow.tabs.some(function (tab, tabI) {
                    tabIndex = tabI;
                    //return tabId === tab.url;
                    return tabId === tab.id;


                })
            });
            if ((winIndex !== undefined) && (tabIndex !== undefined)) {
                tab = safari.application.browserWindows[winIndex].tabs[tabIndex];

                // prepare for highlight

                tab.index = tabIndex;
                tab.windowId = winIndex;
            }
            callBack(tab);
        },
        highlight: function (obj) {
            safari.application.browserWindows[obj.windowId].tabs[obj.tabs].activate();
        }
    },
    runtime: {
        onUpdateAvailable: {
            addListener: function () {              // TODO dummy function for now

            }
        },
        onMessage: {
            addListener: function (callBack) {

                var msgHandler = (function (cb) {
                    return function (event) {
                        var msgTarget = event.target.page ? event.target.page : safari.self.tab;

                        var sender = {}, sendResponse;
                        if (event.name.indexOf("callBack") > -1) {
                            sendResponse = function (msg) {
                                msgTarget.dispatchMessage(event.name, msg);       //TODO find out if sendResponse can have call back
                            }
                        } else {
                            sendResponse = undefined;
                        }
                        sender.tab = event.target.page ? event.target : undefined;
                        if (sender.tab) {
                            //sender.tab.id = event.target.url;
                            sender.tab.id = event.target.id;
                        }
                        cb(event.message, sender, sendResponse);
                    }
                })(callBack);

                if (safari.self.addEventListener) {
                    safari.self.addEventListener("message", msgHandler, false);
                } else {
                    safari.application.addEventListener("message", msgHandler, false);
                }
            }
        },
        sendMessage: function (data, callBack) {
            var name = "noCallBack";
            if (callBack) {
                name = "callBack" + new Date();
                safari.self.addEventListener('message', function respondToMsg(msg) {
                    if (msg.name === name) {
                        safari.self.removeEventListener('message', respondToMsg, false);
                        callBack(msg.message);
                    }
                }, false);
            }

            safari.self.tab.dispatchMessage(name, data);

        }
    },
    extension: {
        getURL: function (url) {
            return safari.extension.baseURI + url;
        }
    }
};