"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/universalify";
exports.ids = ["vendor-chunks/universalify"];
exports.modules = {

/***/ "(rsc)/./node_modules/universalify/index.js":
/*!********************************************!*\
  !*** ./node_modules/universalify/index.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports) => {

eval("\nexports.fromCallback = function(fn) {\n    return Object.defineProperty(function() {\n        if (typeof arguments[arguments.length - 1] === \"function\") fn.apply(this, arguments);\n        else {\n            return new Promise((resolve, reject)=>{\n                arguments[arguments.length] = (err, res)=>{\n                    if (err) return reject(err);\n                    resolve(res);\n                };\n                arguments.length++;\n                fn.apply(this, arguments);\n            });\n        }\n    }, \"name\", {\n        value: fn.name\n    });\n};\nexports.fromPromise = function(fn) {\n    return Object.defineProperty(function() {\n        const cb = arguments[arguments.length - 1];\n        if (typeof cb !== \"function\") return fn.apply(this, arguments);\n        else fn.apply(this, arguments).then((r)=>cb(null, r), cb);\n    }, \"name\", {\n        value: fn.name\n    });\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvdW5pdmVyc2FsaWZ5L2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFBO0FBRUFBLG9CQUFvQixHQUFHLFNBQVVFLEVBQUU7SUFDakMsT0FBT0MsT0FBT0MsY0FBYyxDQUFDO1FBQzNCLElBQUksT0FBT0MsU0FBUyxDQUFDQSxVQUFVQyxNQUFNLEdBQUcsRUFBRSxLQUFLLFlBQVlKLEdBQUdLLEtBQUssQ0FBQyxJQUFJLEVBQUVGO2FBQ3JFO1lBQ0gsT0FBTyxJQUFJRyxRQUFRLENBQUNDLFNBQVNDO2dCQUMzQkwsU0FBUyxDQUFDQSxVQUFVQyxNQUFNLENBQUMsR0FBRyxDQUFDSyxLQUFLQztvQkFDbEMsSUFBSUQsS0FBSyxPQUFPRCxPQUFPQztvQkFDdkJGLFFBQVFHO2dCQUNWO2dCQUNBUCxVQUFVQyxNQUFNO2dCQUNoQkosR0FBR0ssS0FBSyxDQUFDLElBQUksRUFBRUY7WUFDakI7UUFDRjtJQUNGLEdBQUcsUUFBUTtRQUFFUSxPQUFPWCxHQUFHWSxJQUFJO0lBQUM7QUFDOUI7QUFFQWQsbUJBQW1CLEdBQUcsU0FBVUUsRUFBRTtJQUNoQyxPQUFPQyxPQUFPQyxjQUFjLENBQUM7UUFDM0IsTUFBTVksS0FBS1gsU0FBUyxDQUFDQSxVQUFVQyxNQUFNLEdBQUcsRUFBRTtRQUMxQyxJQUFJLE9BQU9VLE9BQU8sWUFBWSxPQUFPZCxHQUFHSyxLQUFLLENBQUMsSUFBSSxFQUFFRjthQUMvQ0gsR0FBR0ssS0FBSyxDQUFDLElBQUksRUFBRUYsV0FBV1ksSUFBSSxDQUFDQyxDQUFBQSxJQUFLRixHQUFHLE1BQU1FLElBQUlGO0lBQ3hELEdBQUcsUUFBUTtRQUFFSCxPQUFPWCxHQUFHWSxJQUFJO0lBQUM7QUFDOUIiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jaXZpbC1lbmdpbmVlcmluZy1wbGF0Zm9ybS8uL25vZGVfbW9kdWxlcy91bml2ZXJzYWxpZnkvaW5kZXguanM/YmIxYyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxuZXhwb3J0cy5mcm9tQ2FsbGJhY2sgPSBmdW5jdGlvbiAoZm4pIHtcbiAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdID09PSAnZnVuY3Rpb24nKSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aF0gPSAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gcmVqZWN0KGVycilcbiAgICAgICAgICByZXNvbHZlKHJlcylcbiAgICAgICAgfVxuICAgICAgICBhcmd1bWVudHMubGVuZ3RoKytcbiAgICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgfSlcbiAgICB9XG4gIH0sICduYW1lJywgeyB2YWx1ZTogZm4ubmFtZSB9KVxufVxuXG5leHBvcnRzLmZyb21Qcm9taXNlID0gZnVuY3Rpb24gKGZuKSB7XG4gIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoZnVuY3Rpb24gKCkge1xuICAgIGNvbnN0IGNiID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXVxuICAgIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicpIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgZWxzZSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpLnRoZW4ociA9PiBjYihudWxsLCByKSwgY2IpXG4gIH0sICduYW1lJywgeyB2YWx1ZTogZm4ubmFtZSB9KVxufVxuIl0sIm5hbWVzIjpbImV4cG9ydHMiLCJmcm9tQ2FsbGJhY2siLCJmbiIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiYXJndW1lbnRzIiwibGVuZ3RoIiwiYXBwbHkiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImVyciIsInJlcyIsInZhbHVlIiwibmFtZSIsImZyb21Qcm9taXNlIiwiY2IiLCJ0aGVuIiwiciJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/universalify/index.js\n");

/***/ })

};
;