/**
 * Created by kristian on 10.11.14.
 * ****************************************************************************
 * Since Safari have no option for different white list for different scripts, I
 * made a chrome manifest parser who use the addContentScriptFromURL to achieve the
 * same result.
 */

(function () {
    var xhr = new XMLHttpRequest();
    xhr.open('get', safari.extension.baseURI + "manifest.json", true);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            //console.log(xhr);
            parseManifest(this.response);
        }

    };

    xhr.send();

    function parseManifest(cs) {
        baseURI = safari.extension.baseURI;
        var blackList = [];                           // I don't use blackList
        cs.content_scripts.forEach(function (obj) {
            var whiteList = obj.matches;
            var runAtEnd = (obj.run_at || undefined) !== "document_start"; // true = runAtEnd
            if (obj.css) {
                obj.css.forEach(function (cssURL) {
                    safari.extension.addContentStyleSheetFromURL(baseURI + cssURL, whiteList, blackList);
                });
            }
            if (obj.js) {
                safari.extension.addContentScriptFromURL(baseURI + "chromeAPISafari/chromeAPIForSafari.js", whiteList, blackList, false);
                obj.js.forEach(function (jsURL) {
                    safari.extension.addContentScriptFromURL(baseURI + jsURL, whiteList, blackList, runAtEnd);
                });
            }

        });

    }
})();
