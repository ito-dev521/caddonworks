/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/isstream";
exports.ids = ["vendor-chunks/isstream"];
exports.modules = {

/***/ "(rsc)/./node_modules/isstream/isstream.js":
/*!*******************************************!*\
  !*** ./node_modules/isstream/isstream.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("var stream = __webpack_require__(/*! stream */ \"stream\");\nfunction isStream(obj) {\n    return obj instanceof stream.Stream;\n}\nfunction isReadable(obj) {\n    return isStream(obj) && typeof obj._read == \"function\" && typeof obj._readableState == \"object\";\n}\nfunction isWritable(obj) {\n    return isStream(obj) && typeof obj._write == \"function\" && typeof obj._writableState == \"object\";\n}\nfunction isDuplex(obj) {\n    return isReadable(obj) && isWritable(obj);\n}\nmodule.exports = isStream;\nmodule.exports.isReadable = isReadable;\nmodule.exports.isWritable = isWritable;\nmodule.exports.isDuplex = isDuplex;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaXNzdHJlYW0vaXNzdHJlYW0uanMiLCJtYXBwaW5ncyI6IkFBQUEsSUFBSUEsU0FBU0MsbUJBQU9BLENBQUM7QUFHckIsU0FBU0MsU0FBVUMsR0FBRztJQUNwQixPQUFPQSxlQUFlSCxPQUFPSSxNQUFNO0FBQ3JDO0FBR0EsU0FBU0MsV0FBWUYsR0FBRztJQUN0QixPQUFPRCxTQUFTQyxRQUFRLE9BQU9BLElBQUlHLEtBQUssSUFBSSxjQUFjLE9BQU9ILElBQUlJLGNBQWMsSUFBSTtBQUN6RjtBQUdBLFNBQVNDLFdBQVlMLEdBQUc7SUFDdEIsT0FBT0QsU0FBU0MsUUFBUSxPQUFPQSxJQUFJTSxNQUFNLElBQUksY0FBYyxPQUFPTixJQUFJTyxjQUFjLElBQUk7QUFDMUY7QUFHQSxTQUFTQyxTQUFVUixHQUFHO0lBQ3BCLE9BQU9FLFdBQVdGLFFBQVFLLFdBQVdMO0FBQ3ZDO0FBR0FTLE9BQU9DLE9BQU8sR0FBY1g7QUFDNUJVLHlCQUF5QixHQUFHUDtBQUM1Qk8seUJBQXlCLEdBQUdKO0FBQzVCSSx1QkFBdUIsR0FBS0QiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jaXZpbC1lbmdpbmVlcmluZy1wbGF0Zm9ybS8uL25vZGVfbW9kdWxlcy9pc3N0cmVhbS9pc3N0cmVhbS5qcz9hY2Q4Il0sInNvdXJjZXNDb250ZW50IjpbInZhciBzdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKVxuXG5cbmZ1bmN0aW9uIGlzU3RyZWFtIChvYmopIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIHN0cmVhbS5TdHJlYW1cbn1cblxuXG5mdW5jdGlvbiBpc1JlYWRhYmxlIChvYmopIHtcbiAgcmV0dXJuIGlzU3RyZWFtKG9iaikgJiYgdHlwZW9mIG9iai5fcmVhZCA9PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBvYmouX3JlYWRhYmxlU3RhdGUgPT0gJ29iamVjdCdcbn1cblxuXG5mdW5jdGlvbiBpc1dyaXRhYmxlIChvYmopIHtcbiAgcmV0dXJuIGlzU3RyZWFtKG9iaikgJiYgdHlwZW9mIG9iai5fd3JpdGUgPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygb2JqLl93cml0YWJsZVN0YXRlID09ICdvYmplY3QnXG59XG5cblxuZnVuY3Rpb24gaXNEdXBsZXggKG9iaikge1xuICByZXR1cm4gaXNSZWFkYWJsZShvYmopICYmIGlzV3JpdGFibGUob2JqKVxufVxuXG5cbm1vZHVsZS5leHBvcnRzICAgICAgICAgICAgPSBpc1N0cmVhbVxubW9kdWxlLmV4cG9ydHMuaXNSZWFkYWJsZSA9IGlzUmVhZGFibGVcbm1vZHVsZS5leHBvcnRzLmlzV3JpdGFibGUgPSBpc1dyaXRhYmxlXG5tb2R1bGUuZXhwb3J0cy5pc0R1cGxleCAgID0gaXNEdXBsZXhcbiJdLCJuYW1lcyI6WyJzdHJlYW0iLCJyZXF1aXJlIiwiaXNTdHJlYW0iLCJvYmoiLCJTdHJlYW0iLCJpc1JlYWRhYmxlIiwiX3JlYWQiLCJfcmVhZGFibGVTdGF0ZSIsImlzV3JpdGFibGUiLCJfd3JpdGUiLCJfd3JpdGFibGVTdGF0ZSIsImlzRHVwbGV4IiwibW9kdWxlIiwiZXhwb3J0cyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/isstream/isstream.js\n");

/***/ })

};
;