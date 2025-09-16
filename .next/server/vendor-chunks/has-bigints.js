"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/has-bigints";
exports.ids = ["vendor-chunks/has-bigints"];
exports.modules = {

/***/ "(rsc)/./node_modules/has-bigints/index.js":
/*!*******************************************!*\
  !*** ./node_modules/has-bigints/index.js ***!
  \*******************************************/
/***/ ((module) => {

eval("\nvar $BigInt = typeof BigInt !== \"undefined\" && BigInt;\n/** @type {import('.')} */ module.exports = function hasNativeBigInts() {\n    return typeof $BigInt === \"function\" && typeof BigInt === \"function\" && typeof $BigInt(42) === \"bigint\" // eslint-disable-line no-magic-numbers\n     && typeof BigInt(42) === \"bigint\"; // eslint-disable-line no-magic-numbers\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaGFzLWJpZ2ludHMvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFFQSxJQUFJQSxVQUFVLE9BQU9DLFdBQVcsZUFBZUE7QUFFL0Msd0JBQXdCLEdBQ3hCQyxPQUFPQyxPQUFPLEdBQUcsU0FBU0M7SUFDekIsT0FBTyxPQUFPSixZQUFZLGNBQ3RCLE9BQU9DLFdBQVcsY0FDbEIsT0FBT0QsUUFBUSxRQUFRLFNBQVMsdUNBQXVDO1FBQ3ZFLE9BQU9DLE9BQU8sUUFBUSxVQUFVLHVDQUF1QztBQUM1RSIsInNvdXJjZXMiOlsid2VicGFjazovL2NpdmlsLWVuZ2luZWVyaW5nLXBsYXRmb3JtLy4vbm9kZV9tb2R1bGVzL2hhcy1iaWdpbnRzL2luZGV4LmpzPzcxYzkiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgJEJpZ0ludCA9IHR5cGVvZiBCaWdJbnQgIT09ICd1bmRlZmluZWQnICYmIEJpZ0ludDtcblxuLyoqIEB0eXBlIHtpbXBvcnQoJy4nKX0gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaGFzTmF0aXZlQmlnSW50cygpIHtcblx0cmV0dXJuIHR5cGVvZiAkQmlnSW50ID09PSAnZnVuY3Rpb24nXG5cdFx0JiYgdHlwZW9mIEJpZ0ludCA9PT0gJ2Z1bmN0aW9uJ1xuXHRcdCYmIHR5cGVvZiAkQmlnSW50KDQyKSA9PT0gJ2JpZ2ludCcgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1tYWdpYy1udW1iZXJzXG5cdFx0JiYgdHlwZW9mIEJpZ0ludCg0MikgPT09ICdiaWdpbnQnOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLW1hZ2ljLW51bWJlcnNcbn07XG4iXSwibmFtZXMiOlsiJEJpZ0ludCIsIkJpZ0ludCIsIm1vZHVsZSIsImV4cG9ydHMiLCJoYXNOYXRpdmVCaWdJbnRzIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/has-bigints/index.js\n");

/***/ })

};
;