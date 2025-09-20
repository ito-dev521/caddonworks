"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/toidentifier";
exports.ids = ["vendor-chunks/toidentifier"];
exports.modules = {

/***/ "(rsc)/./node_modules/toidentifier/index.js":
/*!********************************************!*\
  !*** ./node_modules/toidentifier/index.js ***!
  \********************************************/
/***/ ((module) => {

eval("/*!\n * toidentifier\n * Copyright(c) 2016 Douglas Christopher Wilson\n * MIT Licensed\n */ \n/**\n * Module exports.\n * @public\n */ module.exports = toIdentifier;\n/**\n * Trasform the given string into a JavaScript identifier\n *\n * @param {string} str\n * @returns {string}\n * @public\n */ function toIdentifier(str) {\n    return str.split(\" \").map(function(token) {\n        return token.slice(0, 1).toUpperCase() + token.slice(1);\n    }).join(\"\").replace(/[^ _0-9a-z]/gi, \"\");\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvdG9pZGVudGlmaWVyL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFBOzs7O0NBSUMsR0FFRDtBQUVBOzs7Q0FHQyxHQUVEQSxPQUFPQyxPQUFPLEdBQUdDO0FBRWpCOzs7Ozs7Q0FNQyxHQUVELFNBQVNBLGFBQWNDLEdBQUc7SUFDeEIsT0FBT0EsSUFDSkMsS0FBSyxDQUFDLEtBQ05DLEdBQUcsQ0FBQyxTQUFVQyxLQUFLO1FBQ2xCLE9BQU9BLE1BQU1DLEtBQUssQ0FBQyxHQUFHLEdBQUdDLFdBQVcsS0FBS0YsTUFBTUMsS0FBSyxDQUFDO0lBQ3ZELEdBQ0NFLElBQUksQ0FBQyxJQUNMQyxPQUFPLENBQUMsaUJBQWlCO0FBQzlCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vLi9ub2RlX21vZHVsZXMvdG9pZGVudGlmaWVyL2luZGV4LmpzPzAyZTAiXSwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiB0b2lkZW50aWZpZXJcbiAqIENvcHlyaWdodChjKSAyMDE2IERvdWdsYXMgQ2hyaXN0b3BoZXIgV2lsc29uXG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4ndXNlIHN0cmljdCdcblxuLyoqXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqIEBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRvSWRlbnRpZmllclxuXG4vKipcbiAqIFRyYXNmb3JtIHRoZSBnaXZlbiBzdHJpbmcgaW50byBhIEphdmFTY3JpcHQgaWRlbnRpZmllclxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKiBAcHVibGljXG4gKi9cblxuZnVuY3Rpb24gdG9JZGVudGlmaWVyIChzdHIpIHtcbiAgcmV0dXJuIHN0clxuICAgIC5zcGxpdCgnICcpXG4gICAgLm1hcChmdW5jdGlvbiAodG9rZW4pIHtcbiAgICAgIHJldHVybiB0b2tlbi5zbGljZSgwLCAxKS50b1VwcGVyQ2FzZSgpICsgdG9rZW4uc2xpY2UoMSlcbiAgICB9KVxuICAgIC5qb2luKCcnKVxuICAgIC5yZXBsYWNlKC9bXiBfMC05YS16XS9naSwgJycpXG59XG4iXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0cyIsInRvSWRlbnRpZmllciIsInN0ciIsInNwbGl0IiwibWFwIiwidG9rZW4iLCJzbGljZSIsInRvVXBwZXJDYXNlIiwiam9pbiIsInJlcGxhY2UiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/toidentifier/index.js\n");

/***/ })

};
;