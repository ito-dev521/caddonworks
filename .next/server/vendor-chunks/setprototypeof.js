"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/setprototypeof";
exports.ids = ["vendor-chunks/setprototypeof"];
exports.modules = {

/***/ "(rsc)/./node_modules/setprototypeof/index.js":
/*!**********************************************!*\
  !*** ./node_modules/setprototypeof/index.js ***!
  \**********************************************/
/***/ ((module) => {

eval("\n/* eslint no-proto: 0 */ module.exports = Object.setPrototypeOf || (({\n    __proto__: []\n}) instanceof Array ? setProtoOf : mixinProperties);\nfunction setProtoOf(obj, proto) {\n    obj.__proto__ = proto;\n    return obj;\n}\nfunction mixinProperties(obj, proto) {\n    for(var prop in proto){\n        if (!Object.prototype.hasOwnProperty.call(obj, prop)) {\n            obj[prop] = proto[prop];\n        }\n    }\n    return obj;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvc2V0cHJvdG90eXBlb2YvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFDQSxzQkFBc0IsR0FDdEJBLE9BQU9DLE9BQU8sR0FBR0MsT0FBT0MsY0FBYyxJQUFLO0lBQUVDLFdBQVcsRUFBRTtBQUFDLGNBQWFDLFFBQVFDLGFBQWFDLGVBQWM7QUFFM0csU0FBU0QsV0FBWUUsR0FBRyxFQUFFQyxLQUFLO0lBQzdCRCxJQUFJSixTQUFTLEdBQUdLO0lBQ2hCLE9BQU9EO0FBQ1Q7QUFFQSxTQUFTRCxnQkFBaUJDLEdBQUcsRUFBRUMsS0FBSztJQUNsQyxJQUFLLElBQUlDLFFBQVFELE1BQU87UUFDdEIsSUFBSSxDQUFDUCxPQUFPUyxTQUFTLENBQUNDLGNBQWMsQ0FBQ0MsSUFBSSxDQUFDTCxLQUFLRSxPQUFPO1lBQ3BERixHQUFHLENBQUNFLEtBQUssR0FBR0QsS0FBSyxDQUFDQyxLQUFLO1FBQ3pCO0lBQ0Y7SUFDQSxPQUFPRjtBQUNUIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vLi9ub2RlX21vZHVsZXMvc2V0cHJvdG90eXBlb2YvaW5kZXguanM/Y2MzYiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcbi8qIGVzbGludCBuby1wcm90bzogMCAqL1xubW9kdWxlLmV4cG9ydHMgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgPyBzZXRQcm90b09mIDogbWl4aW5Qcm9wZXJ0aWVzKVxuXG5mdW5jdGlvbiBzZXRQcm90b09mIChvYmosIHByb3RvKSB7XG4gIG9iai5fX3Byb3RvX18gPSBwcm90b1xuICByZXR1cm4gb2JqXG59XG5cbmZ1bmN0aW9uIG1peGluUHJvcGVydGllcyAob2JqLCBwcm90bykge1xuICBmb3IgKHZhciBwcm9wIGluIHByb3RvKSB7XG4gICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkge1xuICAgICAgb2JqW3Byb3BdID0gcHJvdG9bcHJvcF1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9ialxufVxuIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydHMiLCJPYmplY3QiLCJzZXRQcm90b3R5cGVPZiIsIl9fcHJvdG9fXyIsIkFycmF5Iiwic2V0UHJvdG9PZiIsIm1peGluUHJvcGVydGllcyIsIm9iaiIsInByb3RvIiwicHJvcCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/setprototypeof/index.js\n");

/***/ })

};
;