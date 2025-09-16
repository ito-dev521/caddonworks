"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/which-boxed-primitive";
exports.ids = ["vendor-chunks/which-boxed-primitive"];
exports.modules = {

/***/ "(rsc)/./node_modules/which-boxed-primitive/index.js":
/*!*****************************************************!*\
  !*** ./node_modules/which-boxed-primitive/index.js ***!
  \*****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nvar isString = __webpack_require__(/*! is-string */ \"(rsc)/./node_modules/is-string/index.js\");\nvar isNumber = __webpack_require__(/*! is-number-object */ \"(rsc)/./node_modules/is-number-object/index.js\");\nvar isBoolean = __webpack_require__(/*! is-boolean-object */ \"(rsc)/./node_modules/is-boolean-object/index.js\");\nvar isSymbol = __webpack_require__(/*! is-symbol */ \"(rsc)/./node_modules/is-symbol/index.js\");\nvar isBigInt = __webpack_require__(/*! is-bigint */ \"(rsc)/./node_modules/is-bigint/index.js\");\n/** @type {import('.')} */ // eslint-disable-next-line consistent-return\nmodule.exports = function whichBoxedPrimitive(value) {\n    // eslint-disable-next-line eqeqeq\n    if (value == null || typeof value !== \"object\" && typeof value !== \"function\") {\n        return null;\n    }\n    if (isString(value)) {\n        return \"String\";\n    }\n    if (isNumber(value)) {\n        return \"Number\";\n    }\n    if (isBoolean(value)) {\n        return \"Boolean\";\n    }\n    if (isSymbol(value)) {\n        return \"Symbol\";\n    }\n    if (isBigInt(value)) {\n        return \"BigInt\";\n    }\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvd2hpY2gtYm94ZWQtcHJpbWl0aXZlL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFBO0FBRUEsSUFBSUEsV0FBV0MsbUJBQU9BLENBQUM7QUFDdkIsSUFBSUMsV0FBV0QsbUJBQU9BLENBQUM7QUFDdkIsSUFBSUUsWUFBWUYsbUJBQU9BLENBQUM7QUFDeEIsSUFBSUcsV0FBV0gsbUJBQU9BLENBQUM7QUFDdkIsSUFBSUksV0FBV0osbUJBQU9BLENBQUM7QUFFdkIsd0JBQXdCLEdBQ3hCLDZDQUE2QztBQUM3Q0ssT0FBT0MsT0FBTyxHQUFHLFNBQVNDLG9CQUFvQkMsS0FBSztJQUNsRCxrQ0FBa0M7SUFDbEMsSUFBSUEsU0FBUyxRQUFTLE9BQU9BLFVBQVUsWUFBWSxPQUFPQSxVQUFVLFlBQWE7UUFDaEYsT0FBTztJQUNSO0lBQ0EsSUFBSVQsU0FBU1MsUUFBUTtRQUNwQixPQUFPO0lBQ1I7SUFDQSxJQUFJUCxTQUFTTyxRQUFRO1FBQ3BCLE9BQU87SUFDUjtJQUNBLElBQUlOLFVBQVVNLFFBQVE7UUFDckIsT0FBTztJQUNSO0lBQ0EsSUFBSUwsU0FBU0ssUUFBUTtRQUNwQixPQUFPO0lBQ1I7SUFDQSxJQUFJSixTQUFTSSxRQUFRO1FBQ3BCLE9BQU87SUFDUjtBQUNEIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vLi9ub2RlX21vZHVsZXMvd2hpY2gtYm94ZWQtcHJpbWl0aXZlL2luZGV4LmpzPzUzYzgiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaXNTdHJpbmcgPSByZXF1aXJlKCdpcy1zdHJpbmcnKTtcbnZhciBpc051bWJlciA9IHJlcXVpcmUoJ2lzLW51bWJlci1vYmplY3QnKTtcbnZhciBpc0Jvb2xlYW4gPSByZXF1aXJlKCdpcy1ib29sZWFuLW9iamVjdCcpO1xudmFyIGlzU3ltYm9sID0gcmVxdWlyZSgnaXMtc3ltYm9sJyk7XG52YXIgaXNCaWdJbnQgPSByZXF1aXJlKCdpcy1iaWdpbnQnKTtcblxuLyoqIEB0eXBlIHtpbXBvcnQoJy4nKX0gKi9cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBjb25zaXN0ZW50LXJldHVyblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aGljaEJveGVkUHJpbWl0aXZlKHZhbHVlKSB7XG5cdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBlcWVxZXFcblx0aWYgKHZhbHVlID09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIHZhbHVlICE9PSAnZnVuY3Rpb24nKSkge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cdGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcblx0XHRyZXR1cm4gJ1N0cmluZyc7XG5cdH1cblx0aWYgKGlzTnVtYmVyKHZhbHVlKSkge1xuXHRcdHJldHVybiAnTnVtYmVyJztcblx0fVxuXHRpZiAoaXNCb29sZWFuKHZhbHVlKSkge1xuXHRcdHJldHVybiAnQm9vbGVhbic7XG5cdH1cblx0aWYgKGlzU3ltYm9sKHZhbHVlKSkge1xuXHRcdHJldHVybiAnU3ltYm9sJztcblx0fVxuXHRpZiAoaXNCaWdJbnQodmFsdWUpKSB7XG5cdFx0cmV0dXJuICdCaWdJbnQnO1xuXHR9XG59O1xuIl0sIm5hbWVzIjpbImlzU3RyaW5nIiwicmVxdWlyZSIsImlzTnVtYmVyIiwiaXNCb29sZWFuIiwiaXNTeW1ib2wiLCJpc0JpZ0ludCIsIm1vZHVsZSIsImV4cG9ydHMiLCJ3aGljaEJveGVkUHJpbWl0aXZlIiwidmFsdWUiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/which-boxed-primitive/index.js\n");

/***/ })

};
;