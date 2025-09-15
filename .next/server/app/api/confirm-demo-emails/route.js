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
exports.id = "app/api/confirm-demo-emails/route";
exports.ids = ["app/api/confirm-demo-emails/route"];
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

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fconfirm-demo-emails%2Froute&page=%2Fapi%2Fconfirm-demo-emails%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fconfirm-demo-emails%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fconfirm-demo-emails%2Froute&page=%2Fapi%2Fconfirm-demo-emails%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fconfirm-demo-emails%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   headerHooks: () => (/* binding */ headerHooks),\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage),\n/* harmony export */   staticGenerationBailout: () => (/* binding */ staticGenerationBailout)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_sayuri_caddonworks_src_app_api_confirm_demo_emails_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./src/app/api/confirm-demo-emails/route.ts */ \"(rsc)/./src/app/api/confirm-demo-emails/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/confirm-demo-emails/route\",\n        pathname: \"/api/confirm-demo-emails\",\n        filename: \"route\",\n        bundlePath: \"app/api/confirm-demo-emails/route\"\n    },\n    resolvedPagePath: \"/Users/sayuri/caddonworks/src/app/api/confirm-demo-emails/route.ts\",\n    nextConfigOutput,\n    userland: _Users_sayuri_caddonworks_src_app_api_confirm_demo_emails_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks, headerHooks, staticGenerationBailout } = routeModule;\nconst originalPathname = \"/api/confirm-demo-emails/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZjb25maXJtLWRlbW8tZW1haWxzJTJGcm91dGUmcGFnZT0lMkZhcGklMkZjb25maXJtLWRlbW8tZW1haWxzJTJGcm91dGUmYXBwUGF0aHM9JnBhZ2VQYXRoPXByaXZhdGUtbmV4dC1hcHAtZGlyJTJGYXBpJTJGY29uZmlybS1kZW1vLWVtYWlscyUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRnNheXVyaSUyRmNhZGRvbndvcmtzJTJGc3JjJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRnNheXVyaSUyRmNhZGRvbndvcmtzJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFzRztBQUN2QztBQUNjO0FBQ2tCO0FBQy9GO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixnSEFBbUI7QUFDM0M7QUFDQSxjQUFjLHlFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsdUdBQXVHO0FBQy9HO0FBQ0E7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDNko7O0FBRTdKIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vPzUzNzUiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL3NheXVyaS9jYWRkb253b3Jrcy9zcmMvYXBwL2FwaS9jb25maXJtLWRlbW8tZW1haWxzL3JvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS9jb25maXJtLWRlbW8tZW1haWxzL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvY29uZmlybS1kZW1vLWVtYWlsc1wiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvY29uZmlybS1kZW1vLWVtYWlscy9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy9zYXl1cmkvY2FkZG9ud29ya3Mvc3JjL2FwcC9hcGkvY29uZmlybS1kZW1vLWVtYWlscy9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBoZWFkZXJIb29rcywgc3RhdGljR2VuZXJhdGlvbkJhaWxvdXQgfSA9IHJvdXRlTW9kdWxlO1xuY29uc3Qgb3JpZ2luYWxQYXRobmFtZSA9IFwiL2FwaS9jb25maXJtLWRlbW8tZW1haWxzL3JvdXRlXCI7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHNlcnZlckhvb2tzLFxuICAgICAgICBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIGhlYWRlckhvb2tzLCBzdGF0aWNHZW5lcmF0aW9uQmFpbG91dCwgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fconfirm-demo-emails%2Froute&page=%2Fapi%2Fconfirm-demo-emails%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fconfirm-demo-emails%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./src/app/api/confirm-demo-emails/route.ts":
/*!**************************************************!*\
  !*** ./src/app/api/confirm-demo-emails/route.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/web/exports/next-response */ \"(rsc)/./node_modules/next/dist/server/web/exports/next-response.js\");\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/module/index.js\");\n\n\nconst supabaseAdmin = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__.createClient)(\"https://rxnozwuamddqlcwysxag.supabase.co\", process.env.SUPABASE_SERVICE_ROLE_KEY, {\n    auth: {\n        autoRefreshToken: false,\n        persistSession: false\n    }\n});\nasync function POST(request) {\n    try {\n        const demoEmails = [\n            \"admin@demo.com\",\n            \"contractor@demo.com\",\n            \"reviewer@demo.com\"\n        ];\n        const results = [];\n        for (const email of demoEmails){\n            try {\n                // ユーザーを検索\n                const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();\n                if (listError) {\n                    results.push({\n                        email,\n                        status: \"error\",\n                        message: listError.message\n                    });\n                    continue;\n                }\n                const user = users.users.find((u)=>u.email === email);\n                if (!user) {\n                    results.push({\n                        email,\n                        status: \"not_found\",\n                        message: \"ユーザーが見つかりません\"\n                    });\n                    continue;\n                }\n                // メール確認を有効化\n                const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {\n                    email_confirm: true\n                });\n                if (updateError) {\n                    results.push({\n                        email,\n                        status: \"error\",\n                        message: updateError.message\n                    });\n                    continue;\n                }\n                results.push({\n                    email,\n                    status: \"success\",\n                    message: \"メール確認を有効化しました\"\n                });\n            } catch (error) {\n                results.push({\n                    email,\n                    status: \"error\",\n                    message: \"予期しないエラーが発生しました\"\n                });\n            }\n        }\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            message: \"デモアカウントのメール確認が完了しました\",\n            results\n        }, {\n            status: 200\n        });\n    } catch (error) {\n        console.error(\"Email confirmation error:\", error);\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            message: \"サーバーエラーが発生しました\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS9jb25maXJtLWRlbW8tZW1haWxzL3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUF1RDtBQUNIO0FBRXBELE1BQU1FLGdCQUFnQkQsbUVBQVlBLENBQ2hDRSwwQ0FBb0MsRUFDcENBLFFBQVFDLEdBQUcsQ0FBQ0UseUJBQXlCLEVBQ3JDO0lBQ0VDLE1BQU07UUFDSkMsa0JBQWtCO1FBQ2xCQyxnQkFBZ0I7SUFDbEI7QUFDRjtBQUdLLGVBQWVDLEtBQUtDLE9BQW9CO0lBQzdDLElBQUk7UUFDRixNQUFNQyxhQUFhO1lBQ2pCO1lBQ0E7WUFDQTtTQUNEO1FBRUQsTUFBTUMsVUFBVSxFQUFFO1FBRWxCLEtBQUssTUFBTUMsU0FBU0YsV0FBWTtZQUM5QixJQUFJO2dCQUNGLFVBQVU7Z0JBQ1YsTUFBTSxFQUFFRyxNQUFNQyxLQUFLLEVBQUVDLE9BQU9DLFNBQVMsRUFBRSxHQUFHLE1BQU1oQixjQUFjSyxJQUFJLENBQUNZLEtBQUssQ0FBQ0MsU0FBUztnQkFFbEYsSUFBSUYsV0FBVztvQkFDYkwsUUFBUVEsSUFBSSxDQUFDO3dCQUNYUDt3QkFDQVEsUUFBUTt3QkFDUkMsU0FBU0wsVUFBVUssT0FBTztvQkFDNUI7b0JBQ0E7Z0JBQ0Y7Z0JBRUEsTUFBTUMsT0FBT1IsTUFBTUEsS0FBSyxDQUFDUyxJQUFJLENBQUNDLENBQUFBLElBQUtBLEVBQUVaLEtBQUssS0FBS0E7Z0JBRS9DLElBQUksQ0FBQ1UsTUFBTTtvQkFDVFgsUUFBUVEsSUFBSSxDQUFDO3dCQUNYUDt3QkFDQVEsUUFBUTt3QkFDUkMsU0FBUztvQkFDWDtvQkFDQTtnQkFDRjtnQkFFQSxZQUFZO2dCQUNaLE1BQU0sRUFBRVIsTUFBTVksVUFBVSxFQUFFVixPQUFPVyxXQUFXLEVBQUUsR0FBRyxNQUFNMUIsY0FBY0ssSUFBSSxDQUFDWSxLQUFLLENBQUNVLGNBQWMsQ0FDNUZMLEtBQUtNLEVBQUUsRUFDUDtvQkFDRUMsZUFBZTtnQkFDakI7Z0JBR0YsSUFBSUgsYUFBYTtvQkFDZmYsUUFBUVEsSUFBSSxDQUFDO3dCQUNYUDt3QkFDQVEsUUFBUTt3QkFDUkMsU0FBU0ssWUFBWUwsT0FBTztvQkFDOUI7b0JBQ0E7Z0JBQ0Y7Z0JBRUFWLFFBQVFRLElBQUksQ0FBQztvQkFDWFA7b0JBQ0FRLFFBQVE7b0JBQ1JDLFNBQVM7Z0JBQ1g7WUFFRixFQUFFLE9BQU9OLE9BQU87Z0JBQ2RKLFFBQVFRLElBQUksQ0FBQztvQkFDWFA7b0JBQ0FRLFFBQVE7b0JBQ1JDLFNBQVM7Z0JBQ1g7WUFDRjtRQUNGO1FBRUEsT0FBT3ZCLGtGQUFZQSxDQUFDZ0MsSUFBSSxDQUFDO1lBQ3ZCVCxTQUFTO1lBQ1RWO1FBQ0YsR0FBRztZQUFFUyxRQUFRO1FBQUk7SUFFbkIsRUFBRSxPQUFPTCxPQUFPO1FBQ2RnQixRQUFRaEIsS0FBSyxDQUFDLDZCQUE2QkE7UUFDM0MsT0FBT2pCLGtGQUFZQSxDQUFDZ0MsSUFBSSxDQUN0QjtZQUFFVCxTQUFTO1FBQWlCLEdBQzVCO1lBQUVELFFBQVE7UUFBSTtJQUVsQjtBQUNGIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2l2aWwtZW5naW5lZXJpbmctcGxhdGZvcm0vLi9zcmMvYXBwL2FwaS9jb25maXJtLWRlbW8tZW1haWxzL3JvdXRlLnRzPzAzZWEiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlcXVlc3QsIE5leHRSZXNwb25zZSB9IGZyb20gJ25leHQvc2VydmVyJ1xuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJ1xuXG5jb25zdCBzdXBhYmFzZUFkbWluID0gY3JlYXRlQ2xpZW50KFxuICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwhLFxuICBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZISxcbiAge1xuICAgIGF1dGg6IHtcbiAgICAgIGF1dG9SZWZyZXNoVG9rZW46IGZhbHNlLFxuICAgICAgcGVyc2lzdFNlc3Npb246IGZhbHNlXG4gICAgfVxuICB9XG4pXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKHJlcXVlc3Q6IE5leHRSZXF1ZXN0KSB7XG4gIHRyeSB7XG4gICAgY29uc3QgZGVtb0VtYWlscyA9IFtcbiAgICAgICdhZG1pbkBkZW1vLmNvbScsXG4gICAgICAnY29udHJhY3RvckBkZW1vLmNvbScsXG4gICAgICAncmV2aWV3ZXJAZGVtby5jb20nXG4gICAgXVxuXG4gICAgY29uc3QgcmVzdWx0cyA9IFtdXG5cbiAgICBmb3IgKGNvbnN0IGVtYWlsIG9mIGRlbW9FbWFpbHMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIOODpuODvOOCtuODvOOCkuaknOe0olxuICAgICAgICBjb25zdCB7IGRhdGE6IHVzZXJzLCBlcnJvcjogbGlzdEVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluLmF1dGguYWRtaW4ubGlzdFVzZXJzKClcbiAgICAgICAgXG4gICAgICAgIGlmIChsaXN0RXJyb3IpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgZW1haWwsXG4gICAgICAgICAgICBzdGF0dXM6ICdlcnJvcicsXG4gICAgICAgICAgICBtZXNzYWdlOiBsaXN0RXJyb3IubWVzc2FnZVxuICAgICAgICAgIH0pXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVzZXIgPSB1c2Vycy51c2Vycy5maW5kKHUgPT4gdS5lbWFpbCA9PT0gZW1haWwpXG4gICAgICAgIFxuICAgICAgICBpZiAoIXVzZXIpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgZW1haWwsXG4gICAgICAgICAgICBzdGF0dXM6ICdub3RfZm91bmQnLFxuICAgICAgICAgICAgbWVzc2FnZTogJ+ODpuODvOOCtuODvOOBjOimi+OBpOOBi+OCiuOBvuOBm+OCkydcbiAgICAgICAgICB9KVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyDjg6Hjg7zjg6vnorroqo3jgpLmnInlirnljJZcbiAgICAgICAgY29uc3QgeyBkYXRhOiB1cGRhdGVEYXRhLCBlcnJvcjogdXBkYXRlRXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlQWRtaW4uYXV0aC5hZG1pbi51cGRhdGVVc2VyQnlJZChcbiAgICAgICAgICB1c2VyLmlkLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGVtYWlsX2NvbmZpcm06IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIClcblxuICAgICAgICBpZiAodXBkYXRlRXJyb3IpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgZW1haWwsXG4gICAgICAgICAgICBzdGF0dXM6ICdlcnJvcicsXG4gICAgICAgICAgICBtZXNzYWdlOiB1cGRhdGVFcnJvci5tZXNzYWdlXG4gICAgICAgICAgfSlcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICBlbWFpbCxcbiAgICAgICAgICBzdGF0dXM6ICdzdWNjZXNzJyxcbiAgICAgICAgICBtZXNzYWdlOiAn44Oh44O844Or56K66KqN44KS5pyJ5Yq55YyW44GX44G+44GX44GfJ1xuICAgICAgICB9KVxuXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIGVtYWlsLFxuICAgICAgICAgIHN0YXR1czogJ2Vycm9yJyxcbiAgICAgICAgICBtZXNzYWdlOiAn5LqI5pyf44GX44Gq44GE44Ko44Op44O844GM55m655Sf44GX44G+44GX44GfJ1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7XG4gICAgICBtZXNzYWdlOiAn44OH44Oi44Ki44Kr44Km44Oz44OI44Gu44Oh44O844Or56K66KqN44GM5a6M5LqG44GX44G+44GX44GfJyxcbiAgICAgIHJlc3VsdHNcbiAgICB9LCB7IHN0YXR1czogMjAwIH0pXG5cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFbWFpbCBjb25maXJtYXRpb24gZXJyb3I6JywgZXJyb3IpXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgeyBtZXNzYWdlOiAn44K144O844OQ44O844Ko44Op44O844GM55m655Sf44GX44G+44GX44GfJyB9LFxuICAgICAgeyBzdGF0dXM6IDUwMCB9XG4gICAgKVxuICB9XG59Il0sIm5hbWVzIjpbIk5leHRSZXNwb25zZSIsImNyZWF0ZUNsaWVudCIsInN1cGFiYXNlQWRtaW4iLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIiwiU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSIsImF1dGgiLCJhdXRvUmVmcmVzaFRva2VuIiwicGVyc2lzdFNlc3Npb24iLCJQT1NUIiwicmVxdWVzdCIsImRlbW9FbWFpbHMiLCJyZXN1bHRzIiwiZW1haWwiLCJkYXRhIiwidXNlcnMiLCJlcnJvciIsImxpc3RFcnJvciIsImFkbWluIiwibGlzdFVzZXJzIiwicHVzaCIsInN0YXR1cyIsIm1lc3NhZ2UiLCJ1c2VyIiwiZmluZCIsInUiLCJ1cGRhdGVEYXRhIiwidXBkYXRlRXJyb3IiLCJ1cGRhdGVVc2VyQnlJZCIsImlkIiwiZW1haWxfY29uZmlybSIsImpzb24iLCJjb25zb2xlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/confirm-demo-emails/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fconfirm-demo-emails%2Froute&page=%2Fapi%2Fconfirm-demo-emails%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fconfirm-demo-emails%2Froute.ts&appDir=%2FUsers%2Fsayuri%2Fcaddonworks%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fsayuri%2Fcaddonworks&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();