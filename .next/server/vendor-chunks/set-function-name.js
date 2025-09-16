"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/set-function-name";
exports.ids = ["vendor-chunks/set-function-name"];
exports.modules = {

/***/ "(rsc)/./node_modules/set-function-name/index.js":
/*!*************************************************!*\
  !*** ./node_modules/set-function-name/index.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nvar define = __webpack_require__(/*! define-data-property */ \"(rsc)/./node_modules/define-data-property/index.js\");\nvar hasDescriptors = __webpack_require__(/*! has-property-descriptors */ \"(rsc)/./node_modules/has-property-descriptors/index.js\")();\nvar functionsHaveConfigurableNames = (__webpack_require__(/*! functions-have-names */ \"(rsc)/./node_modules/functions-have-names/index.js\").functionsHaveConfigurableNames)();\nvar $TypeError = __webpack_require__(/*! es-errors/type */ \"(rsc)/./node_modules/es-errors/type.js\");\n/** @type {import('.')} */ module.exports = function setFunctionName(fn, name) {\n    if (typeof fn !== \"function\") {\n        throw new $TypeError(\"`fn` is not a function\");\n    }\n    var loose = arguments.length > 2 && !!arguments[2];\n    if (!loose || functionsHaveConfigurableNames) {\n        if (hasDescriptors) {\n            define(/** @type {Parameters<define>[0]} */ fn, \"name\", name, true, true);\n        } else {\n            define(/** @type {Parameters<define>[0]} */ fn, \"name\", name);\n        }\n    }\n    return fn;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvc2V0LWZ1bmN0aW9uLW5hbWUvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFFQSxJQUFJQSxTQUFTQyxtQkFBT0EsQ0FBQztBQUNyQixJQUFJQyxpQkFBaUJELG1CQUFPQSxDQUFDO0FBQzdCLElBQUlFLGlDQUFpQ0Ysc0lBQThEO0FBRW5HLElBQUlHLGFBQWFILG1CQUFPQSxDQUFDO0FBRXpCLHdCQUF3QixHQUN4QkksT0FBT0MsT0FBTyxHQUFHLFNBQVNDLGdCQUFnQkMsRUFBRSxFQUFFQyxJQUFJO0lBQ2pELElBQUksT0FBT0QsT0FBTyxZQUFZO1FBQzdCLE1BQU0sSUFBSUosV0FBVztJQUN0QjtJQUNBLElBQUlNLFFBQVFDLFVBQVVDLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQ0QsU0FBUyxDQUFDLEVBQUU7SUFDbEQsSUFBSSxDQUFDRCxTQUFTUCxnQ0FBZ0M7UUFDN0MsSUFBSUQsZ0JBQWdCO1lBQ25CRixPQUFPLGtDQUFrQyxHQUFJUSxJQUFLLFFBQVFDLE1BQU0sTUFBTTtRQUN2RSxPQUFPO1lBQ05ULE9BQU8sa0NBQWtDLEdBQUlRLElBQUssUUFBUUM7UUFDM0Q7SUFDRDtJQUNBLE9BQU9EO0FBQ1IiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jaXZpbC1lbmdpbmVlcmluZy1wbGF0Zm9ybS8uL25vZGVfbW9kdWxlcy9zZXQtZnVuY3Rpb24tbmFtZS9pbmRleC5qcz9lNDY1Il0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIGRlZmluZSA9IHJlcXVpcmUoJ2RlZmluZS1kYXRhLXByb3BlcnR5Jyk7XG52YXIgaGFzRGVzY3JpcHRvcnMgPSByZXF1aXJlKCdoYXMtcHJvcGVydHktZGVzY3JpcHRvcnMnKSgpO1xudmFyIGZ1bmN0aW9uc0hhdmVDb25maWd1cmFibGVOYW1lcyA9IHJlcXVpcmUoJ2Z1bmN0aW9ucy1oYXZlLW5hbWVzJykuZnVuY3Rpb25zSGF2ZUNvbmZpZ3VyYWJsZU5hbWVzKCk7XG5cbnZhciAkVHlwZUVycm9yID0gcmVxdWlyZSgnZXMtZXJyb3JzL3R5cGUnKTtcblxuLyoqIEB0eXBlIHtpbXBvcnQoJy4nKX0gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2V0RnVuY3Rpb25OYW1lKGZuLCBuYW1lKSB7XG5cdGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcblx0XHR0aHJvdyBuZXcgJFR5cGVFcnJvcignYGZuYCBpcyBub3QgYSBmdW5jdGlvbicpO1xuXHR9XG5cdHZhciBsb29zZSA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmICEhYXJndW1lbnRzWzJdO1xuXHRpZiAoIWxvb3NlIHx8IGZ1bmN0aW9uc0hhdmVDb25maWd1cmFibGVOYW1lcykge1xuXHRcdGlmIChoYXNEZXNjcmlwdG9ycykge1xuXHRcdFx0ZGVmaW5lKC8qKiBAdHlwZSB7UGFyYW1ldGVyczxkZWZpbmU+WzBdfSAqLyAoZm4pLCAnbmFtZScsIG5hbWUsIHRydWUsIHRydWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRkZWZpbmUoLyoqIEB0eXBlIHtQYXJhbWV0ZXJzPGRlZmluZT5bMF19ICovIChmbiksICduYW1lJywgbmFtZSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBmbjtcbn07XG4iXSwibmFtZXMiOlsiZGVmaW5lIiwicmVxdWlyZSIsImhhc0Rlc2NyaXB0b3JzIiwiZnVuY3Rpb25zSGF2ZUNvbmZpZ3VyYWJsZU5hbWVzIiwiJFR5cGVFcnJvciIsIm1vZHVsZSIsImV4cG9ydHMiLCJzZXRGdW5jdGlvbk5hbWUiLCJmbiIsIm5hbWUiLCJsb29zZSIsImFyZ3VtZW50cyIsImxlbmd0aCJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/set-function-name/index.js\n");

/***/ })

};
;