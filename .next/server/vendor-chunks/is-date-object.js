"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-date-object";
exports.ids = ["vendor-chunks/is-date-object"];
exports.modules = {

/***/ "(rsc)/./node_modules/is-date-object/index.js":
/*!**********************************************!*\
  !*** ./node_modules/is-date-object/index.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nvar callBound = __webpack_require__(/*! call-bound */ \"(rsc)/./node_modules/call-bound/index.js\");\nvar getDay = callBound(\"Date.prototype.getDay\");\n/** @type {import('.')} */ var tryDateObject = function tryDateGetDayCall(value) {\n    try {\n        getDay(value);\n        return true;\n    } catch (e) {\n        return false;\n    }\n};\n/** @type {(value: unknown) => string} */ var toStr = callBound(\"Object.prototype.toString\");\nvar dateClass = \"[object Date]\";\nvar hasToStringTag = __webpack_require__(/*! has-tostringtag/shams */ \"(rsc)/./node_modules/has-tostringtag/shams.js\")();\n/** @type {import('.')} */ module.exports = function isDateObject(value) {\n    if (typeof value !== \"object\" || value === null) {\n        return false;\n    }\n    return hasToStringTag ? tryDateObject(value) : toStr(value) === dateClass;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaXMtZGF0ZS1vYmplY3QvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFFQSxJQUFJQSxZQUFZQyxtQkFBT0EsQ0FBQztBQUV4QixJQUFJQyxTQUFTRixVQUFVO0FBQ3ZCLHdCQUF3QixHQUN4QixJQUFJRyxnQkFBZ0IsU0FBU0Msa0JBQWtCQyxLQUFLO0lBQ25ELElBQUk7UUFDSEgsT0FBT0c7UUFDUCxPQUFPO0lBQ1IsRUFBRSxPQUFPQyxHQUFHO1FBQ1gsT0FBTztJQUNSO0FBQ0Q7QUFFQSx1Q0FBdUMsR0FDdkMsSUFBSUMsUUFBUVAsVUFBVTtBQUN0QixJQUFJUSxZQUFZO0FBQ2hCLElBQUlDLGlCQUFpQlIsbUJBQU9BLENBQUM7QUFFN0Isd0JBQXdCLEdBQ3hCUyxPQUFPQyxPQUFPLEdBQUcsU0FBU0MsYUFBYVAsS0FBSztJQUMzQyxJQUFJLE9BQU9BLFVBQVUsWUFBWUEsVUFBVSxNQUFNO1FBQ2hELE9BQU87SUFDUjtJQUNBLE9BQU9JLGlCQUFpQk4sY0FBY0UsU0FBU0UsTUFBTUYsV0FBV0c7QUFDakUiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jaXZpbC1lbmdpbmVlcmluZy1wbGF0Zm9ybS8uL25vZGVfbW9kdWxlcy9pcy1kYXRlLW9iamVjdC9pbmRleC5qcz8zODljIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIGNhbGxCb3VuZCA9IHJlcXVpcmUoJ2NhbGwtYm91bmQnKTtcblxudmFyIGdldERheSA9IGNhbGxCb3VuZCgnRGF0ZS5wcm90b3R5cGUuZ2V0RGF5Jyk7XG4vKiogQHR5cGUge2ltcG9ydCgnLicpfSAqL1xudmFyIHRyeURhdGVPYmplY3QgPSBmdW5jdGlvbiB0cnlEYXRlR2V0RGF5Q2FsbCh2YWx1ZSkge1xuXHR0cnkge1xuXHRcdGdldERheSh2YWx1ZSk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn07XG5cbi8qKiBAdHlwZSB7KHZhbHVlOiB1bmtub3duKSA9PiBzdHJpbmd9ICovXG52YXIgdG9TdHIgPSBjYWxsQm91bmQoJ09iamVjdC5wcm90b3R5cGUudG9TdHJpbmcnKTtcbnZhciBkYXRlQ2xhc3MgPSAnW29iamVjdCBEYXRlXSc7XG52YXIgaGFzVG9TdHJpbmdUYWcgPSByZXF1aXJlKCdoYXMtdG9zdHJpbmd0YWcvc2hhbXMnKSgpO1xuXG4vKiogQHR5cGUge2ltcG9ydCgnLicpfSAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0RhdGVPYmplY3QodmFsdWUpIHtcblx0aWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcgfHwgdmFsdWUgPT09IG51bGwpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIGhhc1RvU3RyaW5nVGFnID8gdHJ5RGF0ZU9iamVjdCh2YWx1ZSkgOiB0b1N0cih2YWx1ZSkgPT09IGRhdGVDbGFzcztcbn07XG4iXSwibmFtZXMiOlsiY2FsbEJvdW5kIiwicmVxdWlyZSIsImdldERheSIsInRyeURhdGVPYmplY3QiLCJ0cnlEYXRlR2V0RGF5Q2FsbCIsInZhbHVlIiwiZSIsInRvU3RyIiwiZGF0ZUNsYXNzIiwiaGFzVG9TdHJpbmdUYWciLCJtb2R1bGUiLCJleHBvcnRzIiwiaXNEYXRlT2JqZWN0Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/is-date-object/index.js\n");

/***/ })

};
;