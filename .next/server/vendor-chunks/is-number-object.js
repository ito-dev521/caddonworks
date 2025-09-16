"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-number-object";
exports.ids = ["vendor-chunks/is-number-object"];
exports.modules = {

/***/ "(rsc)/./node_modules/is-number-object/index.js":
/*!************************************************!*\
  !*** ./node_modules/is-number-object/index.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nvar callBound = __webpack_require__(/*! call-bound */ \"(rsc)/./node_modules/call-bound/index.js\");\nvar $numToStr = callBound(\"Number.prototype.toString\");\n/** @type {import('.')} */ var tryNumberObject = function tryNumberObject(value) {\n    try {\n        $numToStr(value);\n        return true;\n    } catch (e) {\n        return false;\n    }\n};\nvar $toString = callBound(\"Object.prototype.toString\");\nvar numClass = \"[object Number]\";\nvar hasToStringTag = __webpack_require__(/*! has-tostringtag/shams */ \"(rsc)/./node_modules/has-tostringtag/shams.js\")();\n/** @type {import('.')} */ module.exports = function isNumberObject(value) {\n    if (typeof value === \"number\") {\n        return true;\n    }\n    if (!value || typeof value !== \"object\") {\n        return false;\n    }\n    return hasToStringTag ? tryNumberObject(value) : $toString(value) === numClass;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaXMtbnVtYmVyLW9iamVjdC9pbmRleC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUVBLElBQUlBLFlBQVlDLG1CQUFPQSxDQUFDO0FBRXhCLElBQUlDLFlBQVlGLFVBQVU7QUFFMUIsd0JBQXdCLEdBQ3hCLElBQUlHLGtCQUFrQixTQUFTQSxnQkFBZ0JDLEtBQUs7SUFDbkQsSUFBSTtRQUNIRixVQUFVRTtRQUNWLE9BQU87SUFDUixFQUFFLE9BQU9DLEdBQUc7UUFDWCxPQUFPO0lBQ1I7QUFDRDtBQUNBLElBQUlDLFlBQVlOLFVBQVU7QUFDMUIsSUFBSU8sV0FBVztBQUNmLElBQUlDLGlCQUFpQlAsbUJBQU9BLENBQUM7QUFFN0Isd0JBQXdCLEdBQ3hCUSxPQUFPQyxPQUFPLEdBQUcsU0FBU0MsZUFBZVAsS0FBSztJQUM3QyxJQUFJLE9BQU9BLFVBQVUsVUFBVTtRQUM5QixPQUFPO0lBQ1I7SUFDQSxJQUFJLENBQUNBLFNBQVMsT0FBT0EsVUFBVSxVQUFVO1FBQ3hDLE9BQU87SUFDUjtJQUNBLE9BQU9JLGlCQUFpQkwsZ0JBQWdCQyxTQUFTRSxVQUFVRixXQUFXRztBQUN2RSIsInNvdXJjZXMiOlsid2VicGFjazovL2NpdmlsLWVuZ2luZWVyaW5nLXBsYXRmb3JtLy4vbm9kZV9tb2R1bGVzL2lzLW51bWJlci1vYmplY3QvaW5kZXguanM/NGZiMyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbnZhciBjYWxsQm91bmQgPSByZXF1aXJlKCdjYWxsLWJvdW5kJyk7XG5cbnZhciAkbnVtVG9TdHIgPSBjYWxsQm91bmQoJ051bWJlci5wcm90b3R5cGUudG9TdHJpbmcnKTtcblxuLyoqIEB0eXBlIHtpbXBvcnQoJy4nKX0gKi9cbnZhciB0cnlOdW1iZXJPYmplY3QgPSBmdW5jdGlvbiB0cnlOdW1iZXJPYmplY3QodmFsdWUpIHtcblx0dHJ5IHtcblx0XHQkbnVtVG9TdHIodmFsdWUpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59O1xudmFyICR0b1N0cmluZyA9IGNhbGxCb3VuZCgnT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZycpO1xudmFyIG51bUNsYXNzID0gJ1tvYmplY3QgTnVtYmVyXSc7XG52YXIgaGFzVG9TdHJpbmdUYWcgPSByZXF1aXJlKCdoYXMtdG9zdHJpbmd0YWcvc2hhbXMnKSgpO1xuXG4vKiogQHR5cGUge2ltcG9ydCgnLicpfSAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc051bWJlck9iamVjdCh2YWx1ZSkge1xuXHRpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gaGFzVG9TdHJpbmdUYWcgPyB0cnlOdW1iZXJPYmplY3QodmFsdWUpIDogJHRvU3RyaW5nKHZhbHVlKSA9PT0gbnVtQ2xhc3M7XG59O1xuIl0sIm5hbWVzIjpbImNhbGxCb3VuZCIsInJlcXVpcmUiLCIkbnVtVG9TdHIiLCJ0cnlOdW1iZXJPYmplY3QiLCJ2YWx1ZSIsImUiLCIkdG9TdHJpbmciLCJudW1DbGFzcyIsImhhc1RvU3RyaW5nVGFnIiwibW9kdWxlIiwiZXhwb3J0cyIsImlzTnVtYmVyT2JqZWN0Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/is-number-object/index.js\n");

/***/ })

};
;