"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-bigint";
exports.ids = ["vendor-chunks/is-bigint"];
exports.modules = {

/***/ "(rsc)/./node_modules/is-bigint/index.js":
/*!*****************************************!*\
  !*** ./node_modules/is-bigint/index.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nvar hasBigInts = __webpack_require__(/*! has-bigints */ \"(rsc)/./node_modules/has-bigints/index.js\")();\nif (hasBigInts) {\n    var bigIntValueOf = BigInt.prototype.valueOf;\n    /** @type {(value: object) => value is BigInt} */ var tryBigInt = function tryBigIntObject(value) {\n        try {\n            bigIntValueOf.call(value);\n            return true;\n        } catch (e) {}\n        return false;\n    };\n    /** @type {import('.')} */ module.exports = function isBigInt(value) {\n        if (value === null || typeof value === \"undefined\" || typeof value === \"boolean\" || typeof value === \"string\" || typeof value === \"number\" || typeof value === \"symbol\" || typeof value === \"function\") {\n            return false;\n        }\n        if (typeof value === \"bigint\") {\n            return true;\n        }\n        return tryBigInt(value);\n    };\n} else {\n    /** @type {import('.')} */ module.exports = function isBigInt(value) {\n        return  false && 0;\n    };\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaXMtYmlnaW50L2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFBO0FBRUEsSUFBSUEsYUFBYUMsbUJBQU9BLENBQUM7QUFFekIsSUFBSUQsWUFBWTtJQUNmLElBQUlFLGdCQUFnQkMsT0FBT0MsU0FBUyxDQUFDQyxPQUFPO0lBQzVDLCtDQUErQyxHQUMvQyxJQUFJQyxZQUFZLFNBQVNDLGdCQUFnQkMsS0FBSztRQUM3QyxJQUFJO1lBQ0hOLGNBQWNPLElBQUksQ0FBQ0Q7WUFDbkIsT0FBTztRQUNSLEVBQUUsT0FBT0UsR0FBRyxDQUNaO1FBQ0EsT0FBTztJQUNSO0lBRUEsd0JBQXdCLEdBQ3hCQyxPQUFPQyxPQUFPLEdBQUcsU0FBU0MsU0FBU0wsS0FBSztRQUN2QyxJQUNDQSxVQUFVLFFBQ1AsT0FBT0EsVUFBVSxlQUNqQixPQUFPQSxVQUFVLGFBQ2pCLE9BQU9BLFVBQVUsWUFDakIsT0FBT0EsVUFBVSxZQUNqQixPQUFPQSxVQUFVLFlBQ2pCLE9BQU9BLFVBQVUsWUFDbkI7WUFDRCxPQUFPO1FBQ1I7UUFDQSxJQUFJLE9BQU9BLFVBQVUsVUFBVTtZQUM5QixPQUFPO1FBQ1I7UUFFQSxPQUFPRixVQUFVRTtJQUNsQjtBQUNELE9BQU87SUFDTix3QkFBd0IsR0FDeEJHLE9BQU9DLE9BQU8sR0FBRyxTQUFTQyxTQUFTTCxLQUFLO1FBQ3ZDLE9BQU8sTUFBSyxJQUFJQSxDQUFLQTtJQUN0QjtBQUNEIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vLi9ub2RlX21vZHVsZXMvaXMtYmlnaW50L2luZGV4LmpzP2NhMzciXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGFzQmlnSW50cyA9IHJlcXVpcmUoJ2hhcy1iaWdpbnRzJykoKTtcblxuaWYgKGhhc0JpZ0ludHMpIHtcblx0dmFyIGJpZ0ludFZhbHVlT2YgPSBCaWdJbnQucHJvdG90eXBlLnZhbHVlT2Y7XG5cdC8qKiBAdHlwZSB7KHZhbHVlOiBvYmplY3QpID0+IHZhbHVlIGlzIEJpZ0ludH0gKi9cblx0dmFyIHRyeUJpZ0ludCA9IGZ1bmN0aW9uIHRyeUJpZ0ludE9iamVjdCh2YWx1ZSkge1xuXHRcdHRyeSB7XG5cdFx0XHRiaWdJbnRWYWx1ZU9mLmNhbGwodmFsdWUpO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH07XG5cblx0LyoqIEB0eXBlIHtpbXBvcnQoJy4nKX0gKi9cblx0bW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0JpZ0ludCh2YWx1ZSkge1xuXHRcdGlmIChcblx0XHRcdHZhbHVlID09PSBudWxsXG5cdFx0XHR8fCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnXG5cdFx0XHR8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJ1xuXHRcdFx0fHwgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJ1xuXHRcdFx0fHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJ1xuXHRcdFx0fHwgdHlwZW9mIHZhbHVlID09PSAnc3ltYm9sJ1xuXHRcdFx0fHwgdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nXG5cdFx0KSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgdmFsdWUgPT09ICdiaWdpbnQnKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ5QmlnSW50KHZhbHVlKTtcblx0fTtcbn0gZWxzZSB7XG5cdC8qKiBAdHlwZSB7aW1wb3J0KCcuJyl9ICovXG5cdG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCaWdJbnQodmFsdWUpIHtcblx0XHRyZXR1cm4gZmFsc2UgJiYgdmFsdWU7XG5cdH07XG59XG4iXSwibmFtZXMiOlsiaGFzQmlnSW50cyIsInJlcXVpcmUiLCJiaWdJbnRWYWx1ZU9mIiwiQmlnSW50IiwicHJvdG90eXBlIiwidmFsdWVPZiIsInRyeUJpZ0ludCIsInRyeUJpZ0ludE9iamVjdCIsInZhbHVlIiwiY2FsbCIsImUiLCJtb2R1bGUiLCJleHBvcnRzIiwiaXNCaWdJbnQiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/is-bigint/index.js\n");

/***/ })

};
;