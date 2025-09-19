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
exports.id = "app/api/debug/project-details/route";
exports.ids = ["app/api/debug/project-details/route"];
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

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fdebug%2Fproject-details%2Froute&page=%2Fapi%2Fdebug%2Fproject-details%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fdebug%2Fproject-details%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fdebug%2Fproject-details%2Froute&page=%2Fapi%2Fdebug%2Fproject-details%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fdebug%2Fproject-details%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   headerHooks: () => (/* binding */ headerHooks),\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage),\n/* harmony export */   staticGenerationBailout: () => (/* binding */ staticGenerationBailout)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_sayuri_caddonworks_src_app_api_debug_project_details_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./src/app/api/debug/project-details/route.ts */ \"(rsc)/./src/app/api/debug/project-details/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/debug/project-details/route\",\n        pathname: \"/api/debug/project-details\",\n        filename: \"route\",\n        bundlePath: \"app/api/debug/project-details/route\"\n    },\n    resolvedPagePath: \"/Users/sayuri/caddonworks/src/app/api/debug/project-details/route.ts\",\n    nextConfigOutput,\n    userland: _Users_sayuri_caddonworks_src_app_api_debug_project_details_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks, headerHooks, staticGenerationBailout } = routeModule;\nconst originalPathname = \"/api/debug/project-details/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZkZWJ1ZyUyRnByb2plY3QtZGV0YWlscyUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGZGVidWclMkZwcm9qZWN0LWRldGFpbHMlMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZkZWJ1ZyUyRnByb2plY3QtZGV0YWlscyUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRnNheXVyaSUyRmNhZGRvbndvcmtzJTJGc3JjJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRnNheXVyaSUyRmNhZGRvbndvcmtzJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFzRztBQUN2QztBQUNjO0FBQ29CO0FBQ2pHO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixnSEFBbUI7QUFDM0M7QUFDQSxjQUFjLHlFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsdUdBQXVHO0FBQy9HO0FBQ0E7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDNko7O0FBRTdKIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vP2U0MmYiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL3NheXVyaS9jYWRkb253b3Jrcy9zcmMvYXBwL2FwaS9kZWJ1Zy9wcm9qZWN0LWRldGFpbHMvcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2RlYnVnL3Byb2plY3QtZGV0YWlscy9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2RlYnVnL3Byb2plY3QtZGV0YWlsc1wiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvZGVidWcvcHJvamVjdC1kZXRhaWxzL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL3NheXVyaS9jYWRkb253b3Jrcy9zcmMvYXBwL2FwaS9kZWJ1Zy9wcm9qZWN0LWRldGFpbHMvcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgaGVhZGVySG9va3MsIHN0YXRpY0dlbmVyYXRpb25CYWlsb3V0IH0gPSByb3V0ZU1vZHVsZTtcbmNvbnN0IG9yaWdpbmFsUGF0aG5hbWUgPSBcIi9hcGkvZGVidWcvcHJvamVjdC1kZXRhaWxzL3JvdXRlXCI7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHNlcnZlckhvb2tzLFxuICAgICAgICBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIGhlYWRlckhvb2tzLCBzdGF0aWNHZW5lcmF0aW9uQmFpbG91dCwgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fdebug%2Fproject-details%2Froute&page=%2Fapi%2Fdebug%2Fproject-details%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fdebug%2Fproject-details%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./src/app/api/debug/project-details/route.ts":
/*!****************************************************!*\
  !*** ./src/app/api/debug/project-details/route.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/web/exports/next-response */ \"(rsc)/./node_modules/next/dist/server/web/exports/next-response.js\");\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/module/index.js\");\n\n\nconst supabaseAdmin = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__.createClient)(\"https://rxnozwuamddqlcwysxag.supabase.co\", process.env.SUPABASE_SERVICE_ROLE_KEY, {\n    auth: {\n        autoRefreshToken: false,\n        persistSession: false\n    }\n});\nasync function GET(request) {\n    try {\n        const { searchParams } = new URL(request.url);\n        const projectId = searchParams.get(\"id\");\n        if (!projectId) {\n            return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n                message: \"プロジェクトIDが必要です\"\n            }, {\n                status: 400\n            });\n        }\n        // 案件の基本情報を取得\n        const { data: project, error: projectError } = await supabaseAdmin.from(\"projects\").select(\"*\").eq(\"id\", projectId).single();\n        if (projectError || !project) {\n            return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n                message: \"案件が見つかりません\"\n            }, {\n                status: 404\n            });\n        }\n        // この案件に関連する契約データを取得\n        const { data: contracts, error: contractsError } = await supabaseAdmin.from(\"contracts\").select(\"*\").eq(\"project_id\", projectId);\n        // この案件に関連する入札データを取得\n        const { data: bids, error: bidsError } = await supabaseAdmin.from(\"bids\").select(\"*\").eq(\"project_id\", projectId);\n        // この案件に関連するプロジェクト参加者を取得\n        const { data: participants, error: participantsError } = await supabaseAdmin.from(\"project_participants\").select(\"*\").eq(\"project_id\", projectId);\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            project,\n            contracts: contracts || [],\n            bids: bids || [],\n            participants: participants || [],\n            errors: {\n                projectError,\n                contractsError,\n                bidsError,\n                participantsError\n            }\n        }, {\n            status: 200\n        });\n    } catch (error) {\n        console.error(\"プロジェクト詳細取得エラー:\", error);\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            message: \"サーバーエラーが発生しました\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS9kZWJ1Zy9wcm9qZWN0LWRldGFpbHMvcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQXVEO0FBQ0g7QUFFcEQsTUFBTUUsZ0JBQWdCRCxtRUFBWUEsQ0FDaENFLDBDQUFvQyxFQUNwQ0EsUUFBUUMsR0FBRyxDQUFDRSx5QkFBeUIsRUFDckM7SUFDRUMsTUFBTTtRQUNKQyxrQkFBa0I7UUFDbEJDLGdCQUFnQjtJQUNsQjtBQUNGO0FBR0ssZUFBZUMsSUFBSUMsT0FBb0I7SUFDNUMsSUFBSTtRQUNGLE1BQU0sRUFBRUMsWUFBWSxFQUFFLEdBQUcsSUFBSUMsSUFBSUYsUUFBUUcsR0FBRztRQUM1QyxNQUFNQyxZQUFZSCxhQUFhSSxHQUFHLENBQUM7UUFFbkMsSUFBSSxDQUFDRCxXQUFXO1lBQ2QsT0FBT2Ysa0ZBQVlBLENBQUNpQixJQUFJLENBQ3RCO2dCQUFFQyxTQUFTO1lBQWdCLEdBQzNCO2dCQUFFQyxRQUFRO1lBQUk7UUFFbEI7UUFFQSxhQUFhO1FBQ2IsTUFBTSxFQUFFQyxNQUFNQyxPQUFPLEVBQUVDLE9BQU9DLFlBQVksRUFBRSxHQUFHLE1BQU1yQixjQUNsRHNCLElBQUksQ0FBQyxZQUNMQyxNQUFNLENBQUMsS0FDUEMsRUFBRSxDQUFDLE1BQU1YLFdBQ1RZLE1BQU07UUFFVCxJQUFJSixnQkFBZ0IsQ0FBQ0YsU0FBUztZQUM1QixPQUFPckIsa0ZBQVlBLENBQUNpQixJQUFJLENBQ3RCO2dCQUFFQyxTQUFTO1lBQWEsR0FDeEI7Z0JBQUVDLFFBQVE7WUFBSTtRQUVsQjtRQUVBLG9CQUFvQjtRQUNwQixNQUFNLEVBQUVDLE1BQU1RLFNBQVMsRUFBRU4sT0FBT08sY0FBYyxFQUFFLEdBQUcsTUFBTTNCLGNBQ3REc0IsSUFBSSxDQUFDLGFBQ0xDLE1BQU0sQ0FBQyxLQUNQQyxFQUFFLENBQUMsY0FBY1g7UUFFcEIsb0JBQW9CO1FBQ3BCLE1BQU0sRUFBRUssTUFBTVUsSUFBSSxFQUFFUixPQUFPUyxTQUFTLEVBQUUsR0FBRyxNQUFNN0IsY0FDNUNzQixJQUFJLENBQUMsUUFDTEMsTUFBTSxDQUFDLEtBQ1BDLEVBQUUsQ0FBQyxjQUFjWDtRQUVwQix3QkFBd0I7UUFDeEIsTUFBTSxFQUFFSyxNQUFNWSxZQUFZLEVBQUVWLE9BQU9XLGlCQUFpQixFQUFFLEdBQUcsTUFBTS9CLGNBQzVEc0IsSUFBSSxDQUFDLHdCQUNMQyxNQUFNLENBQUMsS0FDUEMsRUFBRSxDQUFDLGNBQWNYO1FBRXBCLE9BQU9mLGtGQUFZQSxDQUFDaUIsSUFBSSxDQUFDO1lBQ3ZCSTtZQUNBTyxXQUFXQSxhQUFhLEVBQUU7WUFDMUJFLE1BQU1BLFFBQVEsRUFBRTtZQUNoQkUsY0FBY0EsZ0JBQWdCLEVBQUU7WUFDaENFLFFBQVE7Z0JBQ05YO2dCQUNBTTtnQkFDQUU7Z0JBQ0FFO1lBQ0Y7UUFDRixHQUFHO1lBQUVkLFFBQVE7UUFBSTtJQUVuQixFQUFFLE9BQU9HLE9BQU87UUFDZGEsUUFBUWIsS0FBSyxDQUFDLGtCQUFrQkE7UUFDaEMsT0FBT3RCLGtGQUFZQSxDQUFDaUIsSUFBSSxDQUN0QjtZQUFFQyxTQUFTO1FBQWlCLEdBQzVCO1lBQUVDLFFBQVE7UUFBSTtJQUVsQjtBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vLi9zcmMvYXBwL2FwaS9kZWJ1Zy9wcm9qZWN0LWRldGFpbHMvcm91dGUudHM/YjA1YyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVxdWVzdCwgTmV4dFJlc3BvbnNlIH0gZnJvbSAnbmV4dC9zZXJ2ZXInXG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnXG5cbmNvbnN0IHN1cGFiYXNlQWRtaW4gPSBjcmVhdGVDbGllbnQoXG4gIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCEsXG4gIHByb2Nlc3MuZW52LlNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkhLFxuICB7XG4gICAgYXV0aDoge1xuICAgICAgYXV0b1JlZnJlc2hUb2tlbjogZmFsc2UsXG4gICAgICBwZXJzaXN0U2Vzc2lvbjogZmFsc2VcbiAgICB9XG4gIH1cbilcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChyZXF1ZXN0OiBOZXh0UmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IHsgc2VhcmNoUGFyYW1zIH0gPSBuZXcgVVJMKHJlcXVlc3QudXJsKVxuICAgIGNvbnN0IHByb2plY3RJZCA9IHNlYXJjaFBhcmFtcy5nZXQoJ2lkJylcblxuICAgIGlmICghcHJvamVjdElkKSB7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXG4gICAgICAgIHsgbWVzc2FnZTogJ+ODl+ODreOCuOOCp+OCr+ODiElE44GM5b+F6KaB44Gn44GZJyB9LFxuICAgICAgICB7IHN0YXR1czogNDAwIH1cbiAgICAgIClcbiAgICB9XG5cbiAgICAvLyDmoYjku7bjga7ln7rmnKzmg4XloLHjgpLlj5blvpdcbiAgICBjb25zdCB7IGRhdGE6IHByb2plY3QsIGVycm9yOiBwcm9qZWN0RXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlQWRtaW5cbiAgICAgIC5mcm9tKCdwcm9qZWN0cycpXG4gICAgICAuc2VsZWN0KCcqJylcbiAgICAgIC5lcSgnaWQnLCBwcm9qZWN0SWQpXG4gICAgICAuc2luZ2xlKClcblxuICAgIGlmIChwcm9qZWN0RXJyb3IgfHwgIXByb2plY3QpIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcbiAgICAgICAgeyBtZXNzYWdlOiAn5qGI5Lu244GM6KaL44Gk44GL44KK44G+44Gb44KTJyB9LFxuICAgICAgICB7IHN0YXR1czogNDA0IH1cbiAgICAgIClcbiAgICB9XG5cbiAgICAvLyDjgZPjga7moYjku7bjgavplqLpgKPjgZnjgovlpZHntITjg4fjg7zjgr/jgpLlj5blvpdcbiAgICBjb25zdCB7IGRhdGE6IGNvbnRyYWN0cywgZXJyb3I6IGNvbnRyYWN0c0Vycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluXG4gICAgICAuZnJvbSgnY29udHJhY3RzJylcbiAgICAgIC5zZWxlY3QoJyonKVxuICAgICAgLmVxKCdwcm9qZWN0X2lkJywgcHJvamVjdElkKVxuXG4gICAgLy8g44GT44Gu5qGI5Lu244Gr6Zai6YCj44GZ44KL5YWl5pyt44OH44O844K/44KS5Y+W5b6XXG4gICAgY29uc3QgeyBkYXRhOiBiaWRzLCBlcnJvcjogYmlkc0Vycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluXG4gICAgICAuZnJvbSgnYmlkcycpXG4gICAgICAuc2VsZWN0KCcqJylcbiAgICAgIC5lcSgncHJvamVjdF9pZCcsIHByb2plY3RJZClcblxuICAgIC8vIOOBk+OBruahiOS7tuOBq+mWoumAo+OBmeOCi+ODl+ODreOCuOOCp+OCr+ODiOWPguWKoOiAheOCkuWPluW+l1xuICAgIGNvbnN0IHsgZGF0YTogcGFydGljaXBhbnRzLCBlcnJvcjogcGFydGljaXBhbnRzRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlQWRtaW5cbiAgICAgIC5mcm9tKCdwcm9qZWN0X3BhcnRpY2lwYW50cycpXG4gICAgICAuc2VsZWN0KCcqJylcbiAgICAgIC5lcSgncHJvamVjdF9pZCcsIHByb2plY3RJZClcblxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7XG4gICAgICBwcm9qZWN0LFxuICAgICAgY29udHJhY3RzOiBjb250cmFjdHMgfHwgW10sXG4gICAgICBiaWRzOiBiaWRzIHx8IFtdLFxuICAgICAgcGFydGljaXBhbnRzOiBwYXJ0aWNpcGFudHMgfHwgW10sXG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgcHJvamVjdEVycm9yLFxuICAgICAgICBjb250cmFjdHNFcnJvcixcbiAgICAgICAgYmlkc0Vycm9yLFxuICAgICAgICBwYXJ0aWNpcGFudHNFcnJvclxuICAgICAgfVxuICAgIH0sIHsgc3RhdHVzOiAyMDAgfSlcblxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ+ODl+ODreOCuOOCp+OCr+ODiOips+e0sOWPluW+l+OCqOODqeODvDonLCBlcnJvcilcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXG4gICAgICB7IG1lc3NhZ2U6ICfjgrXjg7zjg5Djg7zjgqjjg6njg7zjgYznmbrnlJ/jgZfjgb7jgZfjgZ8nIH0sXG4gICAgICB7IHN0YXR1czogNTAwIH1cbiAgICApXG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJjcmVhdGVDbGllbnQiLCJzdXBhYmFzZUFkbWluIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCIsIlNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkiLCJhdXRoIiwiYXV0b1JlZnJlc2hUb2tlbiIsInBlcnNpc3RTZXNzaW9uIiwiR0VUIiwicmVxdWVzdCIsInNlYXJjaFBhcmFtcyIsIlVSTCIsInVybCIsInByb2plY3RJZCIsImdldCIsImpzb24iLCJtZXNzYWdlIiwic3RhdHVzIiwiZGF0YSIsInByb2plY3QiLCJlcnJvciIsInByb2plY3RFcnJvciIsImZyb20iLCJzZWxlY3QiLCJlcSIsInNpbmdsZSIsImNvbnRyYWN0cyIsImNvbnRyYWN0c0Vycm9yIiwiYmlkcyIsImJpZHNFcnJvciIsInBhcnRpY2lwYW50cyIsInBhcnRpY2lwYW50c0Vycm9yIiwiZXJyb3JzIiwiY29uc29sZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/debug/project-details/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fdebug%2Fproject-details%2Froute&page=%2Fapi%2Fdebug%2Fproject-details%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fdebug%2Fproject-details%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();