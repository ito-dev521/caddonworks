"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/es-get-iterator";
exports.ids = ["vendor-chunks/es-get-iterator"];
exports.modules = {

/***/ "(rsc)/./node_modules/es-get-iterator/node.js":
/*!**********************************************!*\
  !*** ./node_modules/es-get-iterator/node.js ***!
  \**********************************************/
/***/ ((module) => {

eval("\n// this should only run in node >= 13.2, so it\n// does not need any of the intense fallbacks that old node/browsers do\nvar $iterator = Symbol.iterator;\nmodule.exports = function getIterator(iterable) {\n    // alternatively, `iterable[$iterator]?.()`\n    if (iterable != null && typeof iterable[$iterator] !== \"undefined\") {\n        return iterable[$iterator]();\n    }\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvZXMtZ2V0LWl0ZXJhdG9yL25vZGUuanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFFQSw4Q0FBOEM7QUFDOUMsdUVBQXVFO0FBRXZFLElBQUlBLFlBQVlDLE9BQU9DLFFBQVE7QUFDL0JDLE9BQU9DLE9BQU8sR0FBRyxTQUFTQyxZQUFZQyxRQUFRO0lBQzdDLDJDQUEyQztJQUMzQyxJQUFJQSxZQUFZLFFBQVEsT0FBT0EsUUFBUSxDQUFDTixVQUFVLEtBQUssYUFBYTtRQUNuRSxPQUFPTSxRQUFRLENBQUNOLFVBQVU7SUFDM0I7QUFDRCIsInNvdXJjZXMiOlsid2VicGFjazovL2NpdmlsLWVuZ2luZWVyaW5nLXBsYXRmb3JtLy4vbm9kZV9tb2R1bGVzL2VzLWdldC1pdGVyYXRvci9ub2RlLmpzP2QzOGUiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG4vLyB0aGlzIHNob3VsZCBvbmx5IHJ1biBpbiBub2RlID49IDEzLjIsIHNvIGl0XG4vLyBkb2VzIG5vdCBuZWVkIGFueSBvZiB0aGUgaW50ZW5zZSBmYWxsYmFja3MgdGhhdCBvbGQgbm9kZS9icm93c2VycyBkb1xuXG52YXIgJGl0ZXJhdG9yID0gU3ltYm9sLml0ZXJhdG9yO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZXRJdGVyYXRvcihpdGVyYWJsZSkge1xuXHQvLyBhbHRlcm5hdGl2ZWx5LCBgaXRlcmFibGVbJGl0ZXJhdG9yXT8uKClgXG5cdGlmIChpdGVyYWJsZSAhPSBudWxsICYmIHR5cGVvZiBpdGVyYWJsZVskaXRlcmF0b3JdICE9PSAndW5kZWZpbmVkJykge1xuXHRcdHJldHVybiBpdGVyYWJsZVskaXRlcmF0b3JdKCk7XG5cdH1cbn07XG4iXSwibmFtZXMiOlsiJGl0ZXJhdG9yIiwiU3ltYm9sIiwiaXRlcmF0b3IiLCJtb2R1bGUiLCJleHBvcnRzIiwiZ2V0SXRlcmF0b3IiLCJpdGVyYWJsZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/es-get-iterator/node.js\n");

/***/ })

};
;