"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/which-collection";
exports.ids = ["vendor-chunks/which-collection"];
exports.modules = {

/***/ "(rsc)/./node_modules/which-collection/index.js":
/*!************************************************!*\
  !*** ./node_modules/which-collection/index.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nvar isMap = __webpack_require__(/*! is-map */ \"(rsc)/./node_modules/is-map/index.js\");\nvar isSet = __webpack_require__(/*! is-set */ \"(rsc)/./node_modules/is-set/index.js\");\nvar isWeakMap = __webpack_require__(/*! is-weakmap */ \"(rsc)/./node_modules/is-weakmap/index.js\");\nvar isWeakSet = __webpack_require__(/*! is-weakset */ \"(rsc)/./node_modules/is-weakset/index.js\");\n/** @type {import('.')} */ module.exports = function whichCollection(/** @type {unknown} */ value) {\n    if (value && typeof value === \"object\") {\n        if (isMap(value)) {\n            return \"Map\";\n        }\n        if (isSet(value)) {\n            return \"Set\";\n        }\n        if (isWeakMap(value)) {\n            return \"WeakMap\";\n        }\n        if (isWeakSet(value)) {\n            return \"WeakSet\";\n        }\n    }\n    return false;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvd2hpY2gtY29sbGVjdGlvbi9pbmRleC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUVBLElBQUlBLFFBQVFDLG1CQUFPQSxDQUFDO0FBQ3BCLElBQUlDLFFBQVFELG1CQUFPQSxDQUFDO0FBQ3BCLElBQUlFLFlBQVlGLG1CQUFPQSxDQUFDO0FBQ3hCLElBQUlHLFlBQVlILG1CQUFPQSxDQUFDO0FBRXhCLHdCQUF3QixHQUN4QkksT0FBT0MsT0FBTyxHQUFHLFNBQVNDLGdCQUFnQixvQkFBb0IsR0FBR0MsS0FBSztJQUNyRSxJQUFJQSxTQUFTLE9BQU9BLFVBQVUsVUFBVTtRQUN2QyxJQUFJUixNQUFNUSxRQUFRO1lBQ2pCLE9BQU87UUFDUjtRQUNBLElBQUlOLE1BQU1NLFFBQVE7WUFDakIsT0FBTztRQUNSO1FBQ0EsSUFBSUwsVUFBVUssUUFBUTtZQUNyQixPQUFPO1FBQ1I7UUFDQSxJQUFJSixVQUFVSSxRQUFRO1lBQ3JCLE9BQU87UUFDUjtJQUNEO0lBQ0EsT0FBTztBQUNSIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vLi9ub2RlX21vZHVsZXMvd2hpY2gtY29sbGVjdGlvbi9pbmRleC5qcz8yZTk0Il0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIGlzTWFwID0gcmVxdWlyZSgnaXMtbWFwJyk7XG52YXIgaXNTZXQgPSByZXF1aXJlKCdpcy1zZXQnKTtcbnZhciBpc1dlYWtNYXAgPSByZXF1aXJlKCdpcy13ZWFrbWFwJyk7XG52YXIgaXNXZWFrU2V0ID0gcmVxdWlyZSgnaXMtd2Vha3NldCcpO1xuXG4vKiogQHR5cGUge2ltcG9ydCgnLicpfSAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aGljaENvbGxlY3Rpb24oLyoqIEB0eXBlIHt1bmtub3dufSAqLyB2YWx1ZSkge1xuXHRpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuXHRcdGlmIChpc01hcCh2YWx1ZSkpIHtcblx0XHRcdHJldHVybiAnTWFwJztcblx0XHR9XG5cdFx0aWYgKGlzU2V0KHZhbHVlKSkge1xuXHRcdFx0cmV0dXJuICdTZXQnO1xuXHRcdH1cblx0XHRpZiAoaXNXZWFrTWFwKHZhbHVlKSkge1xuXHRcdFx0cmV0dXJuICdXZWFrTWFwJztcblx0XHR9XG5cdFx0aWYgKGlzV2Vha1NldCh2YWx1ZSkpIHtcblx0XHRcdHJldHVybiAnV2Vha1NldCc7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBmYWxzZTtcbn07XG4iXSwibmFtZXMiOlsiaXNNYXAiLCJyZXF1aXJlIiwiaXNTZXQiLCJpc1dlYWtNYXAiLCJpc1dlYWtTZXQiLCJtb2R1bGUiLCJleHBvcnRzIiwid2hpY2hDb2xsZWN0aW9uIiwidmFsdWUiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/which-collection/index.js\n");

/***/ })

};
;