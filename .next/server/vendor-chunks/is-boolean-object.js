"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-boolean-object";
exports.ids = ["vendor-chunks/is-boolean-object"];
exports.modules = {

/***/ "(rsc)/./node_modules/is-boolean-object/index.js":
/*!*************************************************!*\
  !*** ./node_modules/is-boolean-object/index.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nvar callBound = __webpack_require__(/*! call-bound */ \"(rsc)/./node_modules/call-bound/index.js\");\nvar $boolToStr = callBound(\"Boolean.prototype.toString\");\nvar $toString = callBound(\"Object.prototype.toString\");\n/** @type {import('.')} */ var tryBooleanObject = function booleanBrandCheck(value) {\n    try {\n        $boolToStr(value);\n        return true;\n    } catch (e) {\n        return false;\n    }\n};\nvar boolClass = \"[object Boolean]\";\nvar hasToStringTag = __webpack_require__(/*! has-tostringtag/shams */ \"(rsc)/./node_modules/has-tostringtag/shams.js\")();\n/** @type {import('.')} */ module.exports = function isBoolean(value) {\n    if (typeof value === \"boolean\") {\n        return true;\n    }\n    if (value === null || typeof value !== \"object\") {\n        return false;\n    }\n    return hasToStringTag ? tryBooleanObject(value) : $toString(value) === boolClass;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaXMtYm9vbGVhbi1vYmplY3QvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFFQSxJQUFJQSxZQUFZQyxtQkFBT0EsQ0FBQztBQUN4QixJQUFJQyxhQUFhRixVQUFVO0FBQzNCLElBQUlHLFlBQVlILFVBQVU7QUFFMUIsd0JBQXdCLEdBQ3hCLElBQUlJLG1CQUFtQixTQUFTQyxrQkFBa0JDLEtBQUs7SUFDdEQsSUFBSTtRQUNISixXQUFXSTtRQUNYLE9BQU87SUFDUixFQUFFLE9BQU9DLEdBQUc7UUFDWCxPQUFPO0lBQ1I7QUFDRDtBQUNBLElBQUlDLFlBQVk7QUFDaEIsSUFBSUMsaUJBQWlCUixtQkFBT0EsQ0FBQztBQUU3Qix3QkFBd0IsR0FDeEJTLE9BQU9DLE9BQU8sR0FBRyxTQUFTQyxVQUFVTixLQUFLO0lBQ3hDLElBQUksT0FBT0EsVUFBVSxXQUFXO1FBQy9CLE9BQU87SUFDUjtJQUNBLElBQUlBLFVBQVUsUUFBUSxPQUFPQSxVQUFVLFVBQVU7UUFDaEQsT0FBTztJQUNSO0lBQ0EsT0FBT0csaUJBQWlCTCxpQkFBaUJFLFNBQVNILFVBQVVHLFdBQVdFO0FBQ3hFIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vLi9ub2RlX21vZHVsZXMvaXMtYm9vbGVhbi1vYmplY3QvaW5kZXguanM/MTBkYiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciBjYWxsQm91bmQgPSByZXF1aXJlKCdjYWxsLWJvdW5kJyk7XG52YXIgJGJvb2xUb1N0ciA9IGNhbGxCb3VuZCgnQm9vbGVhbi5wcm90b3R5cGUudG9TdHJpbmcnKTtcbnZhciAkdG9TdHJpbmcgPSBjYWxsQm91bmQoJ09iamVjdC5wcm90b3R5cGUudG9TdHJpbmcnKTtcblxuLyoqIEB0eXBlIHtpbXBvcnQoJy4nKX0gKi9cbnZhciB0cnlCb29sZWFuT2JqZWN0ID0gZnVuY3Rpb24gYm9vbGVhbkJyYW5kQ2hlY2sodmFsdWUpIHtcblx0dHJ5IHtcblx0XHQkYm9vbFRvU3RyKHZhbHVlKTtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufTtcbnZhciBib29sQ2xhc3MgPSAnW29iamVjdCBCb29sZWFuXSc7XG52YXIgaGFzVG9TdHJpbmdUYWcgPSByZXF1aXJlKCdoYXMtdG9zdHJpbmd0YWcvc2hhbXMnKSgpO1xuXG4vKiogQHR5cGUge2ltcG9ydCgnLicpfSAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0Jvb2xlYW4odmFsdWUpIHtcblx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblx0aWYgKHZhbHVlID09PSBudWxsIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIGhhc1RvU3RyaW5nVGFnID8gdHJ5Qm9vbGVhbk9iamVjdCh2YWx1ZSkgOiAkdG9TdHJpbmcodmFsdWUpID09PSBib29sQ2xhc3M7XG59O1xuIl0sIm5hbWVzIjpbImNhbGxCb3VuZCIsInJlcXVpcmUiLCIkYm9vbFRvU3RyIiwiJHRvU3RyaW5nIiwidHJ5Qm9vbGVhbk9iamVjdCIsImJvb2xlYW5CcmFuZENoZWNrIiwidmFsdWUiLCJlIiwiYm9vbENsYXNzIiwiaGFzVG9TdHJpbmdUYWciLCJtb2R1bGUiLCJleHBvcnRzIiwiaXNCb29sZWFuIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/is-boolean-object/index.js\n");

/***/ })

};
;