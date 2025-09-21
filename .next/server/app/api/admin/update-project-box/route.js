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
exports.id = "app/api/admin/update-project-box/route";
exports.ids = ["app/api/admin/update-project-box/route"];
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

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fadmin%2Fupdate-project-box%2Froute&page=%2Fapi%2Fadmin%2Fupdate-project-box%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fadmin%2Fupdate-project-box%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fadmin%2Fupdate-project-box%2Froute&page=%2Fapi%2Fadmin%2Fupdate-project-box%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fadmin%2Fupdate-project-box%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   headerHooks: () => (/* binding */ headerHooks),\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage),\n/* harmony export */   staticGenerationBailout: () => (/* binding */ staticGenerationBailout)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_sayuri_caddonworks_src_app_api_admin_update_project_box_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./src/app/api/admin/update-project-box/route.ts */ \"(rsc)/./src/app/api/admin/update-project-box/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/admin/update-project-box/route\",\n        pathname: \"/api/admin/update-project-box\",\n        filename: \"route\",\n        bundlePath: \"app/api/admin/update-project-box/route\"\n    },\n    resolvedPagePath: \"/Users/sayuri/caddonworks/src/app/api/admin/update-project-box/route.ts\",\n    nextConfigOutput,\n    userland: _Users_sayuri_caddonworks_src_app_api_admin_update_project_box_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks, headerHooks, staticGenerationBailout } = routeModule;\nconst originalPathname = \"/api/admin/update-project-box/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZhZG1pbiUyRnVwZGF0ZS1wcm9qZWN0LWJveCUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGYWRtaW4lMkZ1cGRhdGUtcHJvamVjdC1ib3glMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZhZG1pbiUyRnVwZGF0ZS1wcm9qZWN0LWJveCUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRnNheXVyaSUyRmNhZGRvbndvcmtzJTJGc3JjJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRnNheXVyaSUyRmNhZGRvbndvcmtzJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFzRztBQUN2QztBQUNjO0FBQ3VCO0FBQ3BHO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixnSEFBbUI7QUFDM0M7QUFDQSxjQUFjLHlFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsdUdBQXVHO0FBQy9HO0FBQ0E7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDNko7O0FBRTdKIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vP2YyZjgiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL3NheXVyaS9jYWRkb253b3Jrcy9zcmMvYXBwL2FwaS9hZG1pbi91cGRhdGUtcHJvamVjdC1ib3gvcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2FkbWluL3VwZGF0ZS1wcm9qZWN0LWJveC9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2FkbWluL3VwZGF0ZS1wcm9qZWN0LWJveFwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvYWRtaW4vdXBkYXRlLXByb2plY3QtYm94L3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL3NheXVyaS9jYWRkb253b3Jrcy9zcmMvYXBwL2FwaS9hZG1pbi91cGRhdGUtcHJvamVjdC1ib3gvcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgaGVhZGVySG9va3MsIHN0YXRpY0dlbmVyYXRpb25CYWlsb3V0IH0gPSByb3V0ZU1vZHVsZTtcbmNvbnN0IG9yaWdpbmFsUGF0aG5hbWUgPSBcIi9hcGkvYWRtaW4vdXBkYXRlLXByb2plY3QtYm94L3JvdXRlXCI7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHNlcnZlckhvb2tzLFxuICAgICAgICBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIGhlYWRlckhvb2tzLCBzdGF0aWNHZW5lcmF0aW9uQmFpbG91dCwgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fadmin%2Fupdate-project-box%2Froute&page=%2Fapi%2Fadmin%2Fupdate-project-box%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fadmin%2Fupdate-project-box%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./src/app/api/admin/update-project-box/route.ts":
/*!*******************************************************!*\
  !*** ./src/app/api/admin/update-project-box/route.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST),\n/* harmony export */   runtime: () => (/* binding */ runtime)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/web/exports/next-response */ \"(rsc)/./node_modules/next/dist/server/web/exports/next-response.js\");\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/module/index.js\");\nconst runtime = \"nodejs\";\n\n\nconst supabaseAdmin = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__.createClient)(\"https://rxnozwuamddqlcwysxag.supabase.co\", process.env.SUPABASE_SERVICE_ROLE_KEY, {\n    auth: {\n        autoRefreshToken: false,\n        persistSession: false\n    }\n});\nasync function POST(request) {\n    try {\n        const { projectId, boxFolderId } = await request.json();\n        console.log(`🔄 Updating project ${projectId} with BOX folder ID: ${boxFolderId}`);\n        const { data, error } = await supabaseAdmin.from(\"projects\").update({\n            box_folder_id: boxFolderId\n        }).eq(\"id\", projectId).select(\"id, title, box_folder_id\");\n        if (error) {\n            return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n                message: \"プロジェクト更新に失敗しました\",\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        console.log(\"✅ Project updated successfully:\", data);\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            message: \"BOXフォルダIDが正常に設定されました\",\n            project: data[0]\n        }, {\n            status: 200\n        });\n    } catch (error) {\n        console.error(\"❌ Update error:\", error);\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            message: \"サーバーエラー\",\n            error: error.message\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS9hZG1pbi91cGRhdGUtcHJvamVjdC1ib3gvcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFPLE1BQU1BLFVBQVUsU0FBUTtBQUV3QjtBQUNIO0FBRXBELE1BQU1HLGdCQUFnQkQsbUVBQVlBLENBQ2hDRSwwQ0FBb0MsRUFDcENBLFFBQVFDLEdBQUcsQ0FBQ0UseUJBQXlCLEVBQ3JDO0lBQUVDLE1BQU07UUFBRUMsa0JBQWtCO1FBQU9DLGdCQUFnQjtJQUFNO0FBQUU7QUFHdEQsZUFBZUMsS0FBS0MsT0FBb0I7SUFDN0MsSUFBSTtRQUNGLE1BQU0sRUFBRUMsU0FBUyxFQUFFQyxXQUFXLEVBQUUsR0FBRyxNQUFNRixRQUFRRyxJQUFJO1FBRXJEQyxRQUFRQyxHQUFHLENBQUMsQ0FBQyxvQkFBb0IsRUFBRUosVUFBVSxxQkFBcUIsRUFBRUMsWUFBWSxDQUFDO1FBRWpGLE1BQU0sRUFBRUksSUFBSSxFQUFFQyxLQUFLLEVBQUUsR0FBRyxNQUFNaEIsY0FDM0JpQixJQUFJLENBQUMsWUFDTEMsTUFBTSxDQUFDO1lBQ05DLGVBQWVSO1FBQ2pCLEdBQ0NTLEVBQUUsQ0FBQyxNQUFNVixXQUNUVyxNQUFNLENBQUM7UUFFVixJQUFJTCxPQUFPO1lBQ1QsT0FBT2xCLGtGQUFZQSxDQUFDYyxJQUFJLENBQUM7Z0JBQ3ZCVSxTQUFTO2dCQUNUTixPQUFPQSxNQUFNTSxPQUFPO1lBQ3RCLEdBQUc7Z0JBQUVDLFFBQVE7WUFBSTtRQUNuQjtRQUVBVixRQUFRQyxHQUFHLENBQUMsbUNBQW1DQztRQUUvQyxPQUFPakIsa0ZBQVlBLENBQUNjLElBQUksQ0FBQztZQUN2QlUsU0FBUztZQUNURSxTQUFTVCxJQUFJLENBQUMsRUFBRTtRQUNsQixHQUFHO1lBQUVRLFFBQVE7UUFBSTtJQUVuQixFQUFFLE9BQU9QLE9BQVk7UUFDbkJILFFBQVFHLEtBQUssQ0FBQyxtQkFBbUJBO1FBQ2pDLE9BQU9sQixrRkFBWUEsQ0FBQ2MsSUFBSSxDQUFDO1lBQ3ZCVSxTQUFTO1lBQ1ROLE9BQU9BLE1BQU1NLE9BQU87UUFDdEIsR0FBRztZQUFFQyxRQUFRO1FBQUk7SUFDbkI7QUFDRiIsInNvdXJjZXMiOlsid2VicGFjazovL2NpdmlsLWVuZ2luZWVyaW5nLXBsYXRmb3JtLy4vc3JjL2FwcC9hcGkvYWRtaW4vdXBkYXRlLXByb2plY3QtYm94L3JvdXRlLnRzP2Q2ZjYiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IHJ1bnRpbWUgPSAnbm9kZWpzJ1xuXG5pbXBvcnQgeyBOZXh0UmVxdWVzdCwgTmV4dFJlc3BvbnNlIH0gZnJvbSAnbmV4dC9zZXJ2ZXInXG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnXG5cbmNvbnN0IHN1cGFiYXNlQWRtaW4gPSBjcmVhdGVDbGllbnQoXG4gIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCEsXG4gIHByb2Nlc3MuZW52LlNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkhLFxuICB7IGF1dGg6IHsgYXV0b1JlZnJlc2hUb2tlbjogZmFsc2UsIHBlcnNpc3RTZXNzaW9uOiBmYWxzZSB9IH1cbilcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QocmVxdWVzdDogTmV4dFJlcXVlc3QpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IHByb2plY3RJZCwgYm94Rm9sZGVySWQgfSA9IGF3YWl0IHJlcXVlc3QuanNvbigpXG5cbiAgICBjb25zb2xlLmxvZyhg8J+UhCBVcGRhdGluZyBwcm9qZWN0ICR7cHJvamVjdElkfSB3aXRoIEJPWCBmb2xkZXIgSUQ6ICR7Ym94Rm9sZGVySWR9YClcblxuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlQWRtaW5cbiAgICAgIC5mcm9tKCdwcm9qZWN0cycpXG4gICAgICAudXBkYXRlKHtcbiAgICAgICAgYm94X2ZvbGRlcl9pZDogYm94Rm9sZGVySWRcbiAgICAgIH0pXG4gICAgICAuZXEoJ2lkJywgcHJvamVjdElkKVxuICAgICAgLnNlbGVjdCgnaWQsIHRpdGxlLCBib3hfZm9sZGVyX2lkJylcblxuICAgIGlmIChlcnJvcikge1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHtcbiAgICAgICAgbWVzc2FnZTogJ+ODl+ODreOCuOOCp+OCr+ODiOabtOaWsOOBq+WkseaVl+OBl+OBvuOBl+OBnycsXG4gICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXG4gICAgICB9LCB7IHN0YXR1czogNTAwIH0pXG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ+KchSBQcm9qZWN0IHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5OicsIGRhdGEpXG5cbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oe1xuICAgICAgbWVzc2FnZTogJ0JPWOODleOCqeODq+ODgElE44GM5q2j5bi444Gr6Kit5a6a44GV44KM44G+44GX44GfJyxcbiAgICAgIHByb2plY3Q6IGRhdGFbMF1cbiAgICB9LCB7IHN0YXR1czogMjAwIH0pXG5cbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBVcGRhdGUgZXJyb3I6JywgZXJyb3IpXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHtcbiAgICAgIG1lc3NhZ2U6ICfjgrXjg7zjg5Djg7zjgqjjg6njg7wnLFxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2VcbiAgICB9LCB7IHN0YXR1czogNTAwIH0pXG4gIH1cbn0iXSwibmFtZXMiOlsicnVudGltZSIsIk5leHRSZXNwb25zZSIsImNyZWF0ZUNsaWVudCIsInN1cGFiYXNlQWRtaW4iLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIiwiU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSIsImF1dGgiLCJhdXRvUmVmcmVzaFRva2VuIiwicGVyc2lzdFNlc3Npb24iLCJQT1NUIiwicmVxdWVzdCIsInByb2plY3RJZCIsImJveEZvbGRlcklkIiwianNvbiIsImNvbnNvbGUiLCJsb2ciLCJkYXRhIiwiZXJyb3IiLCJmcm9tIiwidXBkYXRlIiwiYm94X2ZvbGRlcl9pZCIsImVxIiwic2VsZWN0IiwibWVzc2FnZSIsInN0YXR1cyIsInByb2plY3QiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/admin/update-project-box/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fadmin%2Fupdate-project-box%2Froute&page=%2Fapi%2Fadmin%2Fupdate-project-box%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fadmin%2Fupdate-project-box%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();