"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/safe-regex-test";
exports.ids = ["vendor-chunks/safe-regex-test"];
exports.modules = {

/***/ "(rsc)/./node_modules/safe-regex-test/index.js":
/*!***********************************************!*\
  !*** ./node_modules/safe-regex-test/index.js ***!
  \***********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nvar callBound = __webpack_require__(/*! call-bound */ \"(rsc)/./node_modules/call-bound/index.js\");\nvar isRegex = __webpack_require__(/*! is-regex */ \"(rsc)/./node_modules/is-regex/index.js\");\nvar $exec = callBound(\"RegExp.prototype.exec\");\nvar $TypeError = __webpack_require__(/*! es-errors/type */ \"(rsc)/./node_modules/es-errors/type.js\");\n/** @type {import('.')} */ module.exports = function regexTester(regex) {\n    if (!isRegex(regex)) {\n        throw new $TypeError(\"`regex` must be a RegExp\");\n    }\n    return function test(s) {\n        return $exec(regex, s) !== null;\n    };\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvc2FmZS1yZWdleC10ZXN0L2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFBO0FBRUEsSUFBSUEsWUFBWUMsbUJBQU9BLENBQUM7QUFDeEIsSUFBSUMsVUFBVUQsbUJBQU9BLENBQUM7QUFFdEIsSUFBSUUsUUFBUUgsVUFBVTtBQUN0QixJQUFJSSxhQUFhSCxtQkFBT0EsQ0FBQztBQUV6Qix3QkFBd0IsR0FDeEJJLE9BQU9DLE9BQU8sR0FBRyxTQUFTQyxZQUFZQyxLQUFLO0lBQzFDLElBQUksQ0FBQ04sUUFBUU0sUUFBUTtRQUNwQixNQUFNLElBQUlKLFdBQVc7SUFDdEI7SUFDQSxPQUFPLFNBQVNLLEtBQUtDLENBQUM7UUFDckIsT0FBT1AsTUFBTUssT0FBT0UsT0FBTztJQUM1QjtBQUNEIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vLi9ub2RlX21vZHVsZXMvc2FmZS1yZWdleC10ZXN0L2luZGV4LmpzP2YzZmUiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2FsbEJvdW5kID0gcmVxdWlyZSgnY2FsbC1ib3VuZCcpO1xudmFyIGlzUmVnZXggPSByZXF1aXJlKCdpcy1yZWdleCcpO1xuXG52YXIgJGV4ZWMgPSBjYWxsQm91bmQoJ1JlZ0V4cC5wcm90b3R5cGUuZXhlYycpO1xudmFyICRUeXBlRXJyb3IgPSByZXF1aXJlKCdlcy1lcnJvcnMvdHlwZScpO1xuXG4vKiogQHR5cGUge2ltcG9ydCgnLicpfSAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiByZWdleFRlc3RlcihyZWdleCkge1xuXHRpZiAoIWlzUmVnZXgocmVnZXgpKSB7XG5cdFx0dGhyb3cgbmV3ICRUeXBlRXJyb3IoJ2ByZWdleGAgbXVzdCBiZSBhIFJlZ0V4cCcpO1xuXHR9XG5cdHJldHVybiBmdW5jdGlvbiB0ZXN0KHMpIHtcblx0XHRyZXR1cm4gJGV4ZWMocmVnZXgsIHMpICE9PSBudWxsO1xuXHR9O1xufTtcbiJdLCJuYW1lcyI6WyJjYWxsQm91bmQiLCJyZXF1aXJlIiwiaXNSZWdleCIsIiRleGVjIiwiJFR5cGVFcnJvciIsIm1vZHVsZSIsImV4cG9ydHMiLCJyZWdleFRlc3RlciIsInJlZ2V4IiwidGVzdCIsInMiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/safe-regex-test/index.js\n");

/***/ })

};
;