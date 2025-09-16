"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/functions-have-names";
exports.ids = ["vendor-chunks/functions-have-names"];
exports.modules = {

/***/ "(rsc)/./node_modules/functions-have-names/index.js":
/*!****************************************************!*\
  !*** ./node_modules/functions-have-names/index.js ***!
  \****************************************************/
/***/ ((module) => {

eval("\nvar functionsHaveNames = function functionsHaveNames() {\n    return typeof (function f() {}).name === \"string\";\n};\nvar gOPD = Object.getOwnPropertyDescriptor;\nif (gOPD) {\n    try {\n        gOPD([], \"length\");\n    } catch (e) {\n        // IE 8 has a broken gOPD\n        gOPD = null;\n    }\n}\nfunctionsHaveNames.functionsHaveConfigurableNames = function functionsHaveConfigurableNames() {\n    if (!functionsHaveNames() || !gOPD) {\n        return false;\n    }\n    var desc = gOPD(function() {}, \"name\");\n    return !!desc && !!desc.configurable;\n};\nvar $bind = Function.prototype.bind;\nfunctionsHaveNames.boundFunctionsHaveNames = function boundFunctionsHaveNames() {\n    return functionsHaveNames() && typeof $bind === \"function\" && (function f() {}).bind().name !== \"\";\n};\nmodule.exports = functionsHaveNames;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvZnVuY3Rpb25zLWhhdmUtbmFtZXMvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFFQSxJQUFJQSxxQkFBcUIsU0FBU0E7SUFDakMsT0FBTyxPQUFPLFVBQVNDLEtBQUssR0FBRUMsSUFBSSxLQUFLO0FBQ3hDO0FBRUEsSUFBSUMsT0FBT0MsT0FBT0Msd0JBQXdCO0FBQzFDLElBQUlGLE1BQU07SUFDVCxJQUFJO1FBQ0hBLEtBQUssRUFBRSxFQUFFO0lBQ1YsRUFBRSxPQUFPRyxHQUFHO1FBQ1gseUJBQXlCO1FBQ3pCSCxPQUFPO0lBQ1I7QUFDRDtBQUVBSCxtQkFBbUJPLDhCQUE4QixHQUFHLFNBQVNBO0lBQzVELElBQUksQ0FBQ1Asd0JBQXdCLENBQUNHLE1BQU07UUFDbkMsT0FBTztJQUNSO0lBQ0EsSUFBSUssT0FBT0wsS0FBSyxZQUFhLEdBQUc7SUFDaEMsT0FBTyxDQUFDLENBQUNLLFFBQVEsQ0FBQyxDQUFDQSxLQUFLQyxZQUFZO0FBQ3JDO0FBRUEsSUFBSUMsUUFBUUMsU0FBU0MsU0FBUyxDQUFDQyxJQUFJO0FBRW5DYixtQkFBbUJjLHVCQUF1QixHQUFHLFNBQVNBO0lBQ3JELE9BQU9kLHdCQUF3QixPQUFPVSxVQUFVLGNBQWMsVUFBU1QsS0FBSyxHQUFFWSxJQUFJLEdBQUdYLElBQUksS0FBSztBQUMvRjtBQUVBYSxPQUFPQyxPQUFPLEdBQUdoQiIsInNvdXJjZXMiOlsid2VicGFjazovL2NpdmlsLWVuZ2luZWVyaW5nLXBsYXRmb3JtLy4vbm9kZV9tb2R1bGVzL2Z1bmN0aW9ucy1oYXZlLW5hbWVzL2luZGV4LmpzPzhlOTciXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZnVuY3Rpb25zSGF2ZU5hbWVzID0gZnVuY3Rpb24gZnVuY3Rpb25zSGF2ZU5hbWVzKCkge1xuXHRyZXR1cm4gdHlwZW9mIGZ1bmN0aW9uIGYoKSB7fS5uYW1lID09PSAnc3RyaW5nJztcbn07XG5cbnZhciBnT1BEID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbmlmIChnT1BEKSB7XG5cdHRyeSB7XG5cdFx0Z09QRChbXSwgJ2xlbmd0aCcpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0Ly8gSUUgOCBoYXMgYSBicm9rZW4gZ09QRFxuXHRcdGdPUEQgPSBudWxsO1xuXHR9XG59XG5cbmZ1bmN0aW9uc0hhdmVOYW1lcy5mdW5jdGlvbnNIYXZlQ29uZmlndXJhYmxlTmFtZXMgPSBmdW5jdGlvbiBmdW5jdGlvbnNIYXZlQ29uZmlndXJhYmxlTmFtZXMoKSB7XG5cdGlmICghZnVuY3Rpb25zSGF2ZU5hbWVzKCkgfHwgIWdPUEQpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0dmFyIGRlc2MgPSBnT1BEKGZ1bmN0aW9uICgpIHt9LCAnbmFtZScpO1xuXHRyZXR1cm4gISFkZXNjICYmICEhZGVzYy5jb25maWd1cmFibGU7XG59O1xuXG52YXIgJGJpbmQgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZDtcblxuZnVuY3Rpb25zSGF2ZU5hbWVzLmJvdW5kRnVuY3Rpb25zSGF2ZU5hbWVzID0gZnVuY3Rpb24gYm91bmRGdW5jdGlvbnNIYXZlTmFtZXMoKSB7XG5cdHJldHVybiBmdW5jdGlvbnNIYXZlTmFtZXMoKSAmJiB0eXBlb2YgJGJpbmQgPT09ICdmdW5jdGlvbicgJiYgZnVuY3Rpb24gZigpIHt9LmJpbmQoKS5uYW1lICE9PSAnJztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb25zSGF2ZU5hbWVzO1xuIl0sIm5hbWVzIjpbImZ1bmN0aW9uc0hhdmVOYW1lcyIsImYiLCJuYW1lIiwiZ09QRCIsIk9iamVjdCIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImUiLCJmdW5jdGlvbnNIYXZlQ29uZmlndXJhYmxlTmFtZXMiLCJkZXNjIiwiY29uZmlndXJhYmxlIiwiJGJpbmQiLCJGdW5jdGlvbiIsInByb3RvdHlwZSIsImJpbmQiLCJib3VuZEZ1bmN0aW9uc0hhdmVOYW1lcyIsIm1vZHVsZSIsImV4cG9ydHMiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/functions-have-names/index.js\n");

/***/ })

};
;