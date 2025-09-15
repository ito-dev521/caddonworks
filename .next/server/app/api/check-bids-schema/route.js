"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/check-bids-schema/route";
exports.ids = ["app/api/check-bids-schema/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fcheck-bids-schema%2Froute&page=%2Fapi%2Fcheck-bids-schema%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcheck-bids-schema%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fcheck-bids-schema%2Froute&page=%2Fapi%2Fcheck-bids-schema%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcheck-bids-schema%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   headerHooks: () => (/* binding */ headerHooks),\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage),\n/* harmony export */   staticGenerationBailout: () => (/* binding */ staticGenerationBailout)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_sayuri_caddonworks_src_app_api_check_bids_schema_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./src/app/api/check-bids-schema/route.ts */ \"(rsc)/./src/app/api/check-bids-schema/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/check-bids-schema/route\",\n        pathname: \"/api/check-bids-schema\",\n        filename: \"route\",\n        bundlePath: \"app/api/check-bids-schema/route\"\n    },\n    resolvedPagePath: \"/Users/sayuri/caddonworks/src/app/api/check-bids-schema/route.ts\",\n    nextConfigOutput,\n    userland: _Users_sayuri_caddonworks_src_app_api_check_bids_schema_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks, headerHooks, staticGenerationBailout } = routeModule;\nconst originalPathname = \"/api/check-bids-schema/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZjaGVjay1iaWRzLXNjaGVtYSUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGY2hlY2stYmlkcy1zY2hlbWElMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZjaGVjay1iaWRzLXNjaGVtYSUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRnNheXVyaSUyRmNhZGRvbndvcmtzJTJGc3JjJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRnNheXVyaSUyRmNhZGRvbndvcmtzJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFzRztBQUN2QztBQUNjO0FBQ2dCO0FBQzdGO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixnSEFBbUI7QUFDM0M7QUFDQSxjQUFjLHlFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsdUdBQXVHO0FBQy9HO0FBQ0E7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDNko7O0FBRTdKIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vPzVkODciXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL3NheXVyaS9jYWRkb253b3Jrcy9zcmMvYXBwL2FwaS9jaGVjay1iaWRzLXNjaGVtYS9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvY2hlY2stYmlkcy1zY2hlbWEvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9jaGVjay1iaWRzLXNjaGVtYVwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvY2hlY2stYmlkcy1zY2hlbWEvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvc2F5dXJpL2NhZGRvbndvcmtzL3NyYy9hcHAvYXBpL2NoZWNrLWJpZHMtc2NoZW1hL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIGhlYWRlckhvb2tzLCBzdGF0aWNHZW5lcmF0aW9uQmFpbG91dCB9ID0gcm91dGVNb2R1bGU7XG5jb25zdCBvcmlnaW5hbFBhdGhuYW1lID0gXCIvYXBpL2NoZWNrLWJpZHMtc2NoZW1hL3JvdXRlXCI7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHNlcnZlckhvb2tzLFxuICAgICAgICBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIGhlYWRlckhvb2tzLCBzdGF0aWNHZW5lcmF0aW9uQmFpbG91dCwgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fcheck-bids-schema%2Froute&page=%2Fapi%2Fcheck-bids-schema%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcheck-bids-schema%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./src/app/api/check-bids-schema/route.ts":
/*!************************************************!*\
  !*** ./src/app/api/check-bids-schema/route.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/web/exports/next-response */ \"(rsc)/./node_modules/next/dist/server/web/exports/next-response.js\");\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/module/index.js\");\n\n\nconst supabaseAdmin = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__.createClient)(\"https://rxnozwuamddqlcwysxag.supabase.co\", process.env.SUPABASE_SERVICE_ROLE_KEY, {\n    auth: {\n        autoRefreshToken: false,\n        persistSession: false\n    }\n});\nasync function GET(request) {\n    try {\n        console.log(\"bidsテーブル構造確認開始\");\n        // bidsテーブルの構造を確認\n        const { data: tableInfo, error: tableError } = await supabaseAdmin.from(\"bids\").select(\"*\").limit(1);\n        if (tableError) {\n            console.error(\"bidsテーブル確認エラー:\", tableError);\n            return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n                error: \"bidsテーブルの確認に失敗しました\",\n                details: tableError.message\n            }, {\n                status: 500\n            });\n        }\n        // テーブルの列情報を取得（サンプルデータから推測）\n        const columns = tableInfo?.[0] ? Object.keys(tableInfo[0]) : [];\n        // サンプルデータを取得\n        const { data: sampleData, error: sampleError } = await supabaseAdmin.from(\"bids\").select(\"*\").limit(3);\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            tableExists: true,\n            columns: columns,\n            sampleData: sampleData || [],\n            rowCount: sampleData?.length || 0,\n            hasBudgetApproved: tableInfo?.[0] ? \"budget_approved\" in tableInfo[0] : false\n        }, {\n            status: 200\n        });\n    } catch (error) {\n        console.error(\"bidsテーブル確認エラー:\", error);\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            error: \"サーバーエラーが発生しました\",\n            details: error instanceof Error ? error.message : \"不明なエラー\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS9jaGVjay1iaWRzLXNjaGVtYS9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBdUQ7QUFDSDtBQUVwRCxNQUFNRSxnQkFBZ0JELG1FQUFZQSxDQUNoQ0UsMENBQW9DLEVBQ3BDQSxRQUFRQyxHQUFHLENBQUNFLHlCQUF5QixFQUNyQztJQUNFQyxNQUFNO1FBQ0pDLGtCQUFrQjtRQUNsQkMsZ0JBQWdCO0lBQ2xCO0FBQ0Y7QUFHSyxlQUFlQyxJQUFJQyxPQUFvQjtJQUM1QyxJQUFJO1FBQ0ZDLFFBQVFDLEdBQUcsQ0FBQztRQUVaLGlCQUFpQjtRQUNqQixNQUFNLEVBQUVDLE1BQU1DLFNBQVMsRUFBRUMsT0FBT0MsVUFBVSxFQUFFLEdBQUcsTUFBTWYsY0FDbERnQixJQUFJLENBQUMsUUFDTEMsTUFBTSxDQUFDLEtBQ1BDLEtBQUssQ0FBQztRQUVULElBQUlILFlBQVk7WUFDZEwsUUFBUUksS0FBSyxDQUFDLGtCQUFrQkM7WUFDaEMsT0FBT2pCLGtGQUFZQSxDQUFDcUIsSUFBSSxDQUFDO2dCQUN2QkwsT0FBTztnQkFDUE0sU0FBU0wsV0FBV00sT0FBTztZQUM3QixHQUFHO2dCQUFFQyxRQUFRO1lBQUk7UUFDbkI7UUFFQSwyQkFBMkI7UUFDM0IsTUFBTUMsVUFBVVYsV0FBVyxDQUFDLEVBQUUsR0FBR1csT0FBT0MsSUFBSSxDQUFDWixTQUFTLENBQUMsRUFBRSxJQUFJLEVBQUU7UUFFL0QsYUFBYTtRQUNiLE1BQU0sRUFBRUQsTUFBTWMsVUFBVSxFQUFFWixPQUFPYSxXQUFXLEVBQUUsR0FBRyxNQUFNM0IsY0FDcERnQixJQUFJLENBQUMsUUFDTEMsTUFBTSxDQUFDLEtBQ1BDLEtBQUssQ0FBQztRQUVULE9BQU9wQixrRkFBWUEsQ0FBQ3FCLElBQUksQ0FBQztZQUN2QlMsYUFBYTtZQUNiTCxTQUFTQTtZQUNURyxZQUFZQSxjQUFjLEVBQUU7WUFDNUJHLFVBQVVILFlBQVlJLFVBQVU7WUFDaENDLG1CQUFtQmxCLFdBQVcsQ0FBQyxFQUFFLEdBQUcscUJBQXFCQSxTQUFTLENBQUMsRUFBRSxHQUFHO1FBQzFFLEdBQUc7WUFBRVMsUUFBUTtRQUFJO0lBRW5CLEVBQUUsT0FBT1IsT0FBTztRQUNkSixRQUFRSSxLQUFLLENBQUMsa0JBQWtCQTtRQUNoQyxPQUFPaEIsa0ZBQVlBLENBQUNxQixJQUFJLENBQUM7WUFDdkJMLE9BQU87WUFDUE0sU0FBU04saUJBQWlCa0IsUUFBUWxCLE1BQU1PLE9BQU8sR0FBRztRQUNwRCxHQUFHO1lBQUVDLFFBQVE7UUFBSTtJQUNuQjtBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vLi9zcmMvYXBwL2FwaS9jaGVjay1iaWRzLXNjaGVtYS9yb3V0ZS50cz8zYjQwIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRSZXF1ZXN0LCBOZXh0UmVzcG9uc2UgfSBmcm9tICduZXh0L3NlcnZlcidcbmltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcydcblxuY29uc3Qgc3VwYWJhc2VBZG1pbiA9IGNyZWF0ZUNsaWVudChcbiAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMISxcbiAgcHJvY2Vzcy5lbnYuU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSEsXG4gIHtcbiAgICBhdXRoOiB7XG4gICAgICBhdXRvUmVmcmVzaFRva2VuOiBmYWxzZSxcbiAgICAgIHBlcnNpc3RTZXNzaW9uOiBmYWxzZVxuICAgIH1cbiAgfVxuKVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gR0VUKHJlcXVlc3Q6IE5leHRSZXF1ZXN0KSB7XG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coJ2JpZHPjg4bjg7zjg5bjg6vmp4vpgKDnorroqo3plovlp4snKVxuXG4gICAgLy8gYmlkc+ODhuODvOODluODq+OBruani+mAoOOCkueiuuiqjVxuICAgIGNvbnN0IHsgZGF0YTogdGFibGVJbmZvLCBlcnJvcjogdGFibGVFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pblxuICAgICAgLmZyb20oJ2JpZHMnKVxuICAgICAgLnNlbGVjdCgnKicpXG4gICAgICAubGltaXQoMSlcblxuICAgIGlmICh0YWJsZUVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdiaWRz44OG44O844OW44Or56K66KqN44Ko44Op44O8OicsIHRhYmxlRXJyb3IpXG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oe1xuICAgICAgICBlcnJvcjogJ2JpZHPjg4bjg7zjg5bjg6vjga7norroqo3jgavlpLHmlZfjgZfjgb7jgZfjgZ8nLFxuICAgICAgICBkZXRhaWxzOiB0YWJsZUVycm9yLm1lc3NhZ2VcbiAgICAgIH0sIHsgc3RhdHVzOiA1MDAgfSlcbiAgICB9XG5cbiAgICAvLyDjg4bjg7zjg5bjg6vjga7liJfmg4XloLHjgpLlj5blvpfvvIjjgrXjg7Pjg5fjg6vjg4fjg7zjgr/jgYvjgonmjqjmuKzvvIlcbiAgICBjb25zdCBjb2x1bW5zID0gdGFibGVJbmZvPy5bMF0gPyBPYmplY3Qua2V5cyh0YWJsZUluZm9bMF0pIDogW11cblxuICAgIC8vIOOCteODs+ODl+ODq+ODh+ODvOOCv+OCkuWPluW+l1xuICAgIGNvbnN0IHsgZGF0YTogc2FtcGxlRGF0YSwgZXJyb3I6IHNhbXBsZUVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluXG4gICAgICAuZnJvbSgnYmlkcycpXG4gICAgICAuc2VsZWN0KCcqJylcbiAgICAgIC5saW1pdCgzKVxuXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHtcbiAgICAgIHRhYmxlRXhpc3RzOiB0cnVlLFxuICAgICAgY29sdW1uczogY29sdW1ucyxcbiAgICAgIHNhbXBsZURhdGE6IHNhbXBsZURhdGEgfHwgW10sXG4gICAgICByb3dDb3VudDogc2FtcGxlRGF0YT8ubGVuZ3RoIHx8IDAsXG4gICAgICBoYXNCdWRnZXRBcHByb3ZlZDogdGFibGVJbmZvPy5bMF0gPyAnYnVkZ2V0X2FwcHJvdmVkJyBpbiB0YWJsZUluZm9bMF0gOiBmYWxzZVxuICAgIH0sIHsgc3RhdHVzOiAyMDAgfSlcblxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ2JpZHPjg4bjg7zjg5bjg6vnorroqo3jgqjjg6njg7w6JywgZXJyb3IpXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHtcbiAgICAgIGVycm9yOiAn44K144O844OQ44O844Ko44Op44O844GM55m655Sf44GX44G+44GX44GfJyxcbiAgICAgIGRldGFpbHM6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ+S4jeaYjuOBquOCqOODqeODvCdcbiAgICB9LCB7IHN0YXR1czogNTAwIH0pXG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJjcmVhdGVDbGllbnQiLCJzdXBhYmFzZUFkbWluIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCIsIlNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkiLCJhdXRoIiwiYXV0b1JlZnJlc2hUb2tlbiIsInBlcnNpc3RTZXNzaW9uIiwiR0VUIiwicmVxdWVzdCIsImNvbnNvbGUiLCJsb2ciLCJkYXRhIiwidGFibGVJbmZvIiwiZXJyb3IiLCJ0YWJsZUVycm9yIiwiZnJvbSIsInNlbGVjdCIsImxpbWl0IiwianNvbiIsImRldGFpbHMiLCJtZXNzYWdlIiwic3RhdHVzIiwiY29sdW1ucyIsIk9iamVjdCIsImtleXMiLCJzYW1wbGVEYXRhIiwic2FtcGxlRXJyb3IiLCJ0YWJsZUV4aXN0cyIsInJvd0NvdW50IiwibGVuZ3RoIiwiaGFzQnVkZ2V0QXBwcm92ZWQiLCJFcnJvciJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/check-bids-schema/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fcheck-bids-schema%2Froute&page=%2Fapi%2Fcheck-bids-schema%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fcheck-bids-schema%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();