"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-shared-array-buffer";
exports.ids = ["vendor-chunks/is-shared-array-buffer"];
exports.modules = {

/***/ "(rsc)/./node_modules/is-shared-array-buffer/index.js":
/*!******************************************************!*\
  !*** ./node_modules/is-shared-array-buffer/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nvar callBound = __webpack_require__(/*! call-bound */ \"(rsc)/./node_modules/call-bound/index.js\");\n/** @type {undefined | ((thisArg: SharedArrayBuffer) => number)} */ var $byteLength = callBound(\"SharedArrayBuffer.prototype.byteLength\", true);\n/** @type {import('.')} */ module.exports = $byteLength ? function isSharedArrayBuffer(obj) {\n    if (!obj || typeof obj !== \"object\") {\n        return false;\n    }\n    try {\n        // @ts-expect-error TS can't figure out this closed-over variable is non-nullable, and it's fine that `obj` might not be a SAB\n        $byteLength(obj);\n        return true;\n    } catch (e) {\n        return false;\n    }\n} : function isSharedArrayBuffer(_obj) {\n    return false;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaXMtc2hhcmVkLWFycmF5LWJ1ZmZlci9pbmRleC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUVBLElBQUlBLFlBQVlDLG1CQUFPQSxDQUFDO0FBRXhCLGlFQUFpRSxHQUNqRSxJQUFJQyxjQUFjRixVQUFVLDBDQUEwQztBQUV0RSx3QkFBd0IsR0FDeEJHLE9BQU9DLE9BQU8sR0FBR0YsY0FDZCxTQUFTRyxvQkFBb0JDLEdBQUc7SUFDakMsSUFBSSxDQUFDQSxPQUFPLE9BQU9BLFFBQVEsVUFBVTtRQUNwQyxPQUFPO0lBQ1I7SUFDQSxJQUFJO1FBQ0gsOEhBQThIO1FBQzlISixZQUFZSTtRQUNaLE9BQU87SUFDUixFQUFFLE9BQU9DLEdBQUc7UUFDWCxPQUFPO0lBQ1I7QUFDRCxJQUNFLFNBQVNGLG9CQUFvQkcsSUFBSTtJQUNsQyxPQUFPO0FBQ1IiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jaXZpbC1lbmdpbmVlcmluZy1wbGF0Zm9ybS8uL25vZGVfbW9kdWxlcy9pcy1zaGFyZWQtYXJyYXktYnVmZmVyL2luZGV4LmpzP2Y0ZDMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2FsbEJvdW5kID0gcmVxdWlyZSgnY2FsbC1ib3VuZCcpO1xuXG4vKiogQHR5cGUge3VuZGVmaW5lZCB8ICgodGhpc0FyZzogU2hhcmVkQXJyYXlCdWZmZXIpID0+IG51bWJlcil9ICovXG52YXIgJGJ5dGVMZW5ndGggPSBjYWxsQm91bmQoJ1NoYXJlZEFycmF5QnVmZmVyLnByb3RvdHlwZS5ieXRlTGVuZ3RoJywgdHJ1ZSk7XG5cbi8qKiBAdHlwZSB7aW1wb3J0KCcuJyl9ICovXG5tb2R1bGUuZXhwb3J0cyA9ICRieXRlTGVuZ3RoXG5cdD8gZnVuY3Rpb24gaXNTaGFyZWRBcnJheUJ1ZmZlcihvYmopIHtcblx0XHRpZiAoIW9iaiB8fCB0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHR0cnkge1xuXHRcdFx0Ly8gQHRzLWV4cGVjdC1lcnJvciBUUyBjYW4ndCBmaWd1cmUgb3V0IHRoaXMgY2xvc2VkLW92ZXIgdmFyaWFibGUgaXMgbm9uLW51bGxhYmxlLCBhbmQgaXQncyBmaW5lIHRoYXQgYG9iamAgbWlnaHQgbm90IGJlIGEgU0FCXG5cdFx0XHQkYnl0ZUxlbmd0aChvYmopO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXHQ6IGZ1bmN0aW9uIGlzU2hhcmVkQXJyYXlCdWZmZXIoX29iaikgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVudXNlZC12YXJzXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9O1xuIl0sIm5hbWVzIjpbImNhbGxCb3VuZCIsInJlcXVpcmUiLCIkYnl0ZUxlbmd0aCIsIm1vZHVsZSIsImV4cG9ydHMiLCJpc1NoYXJlZEFycmF5QnVmZmVyIiwib2JqIiwiZSIsIl9vYmoiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/is-shared-array-buffer/index.js\n");

/***/ })

};
;